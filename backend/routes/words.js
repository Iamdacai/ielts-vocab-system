const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getNewWords, getReviewWords, recordWordProgress } = require('../controllers/words');

// 获取今日新词 - 需要认证
router.get('/new', authenticateToken, getNewWords);

// 获取今日复习词 - 需要认证
router.get('/review', authenticateToken, getReviewWords);

// 记录单词学习进度 - 需要认证
router.post('/progress', authenticateToken, recordWordProgress);

module.exports = router;