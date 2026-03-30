/**
 * Bailian API 客户端封装
 * 用于调用通义千问（Qwen）大模型
 * 
 * 配置：
 * - API Key: process.env.BAILIAN_API_KEY
 * - Base URL: process.env.BAILIAN_BASE_URL（可选，Coding Plan 专用）
 * - 模型：qwen-max（默认）或 qwen-plus
 */

const https = require('https');
const crypto = require('crypto');

class BailianClient {
  constructor(options = {}) {
    this.apiKey = process.env.BAILIAN_API_KEY;
    // 支持自定义 Base URL（Coding Plan 专用）
    this.baseUrl = process.env.BAILIAN_BASE_URL || '';
    this.model = options.model || 'qwen-max'; // qwen-max | qwen-plus | qwen-turbo
    this.timeout = options.timeout || 30000; // 30 秒超时
    
    if (!this.apiKey) {
      console.error('[Bailian] ⚠️ 警告：BAILIAN_API_KEY 未配置');
    }
    
    // 解析 Base URL
    if (this.baseUrl) {
      try {
        const urlObj = new URL(this.baseUrl);
        this.endpoint = urlObj.hostname;
        this.basePath = urlObj.pathname.replace(/\/$/, ''); // 去掉末尾斜杠
        console.log(`[Bailian] 使用自定义 Base URL: ${this.baseUrl}`);
      } catch (e) {
        console.error('[Bailian] Base URL 格式错误:', e.message);
        this.endpoint = 'dashscope.aliyuncs.com';
        this.basePath = '/api/v1';
      }
    } else {
      this.endpoint = 'dashscope.aliyuncs.com';
      this.basePath = '/api/v1';
    }
  }

  /**
   * 文本生成
   * @param {string} prompt - 用户输入
   * @param {object} options - 可选参数
   * @returns {Promise<object>} - 生成的内容
   */
  async generate(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      retryCount = 3,
      jsonMode = false
    } = options;

    // 构建消息
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的 AI 助手，请严格按照用户要求回答问题。'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // JSON 模式增加系统提示
    if (jsonMode) {
      messages[0].content += ' 请严格返回 JSON 格式，不要包含其他解释。';
    }

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const response = await this._callAPI(messages, temperature, maxTokens);
        
        // 解析响应
        const content = response.output.choices[0].message.content;
        
        // JSON 模式尝试解析
        if (jsonMode) {
          try {
            // 清理可能的 markdown 标记
            const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            return JSON.parse(jsonStr);
          } catch (parseError) {
            console.error('[Bailian] JSON 解析失败:', parseError);
            console.error('[Bailian] 原始响应:', content);
            throw new Error('AI 返回的 JSON 格式无效');
          }
        }
        
        return { content };
      } catch (error) {
        console.error(`[Bailian] 调用失败 (尝试 ${attempt + 1}/${retryCount}):`, error.message);
        
        if (attempt === retryCount - 1) {
          throw error;
        }
        
        // 指数退避
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Bailian] 等待 ${delay}ms 后重试...`);
        await this._sleep(delay);
      }
    }
  }

  /**
   * 调用 Bailian API
   * @private
   */
  _callAPI(messages, temperature, maxTokens) {
    return new Promise((resolve, reject) => {
      // 检查是否是 OpenAI 兼容格式（Coding Plan 使用 /v1）
      const isOpenAICompat = this.baseUrl && (this.baseUrl.includes('compatible-mode') || this.baseUrl.endsWith('/v1'));
      
      let requestBody;
      let path;
      
      if (isOpenAICompat) {
        // OpenAI 兼容格式（Coding Plan）
        requestBody = JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: maxTokens
        });
        path = `${this.basePath}/chat/completions`;
        console.log(`[Bailian] 使用 OpenAI 兼容格式，模型：${this.model}`);
      } else {
        //  DashScope 原生格式
        requestBody = JSON.stringify({
          model: this.model,
          input: { messages },
          parameters: {
            temperature,
            max_tokens: maxTokens,
            result_format: 'message'
          }
        });
        path = `${this.basePath}/services/aigc/text-generation/generation`;
      }

      const req = https.request({
        hostname: this.endpoint,
        path,
        method: 'POST',
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      }, (res) => {
        let body = '';
        
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            
            // 检查错误（OpenAI 格式）
            if (result.error) {
              const error = new Error(result.error.message || 'API 调用失败');
              error.code = result.error.code;
              error.requestId = result.request_id;
              console.error(`[Bailian] API 错误：`, result.error);
              reject(error);
              return;
            }
            
            // 检查错误（DashScope 原生格式）
            if (result.code) {
              const error = new Error(result.message || 'API 调用失败');
              error.code = result.code;
              error.requestId = result.request_id;
              console.error(`[Bailian] API 错误：`, result);
              reject(error);
              return;
            }
            
            // 返回结果（兼容两种格式）
            if (isOpenAICompat) {
              // OpenAI 格式
              resolve({
                output: {
                  choices: result.choices
                },
                usage: result.usage,
                requestId: result.id
              });
            } else {
              // DashScope 原生格式
              resolve({
                output: result.output,
                usage: result.usage,
                requestId: result.request_id
              });
            }
          } catch (error) {
            reject(new Error(`响应解析失败：${error.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API 请求超时'));
      });

      req.on('error', (error) => {
        reject(new Error(`网络错误：${error.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  /**
   * 计算 Prompt 哈希（用于缓存去重）
   * @param {string} prompt 
   * @returns {string}
   */
  static hashPrompt(prompt) {
    return crypto.createHash('md5').update(prompt).digest('hex');
  }

  /**
   * 延时工具
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const result = await this.generate('你好，请用一句话介绍你自己。', { maxTokens: 100 });
      console.log('[Bailian] ✅ 连接测试成功:', result.content.substring(0, 50) + '...');
      return true;
    } catch (error) {
      console.error('[Bailian] ❌ 连接测试失败:', error.message);
      return false;
    }
  }
}

module.exports = BailianClient;
