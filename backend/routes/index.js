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
const mistakesRoutes = require('./mistakes');       // 新增：错题本 2.0
const aiContextRoutes = require('./ai-context');    // AI 语境生成
const speakingRoutes = require('./speaking');       // 口语陪练
const writingRoutes = require('./writing');         // 写作辅助
const usersRoutes = require('../users');            // 用户管理
const adminRoutes = require('../admin');            // 管理员后台

// 🆕 AIielts Phase 1 新增路由
const readingRoutes = require('./reading');         // 阅读练习
const listeningRoutes = require('./listening');     // 听力练习
const studyPlanRoutes = require('./study-plan');    // 学习计划

// 挂载路由
router.use('/auth', authRoutes);
router.use('/config', configRoutes);
router.use('/words', wordsRoutes);
router.use('/stats', statsRoutes);
router.use('/audio', audioRoutes);
router.use('/pronunciation', pronunciationRoutes);
router.use('/sessions', sessionsRoutes);       // 学习会话
router.use('/achievements', achievementsRoutes); // 成就系统
router.use('/reminders', remindersRoutes);       // 智能提醒
router.use('/mistakes', mistakesRoutes);         // 错题本 2.0
router.use('/ai', aiContextRoutes);              // AI 语境生成
router.use('/speaking', speakingRoutes);         // 口语陪练
router.use('/writing', writingRoutes);           // 写作辅助
router.use('/users', usersRoutes);               // 用户管理（个人中心）
router.use('/admin', adminRoutes);               // 管理员后台

// 🆕 AIielts Phase 1 路由
router.use('/reading', readingRoutes);           // 阅读练习
router.use('/listening', listeningRoutes);       // 听力练习
router.use('/plan', studyPlanRoutes);            // 学习计划

module.exports = router;
