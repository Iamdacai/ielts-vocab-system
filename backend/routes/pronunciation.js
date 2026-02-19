const express = require('express');
const router = express.Router();
const multer = require('multer');
const pronunciationController = require('../controllers/pronunciation-real');

// 配置文件上传（与server.js保持一致）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

/**
 * 发音评分路由
 */

// 获取单词发音音频（TTS）
router.get('/word-audio/:word', pronunciationController.getWordAudio);

// 分析用户发音并评分
router.post('/analyze', upload.single('audio'), pronunciationController.analyzePronunciation);

// 获取发音练习历史
router.get('/history', pronunciationController.getPronunciationHistory);

// 获取发音统计
router.get('/stats', pronunciationController.getPronunciationStats);

module.exports = router;