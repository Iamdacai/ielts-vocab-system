const { pool } = require('../database');

/**
 * 获取用户学习统计
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 获取总体统计
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_words,
         COUNT(CASE WHEN status = 'mastered' THEN 1 END) as mastered_words,
         COUNT(CASE WHEN status = 'learning' THEN 1 END) as learning_words,
         COUNT(CASE WHEN status = 'forgotten' THEN 1 END) as forgotten_words,
         AVG(mastery_score) as avg_mastery_score
       FROM user_word_progress
       WHERE user_id = $1`,
      [userId]
    );
    
    const stats = statsResult.rows[0];
    
    // 获取今日学习记录
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayRecords = await pool.query(
      `SELECT COUNT(*) as today_learning_count
       FROM learning_records
       WHERE user_id = $1
         AND created_at BETWEEN $2 AND $3`,
      [userId, todayStart, todayEnd]
    );
    
    // 获取本周学习趋势
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekRecords = await pool.query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as count
       FROM learning_records
       WHERE user_id = $1
         AND created_at >= $2
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [userId, weekStart]
    );
    
    const response = {
      ...stats,
      today_learning_count: todayRecords.rows[0].today_learning_count,
      weekly_trend: weekRecords.rows
    };
    
    res.json(response);
  } catch (error) {
    console.error('获取学习统计失败:', error);
    res.status(500).json({ error: '获取学习统计失败' });
  }
};

module.exports = { getUserStats };