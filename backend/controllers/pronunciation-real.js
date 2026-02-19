const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const axios = require('axios');

/**
 * 发音评分控制器 - 真实实现版本
 * 处理单词发音播放、用户录音上传和发音评分
 */

// 配置TTS服务（使用Azure Cognitive Services或其他TTS API）
const TTS_CONFIG = {
  apiKey: process.env.TTS_API_KEY || 'your-tts-api-key',
  region: process.env.TTS_REGION || 'eastasia',
  voice: 'en-US-JennyNeural' // 英式发音可选 'en-GB-SoniaNeural'
};

// 配置发音评分服务（使用Azure Pronunciation Assessment或其他API）
const PRONUNCIATION_API_CONFIG = {
  apiKey: process.env.PRONUNCIATION_API_KEY || 'your-pronunciation-api-key',
  region: process.env.PRONUNCIATION_REGION || 'eastasia',
  language: 'en-US'
};

/**
 * 使用TTS服务生成单词发音
 */
async function generateWordAudio(word) {
  try {
    // Azure TTS API endpoint
    const ttsUrl = `https://${TTS_CONFIG.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    
    const ssml = `<speak version='1.0' xml:lang='${TTS_CONFIG.language}'><voice xml:lang='${TTS_CONFIG.language}' xml:gender='Female' name='${TTS_CONFIG.voice}'>${word}</voice></speak>`;
    
    const response = await axios.post(ttsUrl, ssml, {
      headers: {
        'Ocp-Apim-Subscription-Key': TTS_CONFIG.apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'YOUR_RESOURCE_NAME'
      },
      responseType: 'arraybuffer'
    });
    
    return response.data;
  } catch (error) {
    console.error('TTS generation error:', error.response?.data || error.message);
    throw new Error('Failed to generate pronunciation audio');
  }
}

/**
 * 使用发音评分API分析用户录音
 */
async function analyzePronunciationWithAPI(userAudioPath, targetWord) {
  try {
    // 读取音频文件
    const audioBuffer = await fs.readFile(userAudioPath);
    
    // Azure Pronunciation Assessment API
    const assessmentUrl = `https://${PRONUNCIATION_API_CONFIG.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${PRONUNCIATION_API_CONFIG.language}&format=detailed`;
    
    // 添加发音评估参数
    const headers = {
      'Ocp-Apim-Subscription-Key': PRONUNCIATION_API_CONFIG.apiKey,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      'Accept': 'application/json',
      'SpeechContext': JSON.stringify({
        'pronunciationAssessment': {
          'referenceText': targetWord,
          'gradingSystem': 'HundredMark',
          'dimension': 'Comprehensive',
          'enableMiscue': true
        }
      })
    };
    
    const response = await axios.post(assessmentUrl, audioBuffer, { headers });
    const result = response.data;
    
    // 提取评分和反馈
    const score = result.NBest?.[0]?.PronunciationAssessment?.PronScore || 0;
    const accuracy = result.NBest?.[0]?.PronunciationAssessment?.AccuracyScore || 0;
    const fluency = result.NBest?.[0]?.PronunciationAssessment?.FluencyScore || 0;
    const completeness = result.NBest?.[0]?.PronunciationAssessment?.CompletenessScore || 0;
    
    let feedback = '';
    if (score >= 90) {
      feedback = '发音非常标准！继续保持！';
    } else if (score >= 80) {
      feedback = '发音很好，注意个别音节的重音位置。';
    } else if (score >= 70) {
      feedback = '发音基本正确，但某些音素需要改进。';
    } else {
      feedback = '发音需要更多练习，建议多听标准发音并跟读。';
    }
    
    return {
      score: Math.round(score),
      accuracy: Math.round(accuracy),
      fluency: Math.round(fluency),
      completeness: Math.round(completeness),
      feedback: feedback,
      word: targetWord,
      timestamp: new Date().toISOString(),
      detailedResult: result
    };
  } catch (error) {
    console.error('Pronunciation analysis error:', error.response?.data || error.message);
    throw new Error('Failed to analyze pronunciation');
  }
}

/**
 * 获取单词标准发音音频
 */
exports.getWordAudio = async (req, res) => {
  try {
    const { word } = req.params;
    const cleanWord = decodeURIComponent(word).split(' ')[0].toLowerCase();
    
    // 音频文件路径
    const audioDir = path.join(__dirname, '../audio');
    const audioPath = path.join(audioDir, `${cleanWord}.mp3`);
    
    // 检查音频文件是否存在
    if (await fs.access(audioPath).then(() => true).catch(() => false)) {
      // 返回现有音频文件
      res.setHeader('Content-Type', 'audio/mpeg');
      res.sendFile(audioPath);
    } else {
      // 生成新的TTS音频
      const audioBuffer = await generateWordAudio(cleanWord);
      
      // 保存音频文件供下次使用
      await fs.mkdir(audioDir, { recursive: true });
      await fs.writeFile(audioPath, audioBuffer);
      
      // 返回生成的音频
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    }
  } catch (error) {
    console.error('Get word audio error:', error);
    res.status(500).json({ error: 'Audio service error', message: error.message });
  }
};

/**
 * 上传用户录音并进行发音评分
 */
exports.analyzePronunciation = async (req, res) => {
  try {
    // 检查是否有上传的文件
    if (!req.file && !req.body.audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }
    
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: 'Target word is required' });
    }
    
    let audioPath;
    
    if (req.file) {
      // 文件上传方式
      audioPath = req.file.path;
    } else if (req.body.audioData) {
      // Base64音频数据
      const audioBuffer = Buffer.from(req.body.audioData, 'base64');
      audioPath = path.join(__dirname, '../temp', `user-recording-${Date.now()}.wav`);
      await fs.writeFile(audioPath, audioBuffer);
    }
    
    // 分析发音
    const analysisResult = await analyzePronunciationWithAPI(audioPath, word);
    
    // 清理临时文件
    await fs.unlink(audioPath).catch(() => {});
    
    // 保存评分结果到数据库（可选）
    // await savePronunciationScore(req.user.id, word, analysisResult.score);
    
    res.json(analysisResult);
    
  } catch (error) {
    console.error('Analyze pronunciation error:', error);
    res.status(500).json({ error: 'Pronunciation analysis failed', message: error.message });
  }
};