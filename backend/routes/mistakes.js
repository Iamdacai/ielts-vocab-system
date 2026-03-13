// 错题本 API 路由
const express = require('express');
const router = express.Router();
const mistakesController = require('../controllers/mistakes');
const authMiddleware = require('../middleware/auth');

// 所有错题相关路由都需要认证
router.use(authMiddleware);

// 添加错题
router.post('/add', mistakesController.addMistake);

// 获取错题列表
router.get('/list', mistakesController.getMistakes);

// 获取错题统计
router.get('/stats', mistakesController.getMistakeStats);

// 错题练习
router.post('/practice', mistakesController.practiceMistake);

// 移除错题
router.delete('/:id', mistakesController.removeMistake);

// 获取高频错题
router.get('/high-freq', mistakesController.getHighFrequencyMistakes);

// 标记错题已掌握
router.post('/eliminate', mistakesController.eliminateMistake);

module.exports = router;
