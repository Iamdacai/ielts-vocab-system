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
  // 是否启用真实发音评分 API（讯飞语音评测）
  enableRealPronunciationAPI: true,  // ✅ 启用真实评分
  
  // 讯飞语音评测配置
  iflytekPronunciationAPI: {
    appId: process.env.IFLYTEK_APP_ID || '',
    apiKey: process.env.IFLYTEK_API_KEY || '',
    apiSecret: process.env.IFLYTEK_API_SECRET || '',
    // 评测类型：single_word（单词）/ sentence（句子）
    category: 'single_word',
    // 评测维度：read_syllable（音素）/read_word（单词）/read_sentence（句子）
    type: 'read_word'
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
 * 发音评分入口
 */
async function analyzePronunciation(userAudioPath, targetWord) {
  // 如果启用了真实 API，使用讯飞发音评测
  if (CONFIG.enableRealPronunciationAPI && CONFIG.iflytekPronunciationAPI.appId) {
    return await analyzeWithIFlyTek(userAudioPath, targetWord);
  }
  
  // 否则使用模拟评分（带一些智能逻辑）
  return await analyzeWithSimulation(userAudioPath, targetWord);
}

const crypto = require('crypto');

/**
 * 使用讯飞进行真实发音评分
 */
async function analyzeWithIFlyTek(userAudioPath, targetWord) {
  try {
    console.log('[讯飞] ========== 开始发音评分 ==========');
    console.log('[讯飞] 目标单词:', targetWord);
    console.log('[讯飞] 音频文件:', userAudioPath);
    
    // 检查配置
    if (!CONFIG.iflytekPronunciationAPI.appId) {
      console.error('[讯飞] ❌ API 配置未设置');
      throw new Error('讯飞 API 配置未设置，请在 .env 中设置 IFLYTEK_APP_ID 等参数');
    }
    
    const audioBuffer = await fs.readFile(userAudioPath);
    const audioBase64 = audioBuffer.toString('base64');
    
    // 讯飞语音评测 API（听写接口）
    const host = 'api-open.xfyun.cn';
    const path = '/v2/openservice/roll_call';
    const url = `https://${host}${path}`;
    
    // 构建请求体
    const body = {
      common: {
        app_id: CONFIG.iflytekPronunciationAPI.appId
      },
      business: {
        category: CONFIG.iflytekPronunciationAPI.category,  // single_word
        type: CONFIG.iflytekPronunciationAPI.type,  // read_word
        cmd: 'ssb',  // 评分请求
        aus: 'audio/L16;rate=16000',  // 音频格式
        aue: 'raw',
        psc: '1'  // 返回详细评分
      },
      data: {
        text: targetWord,  // 参考文本
        audio: audioBase64,
        status: 2  // 最后一个数据包
      }
    };
    
    // 生成签名（讯飞需要 HMAC-SHA256 签名）
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nPOST ${path} HTTP/1.1`;
    const signatureSha = crypto.createHmac('sha256', CONFIG.iflytekPronunciationAPI.apiSecret)
      .update(signatureOrigin)
      .digest('base64');
    const authorizationOrigin = `api_key="${CONFIG.iflytekPronunciationAPI.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json,version=1.0',
      'Host': host,
      'Date': date,
      'Authorization': authorizationOrigin
    };
    
    console.log('[讯飞] 发送请求到讯飞...');
    
    const response = await axios.post(url, JSON.stringify(body), { 
      headers,
      timeout: 30000  // 30 秒超时
    });
    
    const result = response.data;
    console.log('[讯飞] ✅ 评分成功');
    console.log('[讯飞] 返回码:', result.code);
    
    // 检查错误
    if (result.code !== 0) {
      console.error('[讯飞] ❌ 评分失败:', result.message);
      throw new Error(`讯飞评分失败：${result.message}`);
    }
    
    // 提取评分（讯飞返回格式）
    const data = result.data || {};
    const ssb = data.ssb || {};
    const overall = ssb.overall || {};
    
    const score = overall.score || 0;
    const fluency = overall.fls || 0;  // 流利度
    
    console.log('[讯飞] 评分详情:', {
      总分：score,
      流利度：fluency
    });
    
    // 生成反馈
    const feedback = generateIFlyTekFeedback(score, fluency, targetWord);
    
    return {
      score: Math.round(score),
      fluency: Math.round(fluency),
      feedback: feedback,
      word: targetWord,
      timestamp: new Date().toISOString(),
      detailedResult: result,
      isRealScore: true  // 标记为真实评分
    };
  } catch (error) {
    console.error('[讯飞] ❌ 评分失败:', error.response?.data || error.message);
    
    // 如果是配置错误，给出明确提示
    if (error.response?.status === 401) {
      throw new Error('讯飞 API 签名验证失败，请检查 API Key 和 Secret');
    } else if (error.response?.status === 403) {
      throw new Error('讯飞账户余额不足或权限不足');
    }
    
    throw new Error(`发音评分失败：${error.message}`);
  }
}

/**
 * 生成讯飞评分反馈
 */
function generateIFlyTekFeedback(score, fluency, word) {
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
  
  // 流利度分析
  if (fluency < 70) {
    parts.push(`流利度 ${Math.round(fluency)} 分：语速可以更自然流畅。`);
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
