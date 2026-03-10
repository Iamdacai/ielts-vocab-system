const express = require('express');
const router = express.Router();

// 导入路由模块
const authRoutes = require('./auth');
const configRoutes = require('./config');
const wordsRoutes = require('./words');
const statsRoutes = require('./stats');
const audioRoutes = require('./audio');
const pronunciationRoutes = require('./pronunciation');
const sessionsRoutes = require('./sessions');
const achievementsRoutes = require('./achievements');
const remindersRoutes = require('./reminders');

// 挂载路由
router.use('/auth', authRoutes);
router.use('/config', configRoutes);
router.use('/words', wordsRoutes);
router.use('/stats', statsRoutes);
router.use('/audio', audioRoutes);
router.use('/pronunciation', pronunciationRoutes);
router.use('/sessions', sessionsRoutes);       // 新增：学习会话
router.use('/achievements', achievementsRoutes); // 新增：成就系统
router.use('/reminders', remindersRoutes);       // 新增：智能提醒

module.exports = router;
