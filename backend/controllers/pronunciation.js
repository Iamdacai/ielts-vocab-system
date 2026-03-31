require('dotenv').config();
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

// 🆕 打印配置检查
console.log('[讯飞配置] enableRealPronunciationAPI:', CONFIG.enableRealPronunciationAPI);
console.log('[讯飞配置] appId:', CONFIG.iflytekPronunciationAPI.appId ? '已配置 ✅' : '未配置 ❌');
console.log('[讯飞配置] apiKey:', CONFIG.iflytekPronunciationAPI.apiKey ? '已配置 ✅' : '未配置 ❌');
console.log('[讯飞配置] apiSecret:', CONFIG.iflytekPronunciationAPI.apiSecret ? '已配置 ✅' : '未配置 ❌');

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
    
    // 多维度评分
    const score = overall.score || 0;        // 总分
    const fluency = overall.fls || 0;        // 流利度
    const accuracy = overall.acc || 0;       // 准确度
    const completeness = overall.com || 0;   // 完整度
    const prosody = overall.pro || 0;        // 韵律
    
    console.log('[讯飞] 评分详情:', {
      score: score,
      fluency: fluency,
      accuracy: accuracy,
      completeness: completeness,
      prosody: prosody
    });
    
    // 生成详细反馈
    const feedback = generateIFlyTekFeedback(score, fluency, targetWord, result);
    
    return {
      score: Math.round(score),
      fluency: Math.round(fluency),
      accuracy: Math.round(accuracy),
      completeness: Math.round(completeness),
      prosody: Math.round(prosody),
      feedback: feedback,
      word: targetWord,
      timestamp: new Date().toISOString(),
      detailedResult: result,
      isRealScore: true,  // 标记为真实评分
      // 评分等级
      grade: score >= 90 ? 'A+' : score >= 85 ? 'A' : score >= 80 ? 'A-' : 
             score >= 75 ? 'B+' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D'
    };
  } catch (error) {
    console.error('[讯飞] ❌ 评分失败:', error);
    console.error('[讯飞] error.response:', error.response);
    console.error('[讯飞] error.message:', error.message);
    console.error('[讯飞] error.stack:', error.stack);
    
    // 如果是配置错误，给出明确提示
    if (error.response && error.response.status === 401) {
      throw new Error('讯飞 API 签名验证失败，请检查 API Key 和 Secret');
    } else if (error.response && error.response.status === 403) {
      throw new Error('讯飞账户余额不足或权限不足');
    }
    
    throw new Error(`发音评分失败：${error.message}`);
  }
}

/**
 * 生成讯飞评分反馈（增强版）
 */
function generateIFlyTekFeedback(score, fluency, word, detailedResult) {
  const parts = [];
  const details = [];
  
  // 📊 总体评价（带 emoji）
  if (score >= 95) {
    parts.push('🎉 发音完美！几乎和母语者一样标准！');
    details.push('你的发音非常准确，继续保持！');
  } else if (score >= 90) {
    parts.push('🌟 发音非常标准！');
    details.push('发音准确度很高，只有极细微的改进空间。');
  } else if (score >= 85) {
    parts.push('👍 发音很好！');
    details.push('整体发音不错，注意个别音节的细节。');
  } else if (score >= 80) {
    parts.push('😊 发音良好！');
    details.push('发音基本准确，可以多听标准发音模仿。');
  } else if (score >= 75) {
    parts.push('💪 发音基本正确，可以改进。');
    details.push('主要音节发音正确，但有些细节需要调整。');
  } else if (score >= 70) {
    parts.push('📚 发音尚可，需要更多练习。');
    details.push('建议分解单词，逐个音节练习。');
  } else if (score >= 60) {
    parts.push('🔍 发音需要改进。');
    details.push('建议先听标准发音，再跟读练习。');
  } else {
    parts.push('💪 继续加油！多听多练会进步的！');
    details.push('不要气馁，发音需要时间和练习。');
  }
  
  // 🎯 流利度分析
  if (fluency >= 90) {
    details.push(`流利度极佳（${Math.round(fluency)}分）：语速自然流畅！`);
  } else if (fluency >= 80) {
    details.push(`流利度良好（${Math.round(fluency)}分）：语速适中。`);
  } else if (fluency >= 70) {
    details.push(`流利度尚可（${Math.round(fluency)}分）：可以尝试说得更连贯一些。`);
  } else {
    details.push(`流利度待提升（${Math.round(fluency)}分）：语速可以更自然流畅，避免停顿。`);
  }
  
  // 💡 针对性建议（根据分数段）
  if (score < 80) {
    details.push('💡 练习建议：');
    details.push('  1. 先听标准发音 3-5 遍');
    details.push('  2. 分解单词，逐个音节跟读');
    details.push('  3. 录音后对比标准发音');
    details.push('  4. 重复练习直到接近标准');
  } else if (score < 90) {
    details.push('💡 提升建议：多听原声材料，模仿语音语调。');
  }
  
  // 🎓 单词信息
  details.push(`📝 目标单词：${word}`);
  
  return parts.join(' ') + '\n\n' + details.join('\n');
}

