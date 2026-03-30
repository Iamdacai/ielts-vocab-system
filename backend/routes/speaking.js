/**
 * 口语练习 API 路由
 */

const express = require('express');
const router = express.Router();
const speakingService = require('../services/speaking-service');
const db = require('../database');

/**
 * 中间件：验证用户登录（使用 JWT token）
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'ielts_vocab_dev_secret_2026_change_in_production';

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未授权访问'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.userId = decoded.userId || 1;
    next();
  } catch (error) {
    console.error('[Speaking Auth] Token 验证失败:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Token 无效或已过期'
    });
  }
}

/**
 * POST /api/speaking/start
 * 开始练习
 */
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { practice_type, word_id, sentence, topic_id, question } = req.body;

    const result = await speakingService.startPractice({
      userId: req.userId,
      practiceType: practice_type,
      wordId: word_id,
      sentence,
      topicId,
      question
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Speaking API] 开始练习失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/speaking/submit
 * 提交练习
 */
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { practice_id, audio_path, audio_duration, transcript } = req.body;

    const result = await speakingService.submitPractice({
      practiceId: practice_id,
      userId: req.userId,
      audioPath: audio_path,
      audioDuration: audio_duration,
      transcript
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Speaking API] 提交练习失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/speaking/history
 * 获取练习历史
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { type, limit = 20, offset = 0 } = req.query;

    const history = await speakingService.getPracticeHistory(req.userId, {
      practiceType: type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        list: history,
        total: history.length
      }
    });
  } catch (error) {
    console.error('[Speaking API] 获取历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/speaking/stats
 * 获取统计数据
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await speakingService.getStats(req.userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Speaking API] 获取统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/speaking/topics
 * 获取题库
 */
router.get('/topics', async (req, res) => {
  try {
    const { part, topic, difficulty, count = 5 } = req.query;

    const topics = await speakingService.getRandomTopics({
      part: part ? parseInt(part) : undefined,
      topic,
      difficulty,
      count: parseInt(count)
    });

    res.json({
      success: true,
      data: topics
    });
  } catch (error) {
    console.error('[Speaking API] 获取题库失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/speaking/topics/all
 * 获取所有题库分类
 */
router.get('/topics/all', async (req, res) => {
  try {
    const database = await db.initializeDatabase();

    const categories = await database.all(`
      SELECT 
        part,
        topic,
        COUNT(*) as count,
        AVG(frequency) as avg_frequency
      FROM ielts_speaking_topics
      GROUP BY part, topic
      ORDER BY part, avg_frequency DESC
    `);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('[Speaking API] 获取分类失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/speaking/:practiceId
 * 删除练习记录
 */
router.delete('/:practiceId', requireAuth, async (req, res) => {
  try {
    const { practiceId } = req.params;

    await speakingService.deletePractice(parseInt(practiceId), req.userId);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('[Speaking API] 删除失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
