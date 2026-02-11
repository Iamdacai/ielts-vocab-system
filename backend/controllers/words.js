const { initializeDatabase } = require('../database-sqlite');
const { calculateNextReview } = require('../spaced-repetition-algorithm');

/**
 * 获取今日新词
 */
const getNewWords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = await initializeDatabase();
    
    // 获取用户配置
    const userConfig = await db.get('SELECT * FROM user_configs WHERE user_id = ?', [userId]);
    if (!userConfig) {
      return res.status(404).json({ error: '用户配置不存在' });
    }
    
    const dailyCount = userConfig.daily_new_words_count || 20;
    
    // 获取用户已经学习过的单词ID
    const learnedWords = await db.all(
      'SELECT word_id FROM user_word_progress WHERE user_id = ?',
      [userId]
    );
    const learnedWordIds = learnedWords.map(w => w.word_id);
    
    // 获取未学习的新词
    let query = 'SELECT * FROM ielts_words WHERE 1=1';
    let params = [];
    
    if (learnedWordIds.length > 0) {
      query += ` AND id NOT IN (${learnedWordIds.map(() => '?').join(',')})`;
      params = learnedWordIds;
    }
    
    query += ' ORDER BY cambridge_book, frequency_level DESC LIMIT ?';
    params.push(dailyCount);
    
    const newWords = await db.all(query, params);
    
    // 为新词创建学习进度记录
    for (const word of newWords) {
      await db.run(
        `INSERT INTO user_word_progress 
         (user_id, word_id, status, next_review_at, mastery_score) 
         VALUES (?, ?, 'new', datetime('now', '+5 minutes'), 0.0)`,
        [userId, word.id]
      );
      
      // 记录学习行为
      await db.run(
        `INSERT INTO learning_records 
         (user_id, word_id, action_type, result) 
         VALUES (?, ?, 'new_word', 'started')`,
        [userId, word.id]
      );
    }
    
    res.json(newWords);
  } catch (error) {
    console.error('获取新词失败:', error);
    res.status(500).json({ error: '获取新词失败' });
  }
};

/**
 * 获取今日复习词
 */
const getReviewWords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = await initializeDatabase();
    
    // 获取需要复习的单词（next_review_at <= 当前时间）
    const reviewWords = await db.all(
      `SELECT w.*, p.status, p.mastery_score, p.next_review_at
       FROM ielts_words w
       JOIN user_word_progress p ON w.id = p.word_id
       WHERE p.user_id = ? 
       AND p.next_review_at <= datetime('now')
       AND p.status IN ('learning', 'new')
       ORDER BY p.next_review_at ASC
       LIMIT 100`,
      [userId]
    );
    
    res.json(reviewWords);
  } catch (error) {
    console.error('获取复习词失败:', error);
    res.status(500).json({ error: '获取复习词失败' });
  }
};

/**
 * 记录学习进度
 */
const recordProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { wordId, result, masteryScore } = req.body;
    
    if (!wordId || typeof result !== 'string' || typeof masteryScore !== 'number') {
      return res.status(400).json({ error: '参数格式错误' });
    }
    
    const db = await initializeDatabase();
    
    // 更新单词进度
    const currentProgress = await db.get(
      'SELECT * FROM user_word_progress WHERE user_id = ? AND word_id = ?',
      [userId, wordId]
    );
    
    if (!currentProgress) {
      return res.status(404).json({ error: '单词进度记录不存在' });
    }
    
    // 计算下次复习时间
    const nextReviewAt = calculateNextReview(masteryScore, currentProgress.review_count);
    
    // 更新进度
    await db.run(
      `UPDATE user_word_progress 
       SET mastery_score = ?,
           review_count = review_count + 1,
           next_review_at = ?,
           updated_at = datetime('now'),
           status = CASE 
             WHEN ? >= 90 THEN 'mastered'
             WHEN ? >= 70 THEN 'learning'
             ELSE 'learning'
           END
       WHERE user_id = ? AND word_id = ?`,
      [masteryScore, nextReviewAt, masteryScore, masteryScore, userId, wordId]
    );
    
    // 记录学习行为
    await db.run(
      `INSERT INTO learning_records 
       (user_id, word_id, action_type, result) 
       VALUES (?, ?, 'review', ?)`,
      [userId, wordId, JSON.stringify({ result, masteryScore, nextReviewAt })]
    );
    
    res.json({
      success: true,
      masteryScore,
      nextReviewAt,
      status: masteryScore >= 90 ? 'mastered' : 'learning'
    });
  } catch (error) {
    console.error('记录学习进度失败:', error);
    res.status(500).json({ error: '记录学习进度失败' });
  }
};

module.exports = { getNewWords, getReviewWords, recordProgress };