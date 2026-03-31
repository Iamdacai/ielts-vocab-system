/**
 * MiniMax API 客户端封装（支持标准格式和 Anthropic 兼容格式）
 * 
 * 配置：
 * - API Key: process.env.MINIMAX_API_KEY
 * - Base URL: process.env.MINIMAX_BASE_URL
 * - 模型：M2-her（默认，免费）或 MiniMax-M2.7（付费）
 */

const https = require('https');
const { URL } = require('url');

class MiniMaxClient {
  constructor(options = {}) {
    this.apiKey = process.env.MINIMAX_API_KEY;
    this.baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1';
    this.model = options.model || process.env.MINIMAX_MODEL || 'M2-her';
    this.timeout = options.timeout || 60000; // 60 秒超时
    
    // 解析 Base URL
    try {
      const urlObj = new URL(this.baseUrl);
      this.endpoint = urlObj.hostname;
      this.basePath = urlObj.pathname.replace(/\/$/, ''); // 去掉末尾斜杠
    } catch (e) {
      console.error('[MiniMax] Base URL 格式错误:', e.message);
      this.endpoint = 'api.minimaxi.com';
      this.basePath = '/v1';
    }
    
    // 判断是否使用 Anthropic 兼容格式
    this.isAnthropicCompat = this.baseUrl.includes('/anthropic/');
    
    if (!this.apiKey) {
      console.error('[MiniMax] ⚠️ 警告：MINIMAX_API_KEY 未配置');
    }
    
    console.log(`[MiniMax] 初始化：模型=${this.model}, 端点=${this.endpoint}${this.basePath}, 格式=${this.isAnthropicCompat ? 'Anthropic' : '标准'}`);
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
      maxTokens = 2000,
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
        
        // Anthropic 格式直接返回 content
        const content = response.content;
        
        // JSON 模式尝试解析
        if (jsonMode) {
          try {
            // 清理可能的 markdown 标记和思考过程
            let jsonStr = content
              .replace(/<think>[\s\S]*?<\/?f(?:or)?thoughts?>/g, '')  // 清理 <think>...</think>
              .replace(/```json\s*/g, '')
              .replace(/```\s*/g, '')
              .trim();
            
            // 提取 JSON 部分（如果有多个 JSON 对象，取第一个完整的）
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonStr = jsonMatch[0];
            }
            
            console.log('[MiniMax] 清理后的 JSON:', jsonStr.substring(0, 200) + '...');
            return JSON.parse(jsonStr);
          } catch (parseError) {
            console.error('[MiniMax] JSON 解析失败:', parseError);
            console.error('[MiniMax] 原始响应:', content.substring(0, 500));
            throw new Error('AI 返回的 JSON 格式无效');
          }
        }
        
        return { content };
      } catch (error) {
        console.error(`[MiniMax] 调用失败 (尝试 ${attempt + 1}/${retryCount}):`, error.message);
        
        if (attempt === retryCount - 1) {
          throw error;
        }
        
        // 指数退避
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[MiniMax] 等待 ${delay}ms 后重试...`);
        await this._sleep(delay);
      }
    }
  }

  /**
   * 调用 MiniMax API（支持标准格式和 Anthropic 兼容格式）
   * @private
   */
  _callAPI(messages, temperature, maxTokens) {
    return new Promise((resolve, reject) => {
      let requestBody;
      let path;
      
      if (this.isAnthropicCompat) {
        // Anthropic 兼容格式
        requestBody = JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        });
        path = this.basePath;
        console.log(`[MiniMax] 使用 Anthropic 兼容格式：${this.model}`);
      } else {
        // 标准格式（M2-her 等）
        requestBody = JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        });
        path = `${this.basePath}/chat/completions`;
        console.log(`[MiniMax] 使用标准格式：${this.model}`);
      }

      console.log(`[MiniMax] 请求：${this.model}, max_tokens=${maxTokens}`);

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
            
            // 检查错误
            if (result.error) {
              const error = new Error(result.error.message || 'API 调用失败');
              error.code = result.error.code;
              console.error('[MiniMax] API 错误:', result.error);
              reject(error);
              return;
            }
            
            // 检查 base_resp（MiniMax 特有）
            if (result.base_resp && result.base_resp.status_code !== 0) {
              const error = new Error(result.base_resp.status_msg || 'API 调用失败');
              error.code = result.base_resp.status_code;
              console.error('[MiniMax] API 错误:', result.base_resp);
              reject(error);
              return;
            }
            
            // 提取响应内容（兼容两种格式）
            let content = '';
            if (this.isAnthropicCompat && result.content && Array.isArray(result.content)) {
              // Anthropic 格式
              content = result.content
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('');
            } else if (result.choices && result.choices.length > 0) {
              // 标准格式（OpenAI 兼容）
              content = result.choices[0].message?.content || '';
            }
            
            if (!content) {
              reject(new Error('响应内容为空'));
              return;
            }
            
            console.log(`[MiniMax] ✅ 成功`);
            
            resolve({
              content,
              usage: result.usage,
              id: result.id || result.request_id
            });
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
      console.log('[MiniMax] ✅ 连接测试成功:', result.content.substring(0, 50) + '...');
      return true;
    } catch (error) {
      console.error('[MiniMax] ❌ 连接测试失败:', error.message);
      return false;
    }
  }
}

module.exports = MiniMaxClient;
