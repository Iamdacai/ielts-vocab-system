/**
 * 学习会话路由
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createSession, completeSession, getHistory } = require('../controllers/sessions');

// 创建会话 - 需要认证
router.post('/', authenticateToken, createSession);

// 完成会话 - 需要认证
router.post('/complete', authenticateToken, completeSession);

// 获取历史 - 需要认证
router.get('/history', authenticateToken, getHistory);

module.exports = router;
