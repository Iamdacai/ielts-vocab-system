const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getUserStats } = require('../controllers/stats');

// 获取用户学习统计 - 需要认证
router.get('/', authenticateToken, getUserStats);

module.exports = router;