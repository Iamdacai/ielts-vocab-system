/**
 * 成就路由
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getUserAchievements, unlockAchievement, checkAndUnlock } = require('../controllers/achievements');

// 获取用户成就 - 需要认证
router.get('/', authenticateToken, getUserAchievements);

// 解锁成就 - 需要认证
router.post('/unlock', authenticateToken, unlockAchievement);

// 检查并解锁 - 需要认证
router.post('/check', authenticateToken, checkAndUnlock);

module.exports = router;
