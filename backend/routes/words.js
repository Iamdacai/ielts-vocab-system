const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  getAllWords, 
  getNewWords, 
  getReviewWords, 
  recordProgress,
  getWordsByLibrary,
  getCategories,
  getWordDetail
} = require('../controllers/words');

// 获取所有单词（统计用） - 需要认证
router.get('/all', authenticateToken, getAllWords);

// 获取今日新词 - 需要认证
router.get('/new', authenticateToken, getNewWords);

// 获取今日复习词 - 需要认证
router.get('/review', authenticateToken, getReviewWords);

// 记录学习进度 - 需要认证
router.post('/progress', authenticateToken, recordProgress);

// 🆕 获取词库列表
router.get('/libraries', authenticateToken, getLibraries);

// 🆕 获取分类列表（按词库）
router.get('/categories', authenticateToken, getCategories);

// 🆕 按词库和分类查询单词
router.get('/library/:libraryId/words', authenticateToken, getWordsByLibrary);

// 🆕 获取单词详情（含音频信息）
router.get('/words/:id', authenticateToken, getWordDetail);

module.exports = router;