/**
 * 模拟发音评分（增强版 - 多维度）
 */
async function analyzeWithSimulation(userAudioPath, targetWord) {
  try {
    // 获取音频文件信息
    const stats = await fs.stat(userAudioPath);
    const fileSize = stats.size;
    
    // 基于文件大小的智能评分（模拟多维度）
    // 正常 3-8 秒的录音应该在 50KB-200KB 之间
    let baseScore = 75;
    let fluency = 75;
    let accuracy = 75;
    let completeness = 75;
    
    if (fileSize < 30000) {
      // 录音太短（可能没读完）
      baseScore = Math.floor(Math.random() * 20) + 50; // 50-70
      completeness = Math.floor(Math.random() * 30) + 40; // 完整度较低
    } else if (fileSize > 300000) {
      // 录音太长（可能有停顿或重复）
      baseScore = Math.floor(Math.random() * 20) + 60; // 60-80
      fluency = Math.floor(Math.random() * 30) + 50; // 流利度较低
    } else {
      // 正常范围，给个较好的分数
      baseScore = Math.floor(Math.random() * 30) + 70; // 70-100
      fluency = baseScore + (Math.floor(Math.random() * 10) - 5);
      accuracy = baseScore + (Math.floor(Math.random() * 10) - 5);
      completeness = baseScore + (Math.floor(Math.random() * 10) - 5);
    }
    
    // 添加一些随机性
    const randomFactor = Math.floor(Math.random() * 10) - 5; // -5 to +5
    const finalScore = Math.max(0, Math.min(100, baseScore + randomFactor));
    fluency = Math.max(0, Math.min(100, fluency + randomFactor));
    accuracy = Math.max(0, Math.min(100, accuracy + randomFactor));
    completeness = Math.max(0, Math.min(100, completeness + randomFactor));
    
    // 生成详细反馈
    const feedback = generateDetailedFeedback(finalScore, fluency, accuracy, completeness, targetWord);
    
    return {
      score: finalScore,
      fluency: Math.round(fluency),
      accuracy: Math.round(accuracy),
      completeness: Math.round(completeness),
      feedback: feedback,
      word: targetWord,
      timestamp: new Date().toISOString(),
      audioSize: fileSize,
      isRealScore: false,  // 标记为模拟评分
      grade: finalScore >= 90 ? 'A+' : finalScore >= 85 ? 'A' : finalScore >= 80 ? 'A-' : 
             finalScore >= 75 ? 'B+' : finalScore >= 70 ? 'B' : finalScore >= 60 ? 'C' : 'D'
    };
  } catch (error) {
    console.error('Simulation analysis error:', error);
    // 如果分析失败，返回一个保守分数
    return {
      score: 60,
      fluency: 60,
      accuracy: 60,
      completeness: 60,
      feedback: '发音分析失败，请重试',
      word: targetWord,
      timestamp: new Date().toISOString(),
      isRealScore: false,
      grade: 'C'
    };
  }
}

/**
 * 生成详细反馈（模拟评分用）
 */
function generateDetailedFeedback(score, fluency, accuracy, completeness, word) {
  const parts = [];
  const details = [];
  
  // 📊 总体评价
  if (score >= 95) {
    parts.push('🎉 发音完美！');
    details.push('你的发音非常准确，继续保持！');
  } else if (score >= 90) {
    parts.push('🌟 发音非常标准！');
    details.push('发音准确度很高，只有极细微的改进空间。');
  } else if (score >= 85) {
    parts.push('👍 发音很好！');
    details.push('整体发音不错，注意个别音节的细节。');
  } else if (score >= 80) {
    parts.push('😊 发音良好！');
    details.push('发音基本准确，可以多听标准发音模仿。');
  } else if (score >= 75) {
    parts.push('💪 发音基本正确，可以改进。');
    details.push('主要音节发音正确，但有些细节需要调整。');
  } else if (score >= 70) {
    parts.push('📚 发音尚可，需要更多练习。');
    details.push('建议分解单词，逐个音节练习。');
  } else if (score >= 60) {
    parts.push('🔍 发音需要改进。');
    details.push('建议先听标准发音，再跟读练习。');
  } else {
    parts.push('💪 继续加油！多听多练会进步的！');
    details.push('不要气馁，发音需要时间和练习。');
  }
  
  // 🎯 维度分析
  details.push(`\n📊 评分详情:`);
  details.push(`  准确度：${accuracy}分`);
  details.push(`  流利度：${fluency}分`);
  details.push(`  完整度：${completeness}分`);
  
  // 💡 针对性建议
  if (score < 80) {
    details.push(`\n💡 练习建议:`);
    details.push('  1. 先听标准发音 3-5 遍');
    details.push('  2. 分解单词，逐个音节跟读');
    details.push('  3. 录音后对比标准发音');
    details.push('  4. 重复练习直到接近标准');
  } else if (score < 90) {
    details.push(`\n💡 提升建议：多听原声材料，模仿语音语调。`);
  }
  
  // 📝 单词信息
  details.push(`\n📝 目标单词：${word}`);
  
  return parts.join(' ') + '\n\n' + details.join('\n');
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
