/**
 * 提醒系统路由
 * 管理复习提醒
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getDueCount, sendReminder } = require('../controllers/reminders');

// 获取待复习数量 - 需要认证
router.get('/count', authenticateToken, getDueCount);

// 发送提醒 - 需要认证
router.post('/send', authenticateToken, sendReminder);

module.exports = router;
