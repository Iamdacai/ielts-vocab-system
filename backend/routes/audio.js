const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

/**
 * 🆕 获取词汇音频（章节音频和单词音频）
 * 路径：/api/audio/vocabulary/audio/:category/:filename
 */
router.get('/vocabulary/audio/:category/:filename?', async (req, res) => {
  try {
    const { category, filename } = req.params;
    
    // 解码分类名（可能包含中文）
    const decodedCategory = decodeURIComponent(category);
    
    // 构建音频文件路径
    const audioDir = path.join(__dirname, '../../vocabulary/ielts-materials/audio');
    
    let audioPath;
    
    if (filename) {
      // 单词音频：/api/audio/vocabulary/audio/01_自然地理/atmosphere.mp3
      const decodedFilename = decodeURIComponent(filename);
      audioPath = path.join(audioDir, decodedCategory, decodedFilename);
    } else {
      // 章节音频：/api/audio/vocabulary/audio/01_自然地理.mp3
      // 检查是否是 category.mp3 格式
      if (category.endsWith('.mp3')) {
        const chapterFile = decodeURIComponent(category);
        audioPath = path.join(audioDir, chapterFile);
      } else {
        // 尝试查找章节音频
        const chapterPath = path.join(audioDir, `${decodedCategory}.mp3`);
        if (fs.existsSync(chapterPath)) {
          audioPath = chapterPath;
        } else {
          return res.status(404).json({ 
            error: 'Chapter audio not found',
            category: decodedCategory
          });
        }
      }
    }
    
    // 检查音频文件是否存在
    if (fs.existsSync(audioPath)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', fs.statSync(audioPath).size);
      res.sendFile(audioPath);
    } else {
      res.status(404).json({ 
        error: 'Audio file not found',
        path: audioPath,
        category: decodedCategory,
        filename: filename
      });
    }
  } catch (error) {
    console.error('词汇音频服务错误:', error);
    res.status(500).json({ error: '音频服务错误', message: error.message });
  }
});

/**
 * 获取单词发音音频
 * 支持多种音频格式和备用方案
 */
router.get('/:word.:ext', async (req, res) => {
  try {
    const { word, ext } = req.params;
    const cleanWord = decodeURIComponent(word).split(' ')[0].toLowerCase();
    
    // 支持的音频格式
    const supportedFormats = ['mp3', 'wav', 'ogg'];
    if (!supportedFormats.includes(ext.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported audio format' });
    }
    
    // 音频文件路径
    const audioDir = path.join(__dirname, '../audio');
    const audioPath = path.join(audioDir, `${cleanWord}.${ext}`);
    
    // 检查音频文件是否存在
    if (fs.existsSync(audioPath)) {
      res.setHeader('Content-Type', `audio/${ext}`);
      res.sendFile(audioPath);
    } else {
      // 尝试其他格式
      for (const format of supportedFormats) {
        const altPath = path.join(audioDir, `${cleanWord}.${format}`);
        if (fs.existsSync(altPath)) {
          res.setHeader('Content-Type', `audio/${format}`);
          return res.sendFile(altPath);
        }
      }
      
      // 如果都没有，返回404
      res.status(404).json({ 
        error: 'Audio not found',
        word: cleanWord,
        available_formats: supportedFormats
      });
    }
  } catch (error) {
    console.error('Audio fetch error:', error);
    res.status(500).json({ error: 'Audio service error' });
  }
});

/**
 * 获取单词发音列表（用于批量预加载）
 */
router.get('/list/:words', async (req, res) => {
  try {
    const words = decodeURIComponent(req.params.words).split(',');
    const audioDir = path.join(__dirname, '../audio');
    const availableAudios = [];
    
    for (const word of words) {
      const cleanWord = word.split(' ')[0].toLowerCase();
      const formats = ['mp3', 'wav', 'ogg'];
      
      for (const format of formats) {
        const audioPath = path.join(audioDir, `${cleanWord}.${format}`);
        if (fs.existsSync(audioPath)) {
          availableAudios.push({
            word: cleanWord,
            format: format,
            url: `/api/audio/${encodeURIComponent(cleanWord)}.${format}`
          });
          break;
        }
      }
    }
    
    res.json({ audios: availableAudios });
  } catch (error) {
    console.error('Audio list error:', error);
    res.status(500).json({ error: 'Audio list service error' });
  }
});

module.exports = router;