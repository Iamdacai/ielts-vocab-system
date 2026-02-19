#!/usr/bin/env node

/**
 * Azure TTS 服务测试脚本
 * 用于验证 API 密钥和发音生成功能
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// 从 .env 文件加载配置
require('dotenv').config({ path: '../.env' });

const TTS_CONFIG = {
  apiKey: process.env.TTS_API_KEY,
  region: process.env.TTS_REGION || 'eastasia',
  voice: process.env.TTS_VOICE || 'en-US-JennyNeural'
};

async function testTTS(word = 'hello') {
  console.log(`🧪 测试 Azure TTS 服务 - 单词: ${word}`);
  
  if (!TTS_CONFIG.apiKey) {
    console.error('❌ 错误: 未配置 TTS_API_KEY，请先在 .env 文件中设置');
    return false;
  }
  
  try {
    // 构建 SSML
    const ssml = `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Female' name='${TTS_CONFIG.voice}'>${word}</voice></speak>`;
    
    // TTS API 端点
    const ttsUrl = `https://${TTS_CONFIG.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    
    console.log('📡 发送 TTS 请求...');
    
    const response = await axios.post(ttsUrl, ssml, {
      headers: {
        'Ocp-Apim-Subscription-Key': TTS_CONFIG.apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'ielts-vocab-system'
      },
      responseType: 'arraybuffer'
    });
    
    console.log('✅ TTS 请求成功');
    
    // 保存音频文件
    const audioDir = path.join(__dirname, '../backend/audio');
    await fs.mkdir(audioDir, { recursive: true });
    const audioPath = path.join(audioDir, `${word.toLowerCase()}.mp3`);
    await fs.writeFile(audioPath, response.data);
    
    console.log(`💾 音频已保存到: ${audioPath}`);
    console.log('✅ TTS 服务测试完成！');
    
    return true;
    
  } catch (error) {
    console.error('❌ TTS 测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data?.toString() || error.response.statusText);
    } else {
      console.error('错误详情:', error.message);
    }
    return false;
  }
}

async function testPronunciationAssessment() {
  console.log('\n🧪 测试 Azure 发音评分服务');
  
  if (!process.env.PRONUNCIATION_API_KEY) {
    console.error('❌ 错误: 未配置 PRONUNCIATION_API_KEY，请先在 .env 文件中设置');
    return false;
  }
  
  console.log('✅ 发音评分服务配置检查通过');
  console.log('💡 注意: 发音评分需要上传真实的录音文件才能完整测试');
  console.log('📝 建议: 先完成 TTS 测试，然后使用小程序录制音频进行评分测试');
  
  return true;
}

async function main() {
  console.log('🚀 开始 Azure 语音服务测试\n');
  
  // 测试 TTS 服务
  const ttsSuccess = await testTTS('hello');
  
  // 测试发音评分配置
  const pronunciationSuccess = await testPronunciationAssessment();
  
  console.log('\n📊 测试总结:');
  console.log(`TTS 服务: ${ttsSuccess ? '✅ 通过' : '❌ 失败'}`);
  console.log(`发音评分配置: ${pronunciationSuccess ? '✅ 通过' : '❌ 失败'}`);
  
  if (ttsSuccess && pronunciationSuccess) {
    console.log('\n🎉 所有测试通过！可以开始集成到小程序了！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置后重试');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testTTS, testPronunciationAssessment };