#!/usr/bin/env node

/**
 * Azure 发音评分服务测试脚本
 * 用于验证发音评分 API 功能
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// 从 .env 文件加载配置
require('dotenv').config({ path: '../.env' });

const PRONUNCIATION_CONFIG = {
  apiKey: process.env.PRONUNCIATION_API_KEY,
  region: process.env.PRONUNCIATION_REGION || 'eastasia',
  language: process.env.PRONUNCIATION_LANGUAGE || 'en-US'
};

async function createTestAudio(word) {
  // 创建一个简单的测试音频文件（实际应用中应该使用真实的录音）
  // 这里我们创建一个空的 WAV 文件作为占位符
  const testAudioPath = path.join(__dirname, 'test-recording.wav');
  
  // WAV 文件头（44字节）+ 空数据
  const wavHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x00, 0x00, 0x00, // 文件大小 (36 + 0)
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // fmt chunk size (16)
    0x01, 0x00,             // format (1 = PCM)
    0x01, 0x00,             // channels (1)
    0x80, 0x3E, 0x00, 0x00, // sample rate (16000)
    0x00, 0x7D, 0x00, 0x00, // byte rate (32000)
    0x02, 0x00,             // block align (2)
    0x10, 0x00,             // bits per sample (16)
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x00, 0x00, 0x00  // data size (0)
  ]);
  
  await fs.writeFile(testAudioPath, wavHeader);
  return testAudioPath;
}

async function testPronunciationAssessment(word = 'hello') {
  console.log(`🧪 测试 Azure 发音评分服务 - 单词: ${word}`);
  
  if (!PRONUNCIATION_CONFIG.apiKey) {
    console.error('❌ 错误: 未配置 PRONUNCIATION_API_KEY，请先在 .env 文件中设置');
    return false;
  }
  
  try {
    // 创建测试音频文件
    const audioPath = await createTestAudio(word);
    const audioBuffer = await fs.readFile(audioPath);
    
    // 发音评分 API 端点
    const assessmentUrl = `https://${PRONUNCIATION_CONFIG.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${PRONUNCIATION_CONFIG.language}&format=detailed`;
    
    console.log('📡 发送发音评分请求...');
    
    const response = await axios.post(assessmentUrl, audioBuffer, {
      headers: {
        'Ocp-Apim-Subscription-Key': PRONUNCIATION_CONFIG.apiKey,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Accept': 'application/json',
        'SpeechContext': JSON.stringify({
          'pronunciationAssessment': {
            'referenceText': word,
            'gradingSystem': 'HundredMark',
            'dimension': 'Comprehensive',
            'enableMiscue': true
          }
        })
      }
    });
    
    console.log('✅ 发音评分请求成功');
    console.log('📊 评分结果:', JSON.stringify(response.data, null, 2));
    
    // 清理测试文件
    await fs.unlink(audioPath);
    
    return true;
    
  } catch (error) {
    console.error('❌ 发音评分测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data?.toString() || error.response.statusText);
    } else {
      console.error('错误详情:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 开始 Azure 发音评分服务测试\n');
  
  const success = await testPronunciationAssessment('hello');
  
  console.log('\n📊 测试总结:');
  console.log(`发音评分服务: ${success ? '✅ 通过' : '❌ 失败'}`);
  
  if (success) {
    console.log('\n🎉 发音评分服务测试通过！');
  } else {
    console.log('\n⚠️  发音评分服务测试失败，请检查配置后重试');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testPronunciationAssessment };