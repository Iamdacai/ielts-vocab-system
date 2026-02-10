const { pool } = require('../database');
const SpacedRepetitionAlgorithm = require('../spaced-repetition-algorithm');

const algorithm = new SpacedRepetitionAlgorithm();

/**
 * 获取今日新词
 */
const getNewWords = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 获取用户配置
    const configResult = await pool.query(
      'SELECT daily_new_words_count FROM user_configs WHERE user_id = $1',
      [userId]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: '用户配置不存在' });
    }
    
    const dailyCount = configResult.rows[0].daily_new_words_count;
    
    // 获取用户尚未学习的单词（排除已学习的）
    const wordsResult = await pool.query(
      `SELECT iw.* 
       FROM ielts_words iw
       LEFT JOIN user_word_progress uwp ON iw.id = uwp.word_id AND uwp.user_id = $1
       WHERE uwp.word_id IS NULL
       ORDER BY iw.frequency_level DESC, iw.cambridge_book ASC
       LIMIT $2`,
      [userId, dailyCount]
    );
    
    // 为新词创建学习进度记录
    if (wordsResult.rows.length > 0) {
      const wordIds = wordsResult.rows.map(word => word.id);
      await createNewWordProgress(userId, wordIds);
    }
    
    res.json(wordsResult.rows);
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
    
    // 获取用户配置中的复习时间
    const configResult = await pool.query(
      'SELECT review_time FROM user_configs WHERE user_id = $1',
      [userId]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: '用户配置不存在' });
    }
    
    const reviewTime = configResult.rows[0].review_time;
    const today = new Date();
    
    // 计算复习时间窗口
    const reviewWindow = algorithm.getReviewWindow(today, reviewTime);
    
    // 获取需要在今天复习的单词
    const wordsResult = await pool.query(
      `SELECT iw.*, uwp.status, uwp.mastery_score, uwp.review_count
       FROM user_word_progress uwp
       JOIN ielts_words iw ON uwp.word_id = iw.id
       WHERE uwp.user_id = $1
         AND uwp.next_review_at BETWEEN $2 AND $3
         AND uwp.status != 'mastered'
       ORDER BY uwp.next_review_at ASC`,
      [userId, reviewWindow.start, reviewWindow.end]
    );
    
    res.json(wordsResult.rows);
  } catch (error) {
    console.error('获取复习词失败:', error);
    res.status(500).json({ error: '获取复习词失败' });
  }
};

/**
 * 记录单词学习进度
 */
const recordWordProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { wordId, isCorrect, confidence, actionType } = req.body;
    
    if (!wordId || typeof isCorrect !== 'boolean' || !confidence || !actionType) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 获取当前单词进度
    const progressResult = await pool.query(
      'SELECT * FROM user_word_progress WHERE user_id = $1 AND word_id = $2',
      [userId, wordId]
    );
    
    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: '单词进度不存在' });
    }
    
    const currentProgress = progressResult.rows[0];
    const currentMastery = currentProgress.mastery_score;
    const currentReviewCount = currentProgress.review_count;
    
    // 更新掌握度评分
    const newMastery = algorithm.updateMasteryScore(currentMastery, isCorrect, confidence);
    
    // 计算下次复习时间
    const nextReviewAt = algorithm.calculateNextReview(
      currentReviewCount + 1,
      newMastery,
      new Date()
    );
    
    // 确定单词状态
    let newStatus = 'learning';
    if (newMastery >= 90) {
      newStatus = 'mastered';
    } else if (newMastery <= 30 && currentReviewCount > 3) {
      newStatus = 'forgotten';
    }
    
    // 更新单词进度
    await pool.query(
      `UPDATE user_word_progress 
       SET status = $1,
           mastery_score = $2,
           review_count = review_count + 1,
           next_review_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4 AND word_id = $5`,
      [newStatus, newMastery, nextReviewAt, userId, wordId]
    );
    
    // 记录学习行为
    await pool.query(
      `INSERT INTO learning_records(user_id, word_id, action_type, result)
       VALUES($1, $2, $3, $4)`,
      [userId, wordId, actionType, { isCorrect, confidence, mastery: newMastery }]
    );
    
    res.json({ 
      success: true, 
      mastery: newMastery, 
      nextReviewAt,
      status: newStatus
    });
  } catch (error) {
    console.error('记录学习进度失败:', error);
    res.status(500).json({ error: '记录学习进度失败' });
  }
};

/**
 * 为新词创建学习进度记录
 */
const createNewWordProgress = async (userId, wordIds) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const wordId of wordIds) {
      await client.query(
        `INSERT INTO user_word_progress(user_id, word_id, status, next_review_at)
         VALUES($1, $2, 'new', $3)
         ON CONFLICT (user_id, word_id) DO NOTHING`,
        [userId, wordId, new Date(Date.now() + 5 * 60000)] // 5分钟后第一次复习
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { getNewWords, getReviewWords, recordWordProgress };