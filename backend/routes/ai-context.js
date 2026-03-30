/**
 * AI 语境生成 API 路由
 * 提供用户兴趣管理和 AI 例句生成接口
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const aiContextService = require('../services/ai-context-service');

/**
 * 中间件：验证用户登录
 */
async function requireAuth(req, res, next) {
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: '未授权访问'
    });
  }
  
  req.userId = parseInt(userId);
  next();
}

/**
 * GET /api/ai/user-interests
 * 获取用户兴趣配置
 */
router.get('/user-interests', requireAuth, async (req, res) => {
  try {
    const interests = await aiContextService.getUserInterests(req.userId);
    
    res.json({
      success: true,
      data: interests
    });
  } catch (error) {
    console.error('[AI API] 获取兴趣失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/ai/user-interests
 * 更新用户兴趣配置
 */
router.put('/user-interests', requireAuth, async (req, res) => {
  try {
    const { interests, preferred_topics, ai_context_enabled } = req.body;
    
    // 验证输入
    if (!Array.isArray(interests)) {
      return res.status(400).json({
        success: false,
        error: '兴趣标签必须是数组'
      });
    }

    const result = await aiContextService.updateUserInterests(req.userId, {
      interests,
      preferred_topics: preferred_topics || [],
      ai_context_enabled
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[AI API] 更新兴趣失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/generate-example
 * 生成 AI 例句
 */
router.post('/generate-example', requireAuth, async (req, res) => {
  try {
    const { word, word_id, count = 3, difficulty = 'medium', force_regenerate = false } = req.body;
    
    // 验证输入
    if (!word) {
      return res.status(400).json({
        success: false,
        error: '单词不能为空'
      });
    }

    console.log(`[AI API] 请求生成例句：${word} (用户：${req.userId})`);

    const result = await aiContextService.generateExamples(word, req.userId, {
      count,
      difficulty,
      forceRegenerate: force_regenerate,
      wordId: word_id || null
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[AI API] 生成例句失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai/example-feedback
 * 提交例句反馈
 */
router.post('/example-feedback', requireAuth, async (req, res) => {
  try {
    const { example_id, feedback, reason = '' } = req.body;
    
    if (!example_id || !['like', 'dislike'].includes(feedback)) {
      return res.status(400).json({
        success: false,
        error: '参数错误'
      });
    }

    const result = await aiContextService.submitFeedback(example_id, feedback, reason);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[AI API] 反馈提交失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/interests/list
 * 获取可选兴趣标签列表
 */
router.get('/interests/list', async (req, res) => {
  const interests = [
    { id: 'tech', name: '科技', icon: '💻' },
    { id: 'business', name: '商业', icon: '💼' },
    { id: 'entertainment', name: '娱乐', icon: '🎬' },
    { id: 'sports', name: '体育', icon: '⚽' },
    { id: 'travel', name: '旅行', icon: '✈️' },
    { id: 'food', name: '美食', icon: '🍳' },
    { id: 'science', name: '科学', icon: '🔬' },
    { id: 'art', name: '艺术', icon: '🎨' },
    { id: 'education', name: '教育', icon: '📚' },
    { id: 'health', name: '健康', icon: '🏥' },
    { id: 'environment', name: '环境', icon: '🌍' },
    { id: 'culture', name: '文化', icon: '🎭' }
  ];

  res.json({
    success: true,
    data: interests
  });
});

/**
 * GET /api/ai/topics/list
 * 获取雅思场景分类列表
 */
router.get('/topics/list', async (req, res) => {
  const topics = [
    '自然地理', '植物研究', '动物保护', '太空探索',
    '学校教育', '科技发明', '文化历史', '语言演化',
    '娱乐运动', '物品材料', '时尚潮流', '饮食健康',
    '建筑场所', '交通旅行', '国家政府', '社会经济',
    '法律法规', '沙场争锋', '社会角色', '行为动作',
    '身心健康', '时间日期'
  ];

  res.json({
    success: true,
    data: topics
  });
});

/**
 * GET /api/ai/stats
 * 获取 AI 使用统计（管理员）
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const database = await db.initializeDatabase();
    
    // 检查是否是管理员
    const user = await database.get('SELECT role FROM users WHERE id = ?', [req.userId]);
    if (user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权限访问'
      });
    }

    // 获取统计数据
    const dailyStats = await database.all('SELECT * FROM v_daily_ai_stats LIMIT 7');
    const userStats = await database.all('SELECT * FROM v_user_ai_stats LIMIT 10');
    const totalGenerations = await database.get('SELECT COUNT(*) as count FROM ai_generation_logs');
    const cacheHitRate = await database.get(`
      SELECT 
        CAST(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 as rate
      FROM ai_generation_logs
    `);

    res.json({
      success: true,
      data: {
        daily_stats: dailyStats,
        top_users: userStats,
        total_generations: totalGenerations.count,
        cache_hit_rate: cacheHitRate.rate?.toFixed(2) || '0'
      }
    });
  } catch (error) {
    console.error('[AI API] 统计获取失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
