const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

/**
 * 发音评分控制器
 * 处理单词发音播放、用户录音上传和发音评分
 */

// 模拟发音评分函数（实际项目中应替换为真实的语音识别API）
async function analyzePronunciation(userAudioPath, targetWord) {
  // 这里应该调用真实的语音识别和发音评分服务
  // 例如：Google Speech-to-Text + 发音相似度算法
  // 或者使用专门的发音评分API（如Elsa Speak API等）
  
  // 模拟评分逻辑
  const randomScore = Math.floor(Math.random() * 40) + 60; // 60-100分
  
  // 生成反馈信息
  let feedback = '';
  if (randomScore >= 90) {
    feedback = '发音非常标准！继续保持！';
  } else if (randomScore >= 80) {
    feedback = '发音很好，注意个别音节的重音位置。';
  } else if (randomScore >= 70) {
    feedback = '发音基本正确，但某些音素需要改进。';
  } else {
    feedback = '发音需要更多练习，建议多听标准发音并跟读。';
  }
  
  return {
    score: randomScore,
    feedback: feedback,
    word: targetWord,
    timestamp: new Date().toISOString()
  };
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
      res.setHeader('Content-Type', 'audio/mpeg');
      res.sendFile(audioPath);
    } else {
      // 如果没有预生成的音频，可以调用TTS服务生成
      // 这里返回404，前端可以处理备用方案
      res.status(404).json({ 
        error: 'Audio not found',
        word: cleanWord
      });
    }
  } catch (error) {
    console.error('Get word audio error:', error);
    res.status(500).json({ error: 'Audio service error' });
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
      audioPath = path.join(__dirname, '../temp', `user-recording-${Date.now()}.mp3`);
      await fs.writeFile(audioPath, audioBuffer);
    }
    
    // 分析发音
    const analysisResult = await analyzePronunciation(audioPath, word);
    
    // 清理临时文件
    if (req.body.audioData) {
      await fs.unlink(audioPath).catch(() => {});
    }
    
    // 保存评分结果到数据库（可选）
    // await savePronunciationScore(req.user.id, word, analysisResult.score);
    
    res.json(analysisResult);
    
  } catch (error) {
    console.error('Analyze pronunciation error:', error);
    res.status(500).json({ error: 'Pronunciation analysis failed' });
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
          url: `/api/pronunciation/audio/${encodeURIComponent(cleanWord)}`
        });
      }
    }
    
    res.json({ audios: availableAudios });
  } catch (error) {
    console.error('Get word audio list error:', error);
    res.status(500).json({ error: 'Audio list service error' });
  }
};