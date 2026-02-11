const express = require('express');
const router = express.Router();

// 导入路由模块
const authRoutes = require('./auth');
const configRoutes = require('./config');
const wordsRoutes = require('./words');
const statsRoutes = require('./stats');
const audioRoutes = require('./audio');

// 挂载路由
router.use('/auth', authRoutes);
router.use('/config', configRoutes);
router.use('/words', wordsRoutes);
router.use('/stats', statsRoutes);

module.exports = router;