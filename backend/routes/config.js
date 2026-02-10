const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getUserConfig, updateUserConfig } = require('../controllers/config');

// 获取用户配置 - 需要认证
router.get('/', authenticateToken, getUserConfig);

// 更新用户配置 - 需要认证
router.post('/', authenticateToken, updateUserConfig);

module.exports = router;