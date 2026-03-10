const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const axios = require('axios');

/**
 * 发音评分控制器
 * 处理单词发音播放、用户录音上传和发音评分
 * 
 * 功能：
 * 1. 从有道词典获取 TTS 音频（免费、稳定）
 * 2. 本地缓存已生成的音频
 * 3. 发音评分（模拟，可替换为真实 API）
 */

// 配置
const CONFIG = {
  // 是否启用真实发音评分 API（如 Azure Speech）
  enableRealPronunciationAPI: false,
  
  // Azure 配置（如果需要真实评分）
  azurePronunciationAPI: {
    key: process.env.AZURE_SPEECH_KEY || '',
    region: process.env.AZURE_SPEECH_REGION || 'eastasia'
  }
};

/**
 * 从有道词典获取 TTS 音频
 */
async function fetchTTSFromYoudao(word) {
  const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
  
  try {
    const response = await axios.get(youdaoUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch TTS for "${word}":`, error.message);
    throw new Error('TTS service unavailable');
  }
}

/**
 * 模拟发音评分（可替换为真实 API）
 */
async function analyzePronunciation(userAudioPath, targetWord) {
  // 如果启用了真实 API，使用 Azure Pronunciation Assessment
  if (CONFIG.enableRealPronunciationAPI && CONFIG.azurePronunciationAPI.key) {
    return await analyzeWithAzure(userAudioPath, targetWord);
  }
  
  // 否则使用模拟评分（带一些智能逻辑）
  return await analyzeWithSimulation(userAudioPath, targetWord);
}

/**
 * 使用 Azure 进行真实发音评分
 */
async function analyzeWithAzure(userAudioPath, targetWord) {
  try {
    const audioBuffer = await fs.readFile(userAudioPath);
    const assessmentUrl = `https://${CONFIG.azurePronunciationAPI.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
    
    const headers = {
      'Ocp-Apim-Subscription-Key': CONFIG.azurePronunciationAPI.key,
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
    
    const score = result.NBest?.[0]?.PronunciationAssessment?.PronScore || 0;
    const accuracy = result.NBest?.[0]?.PronunciationAssessment?.AccuracyScore || 0;
    const fluency = result.NBest?.[0]?.PronunciationAssessment?.FluencyScore || 0;
    
    const feedback = generateFeedback(score, accuracy, fluency);
    
    return {
      score: Math.round(score),
      accuracy: Math.round(accuracy),
      fluency: Math.round(fluency),
      feedback: feedback,
      word: targetWord,
      timestamp: new Date().toISOString(),
      detailedResult: result
    };
  } catch (error) {
    console.error('Azure pronunciation analysis error:', error.response?.data || error.message);
    throw new Error('Pronunciation analysis failed');
  }
}

/**
 * 模拟发音评分（带智能逻辑）
 */
async function analyzeWithSimulation(userAudioPath, targetWord) {
  try {
    // 获取音频文件信息
    const stats = await fs.stat(userAudioPath);
    const fileSize = stats.size;
    
    // 基于文件大小的简单验证（太短或太长都不好）
    // 正常 3-8 秒的录音应该在 50KB-200KB 之间
    let baseScore = 75;
    
    if (fileSize < 30000) {
      // 录音太短
      baseScore = Math.floor(Math.random() * 20) + 50; // 50-70
    } else if (fileSize > 300000) {
      // 录音太长
      baseScore = Math.floor(Math.random() * 20) + 60; // 60-80
    } else {
      // 正常范围，给个较好的分数
      baseScore = Math.floor(Math.random() * 30) + 70; // 70-100
    }
    
    // 添加一些随机性
    const randomFactor = Math.floor(Math.random() * 10) - 5; // -5 to +5
    const finalScore = Math.max(0, Math.min(100, baseScore + randomFactor));
    
    const feedback = generateFeedback(finalScore);
    
    return {
      score: finalScore,
      feedback: feedback,
      word: targetWord,
      timestamp: new Date().toISOString(),
      audioSize: fileSize
    };
  } catch (error) {
    console.error('Simulation analysis error:', error);
    // 如果分析失败，返回一个保守分数
    return {
      score: 60,
      feedback: '发音分析失败，请重试',
      word: targetWord,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 根据评分生成反馈
 */
function generateFeedback(score, accuracy, fluency) {
  if (score >= 90) {
    return '发音非常标准！继续保持！🎉';
  } else if (score >= 80) {
    return '发音很好，注意个别音节的重音位置。👍';
  } else if (score >= 70) {
    return '发音基本正确，但某些音素需要改进。💪';
  } else if (score >= 60) {
    return '发音需要更多练习，建议多听标准发音并跟读。📚';
  } else {
    return '继续加油！多听多练会进步的！🔥';
  }
}

/**
 * 获取单词标准发音音频
 */
exports.getWordAudio = async (req, res) => {
  try {
    const { word } = req.params;
    const cleanWord = decodeURIComponent(word).split(' ')[0].toLowerCase();
    
    if (!cleanWord || cleanWord.length > 50) {
      return res.status(400).json({ error: 'Invalid word' });
    }
    
    // 音频文件路径
    const audioDir = path.join(__dirname, '../audio');
    const audioPath = path.join(audioDir, `${cleanWord}.mp3`);
    
    // 确保音频目录存在
    await fs.mkdir(audioDir, { recursive: true });
    
    // 检查本地是否有缓存的音频文件
    try {
      await fs.access(audioPath);
      console.log(`[Audio] Cache hit: ${cleanWord}`);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.sendFile(audioPath);
    } catch (cacheError) {
      // 没有缓存，需要生成
      console.log(`[Audio] Cache miss: ${cleanWord}, fetching from TTS...`);
    }
    
    // 从有道 TTS 获取音频
    const audioData = await fetchTTSFromYoudao(cleanWord);
    
    // 保存到本地缓存
    await fs.writeFile(audioPath, audioData);
    console.log(`[Audio] Cached: ${cleanWord}`);
    
    // 返回音频
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioData);
    
  } catch (error) {
    console.error('[Audio] Get word audio error:', error.message);
    res.status(500).json({ 
      error: 'Audio service error',
      message: error.message 
    });
  }
};

/**
 * 上传用户录音并进行发音评分
 */
exports.analyzePronunciation = async (req, res) => {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio data provided',
        message: 'Please upload an audio file'
      });
    }
    
    const { word } = req.body;
    if (!word || word.length > 50) {
      return res.status(400).json({ error: 'Target word is required' });
    }
    
    const audioPath = req.file.path;
    console.log(`[Pronunciation] Analyzing: "${word}", file: ${audioPath}`);
    
    // 分析发音
    const analysisResult = await analyzePronunciation(audioPath, word);
    
    // 清理临时文件
    await fs.unlink(audioPath).catch(() => {});
    console.log(`[Pronunciation] Analysis complete: ${analysisResult.score}/100`);
    
    res.json(analysisResult);
    
  } catch (error) {
    console.error('[Pronunciation] Analyze error:', error.message);
    res.status(500).json({ 
      error: 'Pronunciation analysis failed',
      message: error.message 
    });
  }
};

/**
 * 批量获取单词发音列表
 */
exports.getWordAudioList = async (req, res) => {
  try {
    const { words } = req.query;
    if (!words) {
      return res.status(400).json({ error: 'Words parameter is required' });
    }
    
    const wordArray = Array.isArray(words) ? words : words.split(',');
    const audioDir = path.join(__dirname, '../audio');
    const availableAudios = [];
    
    for (const word of wordArray) {
      const cleanWord = word.split(' ')[0].toLowerCase();
      const audioPath = path.join(audioDir, `${cleanWord}.mp3`);
      
      if (await fs.access(audioPath).then(() => true).catch(() => false)) {
        availableAudios.push({
          word: cleanWord,
          url: `/api/pronunciation/word-audio/${encodeURIComponent(cleanWord)}`
        });
      }
    }
    
    res.json({ audios: availableAudios });
  } catch (error) {
    console.error('Get word audio list error:', error);
    res.status(500).json({ error: 'Audio list service error' });
  }
};
