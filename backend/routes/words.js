const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getNewWords, getReviewWords, recordProgress, getAllWords } = require('../controllers/words');

// 获取所有单词（统计用） - 需要认证
router.get('/all', authenticateToken, getAllWords);

// 获取今日新词 - 需要认证
router.get('/new', authenticateToken, getNewWords);

// 获取今日复习词 - 需要认证
router.get('/review', authenticateToken, getReviewWords);

// 记录学习进度 - 需要认证
router.post('/progress', authenticateToken, recordProgress);

module.exports = router;