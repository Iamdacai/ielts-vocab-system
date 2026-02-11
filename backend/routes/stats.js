const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getStats } = require('../controllers/stats');

// 获取学习统计 - 需要认证
router.get('/', authenticateToken, getStats);

module.exports = router;