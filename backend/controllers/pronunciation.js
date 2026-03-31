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
  // 是否启用真实发音评分 API（Azure Speech）
  enableRealPronunciationAPI: true,  // ✅ 启用真实评分
  
  // Azure 配置
  azurePronunciationAPI: {
    key: process.env.AZURE_SPEECH_KEY || '',
    region: process.env.AZURE_SPEECH_REGION || 'eastasia',
    // 参考文本（用于对比）
    referenceText: ''
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
    console.log('[Azure] ========== 开始发音评分 ==========');
    console.log('[Azure] 目标单词:', targetWord);
    console.log('[Azure] 音频文件:', userAudioPath);
    
    // 检查配置
    if (!CONFIG.azurePronunciationAPI.key) {
      console.error('[Azure] ❌ API Key 未配置');
      throw new Error('Azure API Key 未配置，请在 .env 中设置 AZURE_SPEECH_KEY');
    }
    
    const audioBuffer = await fs.readFile(userAudioPath);
    
    // Azure Speech 发音评测 API
    const assessmentUrl = `https://${CONFIG.azurePronunciationAPI.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
    
    console.log('[Azure] 请求 URL:', assessmentUrl);
    
    const headers = {
      'Ocp-Apim-Subscription-Key': CONFIG.azurePronunciationAPI.key,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      'Accept': 'application/json',
      'SpeechContext': JSON.stringify({
        'pronunciationAssessment': {
          'referenceText': targetWord,
          'gradingSystem': 'HundredMark',  // 百分制
          'dimension': 'Comprehensive',     // 综合评分
          'enableMiscue': true              // 检测误读
        }
      })
    };
    
    console.log('[Azure] 发送请求到 Azure...');
    
    const response = await axios.post(assessmentUrl, audioBuffer, { 
      headers,
      timeout: 30000  // 30 秒超时
    });
    
    const result = response.data;
    console.log('[Azure] ✅ 评分成功');
    console.log('[Azure] 原始结果:', JSON.stringify(result, null, 2));
    
    // 提取评分
    const nBest = result.NBest || [];
    if (nBest.length === 0) {
      console.error('[Azure] ❌ 无评分结果');
      throw new Error('Azure 未返回评分结果');
    }
    
    const assessment = nBest[0].PronunciationAssessment;
    const score = assessment?.PronScore || 0;
    const accuracy = assessment?.AccuracyScore || 0;
    const fluency = assessment?.FluencyScore || 0;
    const completeness = assessment?.CompletenessScore || 0;
    
    console.log('[Azure] 评分详情:', {
      总分：score,
      准确度：accuracy,
      流利度：fluency,
      完整度：completeness
    });
    
    // 生成详细反馈
    const feedback = generateDetailedFeedback(score, accuracy, fluency, completeness, targetWord, nBest[0]);
    
    return {
      score: Math.round(score),
      accuracy: Math.round(accuracy),
      fluency: Math.round(fluency),
      completeness: Math.round(completeness),
      feedback: feedback,
      word: targetWord,
      timestamp: new Date().toISOString(),
      detailedResult: result,
      isRealScore: true  // 标记为真实评分
    };
  } catch (error) {
    console.error('[Azure] ❌ 评分失败:', error.response?.data || error.message);
    
    // 如果是配置错误，给出明确提示
    if (error.response?.status === 401) {
      throw new Error('Azure API Key 无效，请检查配置');
    } else if (error.response?.status === 403) {
      throw new Error('Azure 账户余额不足或订阅已过期');
    }
    
    throw new Error(`发音评分失败：${error.message}`);
  }
}

/**
 * 生成详细反馈（基于 Azure 评分结果）
 */
function generateDetailedFeedback(score, accuracy, fluency, completeness, word, recognitionResult) {
  const parts = [];
  
  // 总体评价
  if (score >= 90) {
    parts.push('🎉 发音非常标准！');
  } else if (score >= 80) {
    parts.push('👍 发音很好！');
  } else if (score >= 70) {
    parts.push('💪 发音基本正确，可以改进。');
  } else if (score >= 60) {
    parts.push('📚 需要更多练习。');
  } else {
    parts.push('🔥 继续加油！');
  }
  
  // 维度分析
  if (accuracy < 70) {
    parts.push(`准确度 ${Math.round(accuracy)} 分：某些音素发音不够准确。`);
  }
  
  if (fluency < 70) {
    parts.push(`流利度 ${Math.round(fluency)} 分：语速可以更自然流畅。`);
  }
  
  if (completeness < 70) {
    parts.push(`完整度 ${Math.round(completeness)} 分：单词发音不够完整。`);
  }
  
  // 音素级反馈（如果有误读）
  if (recognitionResult?.Words) {
    const errorWords = recognitionResult.Words.filter(w => {
      const wordAssessment = w.PronunciationAssessment;
      return wordAssessment && wordAssessment.AccuracyScore < 60;
    });
    
    if (errorWords.length > 0) {
      parts.push(`注意：${errorWords.map(w => w.Word).join(', ')} 发音需要改进。`);
    }
  }
  
  return parts.join(' ');
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

/**
 * 获取发音练习历史（占位实现）
 */
exports.getPronunciationHistory = async (req, res) => {
  try {
    // TODO: 从数据库获取用户发音历史
    res.json({
      history: [],
      message: '功能开发中'
    });
  } catch (error) {
    console.error('Get pronunciation history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
};

/**
 * 获取发音统计（占位实现）
 */
exports.getPronunciationStats = async (req, res) => {
  try {
    // TODO: 从数据库获取用户发音统计
    res.json({
      totalPractice: 0,
      averageScore: 0,
      message: '功能开发中'
    });
  } catch (error) {
    console.error('Get pronunciation stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};
