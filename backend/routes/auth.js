const express = require('express');
const router = express.Router();
const { authenticateWechat } = require('../controllers/auth-sqlite');

/**
 * 微信小程序登录认证
 * POST /api/auth/login
 * 请求体: { code: '微信登录code' }
 * 返回: { token: 'jwt_token', user: { id, openid } }
 */
router.post('/login', authenticateWechat);

module.exports = router;