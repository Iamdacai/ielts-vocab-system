const { initializeDatabase } = require('../database-sqlite');
const { calculateNextReview } = require('../spaced-repetition-algorithm');

/**
 * 获取所有单词（用于统计）
 */
const getAllWords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = await initializeDatabase();
    
    // 获取所有单词总数
    const totalWords = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    
    // 获取用户已学习单词数
    const learnedWords = await db.get(
      'SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ?',
      [userId]
    );
    
    // 获取掌握单词数
    const masteredWords = await db.get(
      'SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ? AND mastery_score >= 90',
      [userId]
    );
    
    // 获取学习中单词数
    const learningWords = await db.get(
      'SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ? AND status = "learning"',
      [userId]
    );
    
    // 计算平均掌握率
    const avgMastery = await db.get(
      'SELECT AVG(mastery_score) as avg FROM user_word_progress WHERE user_id = ?',
      [userId]
    );
    
    res.json({
      total_words: totalWords.count || 0,
      learned_words: learnedWords.count || 0,
      mastered_words: masteredWords.count || 0,
      learning_words: learningWords.count || 0,
      avg_mastery_score: avgMastery.avg ? Math.round(avgMastery.avg) : 0,
    });
  } catch (error) {
    console.error('获取单词统计失败:', error);
    res.status(500).json({ error: '获取单词统计失败' });
  }
};

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
    
    // 🆕 修改排序逻辑：优先按来源和分类，再按频率
    query += ' ORDER BY source DESC, category, frequency_level DESC, id LIMIT ?';
    params.push(dailyCount);
    
    const newWords = await db.all(query, params);
    
    // 🆕 字段映射：将 database 字段映射为前端字段
    const mappedWords = newWords.map(word => ({
      id: word.id,
      word: word.word,
      phonetic: word.phonetic || '',
      translation: word.definition || '',  // definition → translation
      example: Array.isArray(word.example_sentences) ? word.example_sentences[0] : (word.example_sentences || ''),
      example_translation: '',
      category: word.category,
      source: word.source,
      frequency_level: word.frequency_level,
      cambridge_book: word.cambridge_book
    }));
    
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
    
    res.json(mappedWords);
  } catch (error) {
    console.error('获取新词失败:', error);
    console.error('错误堆栈:', error.stack);
    console.error('SQL 查询:', query, params);
    res.status(500).json({ 
      error: '获取新词失败',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    const nextReviewAt = calculateNextReview(currentProgress.review_count, masteryScore);
    
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

/**
 * 🆕 获取词库列表
 */
const getLibraries = async (req, res) => {
  try {
    const db = await initializeDatabase();
    
    // 查询所有词库来源
    const libraries = await db.all(`
      SELECT 
        source,
        COUNT(*) as word_count,
        COUNT(DISTINCT category) as category_count
      FROM ielts_words
      WHERE source IS NOT NULL
      GROUP BY source
      ORDER BY word_count DESC
    `);
    
    // 添加默认词库信息
    const result = [
      {
        id: 'cambridge',
        name: '剑桥雅思 1-18',
        description: '基于剑桥雅思真题 1-18',
        word_count: libraries.find(l => l.source?.includes('剑桥'))?.word_count || 0
      },
      {
        id: 'zhenjing',
        name: '雅思词汇真经',
        description: '刘洪波著，按 22 个场景主题分类',
        word_count: libraries.find(l => l.source?.includes('真经'))?.word_count || 0,
        category_count: libraries.find(l => l.source?.includes('真经'))?.category_count || 0
      }
    ];
    
    res.json(result);
  } catch (error) {
    console.error('获取词库列表失败:', error);
    res.status(500).json({ error: '获取词库列表失败' });
  }
};

/**
 * 🆕 获取分类列表（按词库）
 */
const getCategories = async (req, res) => {
  try {
    const { source } = req.query;
    const db = await initializeDatabase();
    
    let query = `
      SELECT 
        category,
        COUNT(*) as word_count,
        MIN(id) as first_word_id
      FROM ielts_words
      WHERE category IS NOT NULL AND category != ''
    `;
    
    let params = [];
    
    if (source) {
      query += ' AND source LIKE ?';
      params.push(`%${source}%`);
    }
    
    query += `
      GROUP BY category
      ORDER BY 
        SUBSTR(category, 1, 2),
        word_count DESC
    `;
    
    const categories = await db.all(query, params);
    
    // 格式化分类名称（去掉编号）
    const result = categories.map(cat => ({
      id: cat.category,
      name: cat.category.replace(/^\d+_/, ''),
      word_count: cat.word_count,
      has_audio: true
    }));
    
    res.json(result);
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
};

/**
 * 🆕 按词库和分类查询单词
 */
const getWordsByLibrary = async (req, res) => {
  try {
    const { libraryId } = req.params;
    const { category, limit = 100, offset = 0 } = req.query;
    const db = await initializeDatabase();
    
    let query = 'SELECT * FROM ielts_words WHERE 1=1';
    let params = [];
    
    // 按词库筛选
    if (libraryId === 'cambridge') {
      query += ' AND (source LIKE ? OR source IS NULL)';
      params.push('%剑桥%');
    } else if (libraryId === 'zhenjing') {
      query += ' AND source LIKE ?';
      params.push('%真经%');
    }
    
    // 按分类筛选
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    // 分页
    query += ' ORDER BY id LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const words = await db.all(query, params);
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM ielts_words WHERE 1=1';
    let countParams = [...params.slice(0, params.length - 2)];
    
    if (libraryId === 'cambridge') {
      countQuery += ' AND (source LIKE ? OR source IS NULL)';
    } else if (libraryId === 'zhenjing') {
      countQuery += ' AND source LIKE ?';
    }
    
    if (category) {
      countQuery += ' AND category = ?';
    }
    
    const totalResult = await db.get(countQuery, countParams);
    
    res.json({
      words,
      total: totalResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('获取单词列表失败:', error);
    res.status(500).json({ error: '获取单词列表失败' });
  }
};

/**
 * 🆕 获取单词详情（含音频信息）
 */
const getWordDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initializeDatabase();
    
    const word = await db.get('SELECT * FROM ielts_words WHERE id = ?', [id]);
    
    if (!word) {
      return res.status(404).json({ error: '单词不存在' });
    }
    
    // 生成音频 URL
    const audioUrls = {};
    
    if (word.category) {
      // 单词音频
      audioUrls.word = `/api/audio/vocabulary/audio/${word.category}/${word.word.split('/')[0]}.mp3`;
      
      // 章节音频
      audioUrls.chapter = `/api/audio/vocabulary/audio/${word.category}.mp3`;
    }
    
    res.json({
      ...word,
      audio: audioUrls
    });
  } catch (error) {
    console.error('获取单词详情失败:', error);
    res.status(500).json({ error: '获取单词详情失败' });
  }
};

module.exports = { 
  getAllWords, 
  getNewWords, 
  getReviewWords, 
  recordProgress,
  getLibraries,
  getCategories,
  getWordsByLibrary,
  getWordDetail
};