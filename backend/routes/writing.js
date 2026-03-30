/**
 * 写作练习 API 路由
 */

const express = require('express');
const router = express.Router();
const writingService = require('../services/writing-service');
const corpusService = require('../services/corpus-service');

/**
 * 中间件：验证用户登录（使用 JWT token）
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'ielts_vocab_dev_secret_2026_change_in_production';

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '未授权访问' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.userId = decoded.userId || 1;
    next();
  } catch (error) {
    console.error('[Writing Auth] Token 验证失败:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Token 无效或已过期'
    });
  }
}

/**
 * POST /api/writing/start
 * 开始写作
 */
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { topic_id, essay_type, custom_topic } = req.body;
    const result = await writingService.startPractice({
      userId: req.userId,
      topicId: topic_id,
      essayType: essay_type,
      customTopic: custom_topic
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/writing/submit
 * 提交作文
 */
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { topic_id, topic, essay_type, content, word_count } = req.body;
    const result = await writingService.submitEssay({
      userId: req.userId,
      topicId: topic_id,
      topic,
      essayType: essay_type,
      content,
      wordCount: word_count
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/writing/history
 * 获取历史
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { type, limit = 20, offset = 0 } = req.query;
    const history = await writingService.getPracticeHistory(req.userId, {
      essayType: type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    res.json({ success: true, data: { list: history, total: history.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/writing/stats
 * 获取统计
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await writingService.getStats(req.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/writing/topics
 * 获取题库
 */
router.get('/topics', requireAuth, async (req, res) => {
  try {
    const { task_type, topic, difficulty, count = 5 } = req.query;
    const topics = await writingService.getRandomTopics({
      taskType: task_type,
      topic,
      difficulty,
      count: parseInt(count)
    });
    res.json({ success: true, data: topics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/writing/topic/generate
 * AI 生成题目
 */
router.post('/topic/generate', requireAuth, async (req, res) => {
  try {
    const { essay_type = 'task2' } = req.body;
    const topic = await writingService.generateAITopic(req.userId, essay_type);
    res.json({ success: true, data: topic });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/corpus
 * 获取语料库
 */
router.get('/corpus', requireAuth, async (req, res) => {
  try {
    const { topic, content_type, source_type, limit = 50 } = req.query;
    const corpus = await corpusService.getCorpus(req.userId, {
      topic,
      contentType: content_type,
      sourceType: source_type,
      limit: parseInt(limit)
    });
    res.json({ success: true, data: corpus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/corpus/add
 * 添加语料
 */
router.post('/corpus/add', requireAuth, async (req, res) => {
  try {
    const { content, content_type, source_type, topic_tags, ai_analysis } = req.body;
    const result = await corpusService.addCorpus(req.userId, {
      content,
      contentType: content_type,
      sourceType: source_type,
      topicTags: topic_tags,
      aiAnalysis: ai_analysis
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/corpus/:id
 * 删除语料
 */
router.delete('/corpus/:id', requireAuth, async (req, res) => {
  try {
    await corpusService.deleteCorpus(parseInt(req.params.id), req.userId);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/corpus/stats
 * 语料库统计
 */
router.get('/corpus/stats', requireAuth, async (req, res) => {
  try {
    const stats = await corpusService.getStats(req.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
