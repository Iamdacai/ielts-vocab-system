const { initializeDatabase } = require('../database-sqlite');

/**
 * 获取用户学习配置
 */
const getUserConfig = async (req, res) => {
  try {
    const userId = req.user.userId; // 从JWT token中获取
    
    const db = await initializeDatabase();
    
    const result = await db.get(
      'SELECT * FROM user_configs WHERE user_id = ?',
      [userId]
    );
    
    if (!result) {
      return res.status(404).json({ error: '用户配置不存在' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('获取用户配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
};

/**
 * 更新用户学习配置
 */
const updateUserConfig = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { weekly_new_words_days, daily_new_words_count, review_time } = req.body;
    
    // 验证输入
    if (weekly_new_words_days && !Array.isArray(weekly_new_words_days)) {
      return res.status(400).json({ error: 'weekly_new_words_days 必须是数组' });
    }
    
    if (daily_new_words_count && (daily_new_words_count < 1 || daily_new_words_count > 100)) {
      return res.status(400).json({ error: 'daily_new_words_count 必须在1-100之间' });
    }
    
    if (review_time && !/^\d{2}:\d{2}$/.test(review_time)) {
      return res.status(400).json({ error: 'review_time 格式必须为 HH:MM' });
    }
    
    const db = await initializeDatabase();
    
    // 更新配置
    const result = await db.run(
      `UPDATE user_configs 
       SET weekly_new_words_days = COALESCE(?, weekly_new_words_days),
           daily_new_words_count = COALESCE(?, daily_new_words_count),
           review_time = COALESCE(?, review_time),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [JSON.stringify(weekly_new_words_days), daily_new_words_count, review_time, userId]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '用户配置不存在' });
    }
    
    // 返回更新后的配置
    const updatedConfig = await db.get(
      'SELECT * FROM user_configs WHERE user_id = ?',
      [userId]
    );
    
    res.json(updatedConfig);
  } catch (error) {
    console.error('更新用户配置失败:', error);
    res.status(500).json({ error: '更新配置失败' });
  }
};

module.exports = { getUserConfig, updateUserConfig };