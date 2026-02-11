const { initializeDatabase } = require('../database-sqlite');

/**
 * 获取学习统计信息
 */
const getStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = await initializeDatabase();
    
    // 获取总词汇数
    const totalWordsResult = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    const totalWords = totalWordsResult.count;
    
    // 获取用户学习统计
    const userStats = await db.get(
      `SELECT 
         COUNT(CASE WHEN status = 'mastered' THEN 1 END) as mastered_words,
         COUNT(CASE WHEN status IN ('learning', 'new') THEN 1 END) as learning_words,
         AVG(mastery_score) as avg_mastery_score,
         COUNT(*) as total_user_words
       FROM user_word_progress 
       WHERE user_id = ?`,
      [userId]
    );
    
    // 获取今日学习数量
    const todayLearning = await db.get(
      `SELECT COUNT(*) as count 
       FROM learning_records 
       WHERE user_id = ? 
       AND date(created_at) = date('now')`,
      [userId]
    );
    
    const stats = {
      total_words: totalWords,
      mastered_words: userStats.mastered_words || 0,
      learning_words: userStats.learning_words || 0,
      avg_mastery_score: userStats.avg_mastery_score ? parseFloat(userStats.avg_mastery_score.toFixed(2)) : 0,
      today_learning_count: todayLearning.count || 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('获取学习统计失败:', error);
    res.status(500).json({ error: '获取学习统计失败' });
  }
};

module.exports = { getStats };