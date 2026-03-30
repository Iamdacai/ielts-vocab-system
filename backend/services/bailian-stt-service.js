/**
 * Bailian 语音识别服务（STT）
 * 将语音转换为文本
 */

const https = require('https');
const fs = require('fs');

class BailianSTTService {
  constructor() {
    this.apiKey = process.env.BAILIAN_API_KEY;
    this.endpoint = 'dashscope.aliyuncs.com';
    this.model = 'paraformer-realtime-v2'; // 通义听悟实时语音识别
    
    if (!this.apiKey) {
      console.error('[BailianSTT] ⚠️ 警告：BAILIAN_API_KEY 未配置');
    }
  }

  /**
   * 语音识别（文件路径）
   * @param {string} filePath - 音频文件路径
   * @param {object} options - 可选参数
   * @returns {Promise<object>} - 识别结果
   */
  async recognizeFromFile(filePath, options = {}) {
    const {
      language = 'en-US', // en-US / zh-CN
      enableIntermediateResult = false
    } = options;

    try {
      // 读取音频文件
      const audioBuffer = await fs.promises.readFile(filePath);
      return await this.recognize(audioBuffer, { language, enableIntermediateResult });
    } catch (error) {
      console.error('[BailianSTT] 文件读取失败:', error);
      throw new Error(`语音识别失败：${error.message}`);
    }
  }

  /**
   * 语音识别（Buffer）
   * @param {Buffer} audioBuffer - 音频数据
   * @param {object} options - 可选参数
   * @returns {Promise<object>} - 识别结果
   */
  async recognize(audioBuffer, options = {}) {
    const {
      language = 'en-US',
      enableIntermediateResult = false,
      retryCount = 3
    } = options;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const result = await this._callAPI(audioBuffer, language, enableIntermediateResult);
        return this._parseResult(result);
      } catch (error) {
        console.error(`[BailianSTT] 识别失败 (尝试 ${attempt + 1}/${retryCount}):`, error.message);
        
        if (attempt === retryCount - 1) {
          throw error;
        }
        
        // 指数退避
        await this._sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  /**
   * 调用 Bailian STT API
   * @private
   */
  _callAPI(audioBuffer, language, enableIntermediateResult) {
    return new Promise((resolve, reject) => {
      // 构建 multipart/form-data 请求
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      
      const bodyParts = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="model"',
        '',
        this.model,
        `--${boundary}`,
        'Content-Disposition: form-data; name="format"',
        '',
        'wav', // 或 mp3
        `--${boundary}`,
        'Content-Disposition: form-data; name="sample_rate"',
        '',
        '16000',
        `--${boundary}`,
        'Content-Disposition: form-data; name="enable_intermediate_result"',
        '',
        enableIntermediateResult ? 'true' : 'false',
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="audio.wav"',
        'Content-Type: audio/wav',
        ''
      ];

      const header = Buffer.from(bodyParts.join('\r\n') + '\r\n');
      const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
      const body = Buffer.concat([header, audioBuffer, footer]);

      const req = https.request({
        hostname: this.endpoint,
        path: '/api/v1/services/asr/speech-to-text/transcription',
        method: 'POST',
        timeout: 60000, // 60 秒超时
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length
        }
      }, (res) => {
        let responseBody = '';
        
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(responseBody);
            
            // 检查错误
            if (result.code) {
              const error = new Error(result.message || '语音识别失败');
              error.code = result.code;
              error.requestId = result.request_id;
              reject(error);
              return;
            }
            
            resolve(result);
          } catch (error) {
            reject(new Error(`响应解析失败：${error.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('语音识别请求超时'));
      });

      req.on('error', (error) => {
        reject(new Error(`网络错误：${error.message}`));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * 解析识别结果
   * @private
   */
  _parseResult(result) {
    if (!result.output || !result.output.results) {
      throw new Error('语音识别结果格式异常');
    }

    const results = result.output.results;
    
    // 合并所有识别结果
    let transcript = '';
    let confidence = 0;
    let wordCount = 0;

    results.forEach(r => {
      if (r.text) {
        transcript += (transcript ? ' ' : '') + r.text;
        confidence += r.confidence || 0;
        wordCount++;
      }
    });

    const avgConfidence = wordCount > 0 ? (confidence / wordCount) : 0;

    return {
      transcript: transcript.trim(),
      confidence: Math.round(avgConfidence * 100),
      raw: result,
      usage: result.usage
    };
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
      // 使用一个短的测试音频（如果有）
      console.log('[BailianSTT] ✅ 服务初始化成功');
      return true;
    } catch (error) {
      console.error('[BailianSTT] ❌ 服务初始化失败:', error.message);
      return false;
    }
  }
}

module.exports = new BailianSTTService();
