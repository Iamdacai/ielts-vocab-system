/**
 * 写作练习服务
 * 管理写作练习全流程
 */

const db = require('../database');
const writingScorer = require('./writing-scorer');

class WritingService {
  /**
   * 开始写作练习
   * @param {object} params - 参数
   * @returns {Promise<object>}
   */
  async startPractice(params) {
    const {
      userId,
      topicId,
      essayType,
      customTopic
    } = params;

    const database = await db.initializeDatabase();

    // 获取题目信息
    let topic = customTopic;
    let question = '';

    if (topicId) {
      const topicData = await database.get(
        'SELECT topic, question FROM writing_topics WHERE id = ?',
        [topicId]
      );
      if (!topicData) throw new Error('题目不存在');
      topic = topicData.topic;
      question = topicData.question;
    }

    return {
      topicId,
      topic,
      question,
      essayType,
      requirements: this._getRequirements(essayType)
    };
  }

  /**
   * 提交作文批改
   * @param {object} params - 参数
   * @returns {Promise<object>}
   */
  async submitEssay(params) {
    const {
      userId,
      topicId,
      topic,
      essayType,
      content,
      wordCount
    } = params;

    const database = await db.initializeDatabase();

    // 1. 获取用户信息
    const user = await database.get(
      'SELECT writing_level, writing_goal_score FROM users WHERE id = ?',
      [userId]
    );

    // 2. AI 评分
    let scoreResult;
    try {
      scoreResult = await writingScorer.score({
        topic,
        essay: content,
        essayType,
        userLevel: user?.writing_level || 'intermediate',
        targetScore: user?.writing_goal_score || 7
      });
    } catch (error) {
      console.error('[WritingService] 评分失败:', error);
      throw new Error('AI 评分失败，请稍后重试');
    }

    // 3. 保存练习记录
    const result = await database.run(`
      INSERT INTO writing_practice 
      (user_id, topic_id, topic, essay_type, user_essay, word_count, 
       ai_score, task_response, coherence, vocabulary, grammar,
       ai_feedback, improved_version, highlighted_errors)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      topicId,
      topic,
      essayType,
      content,
      wordCount,
      scoreResult.overall_score,
      scoreResult.task_response,
      scoreResult.coherence,
      scoreResult.vocabulary,
      scoreResult.grammar,
      JSON.stringify({
        feedback: scoreResult.feedback,
        strengths: scoreResult.strengths,
        weaknesses: scoreResult.weaknesses,
        estimated_band: scoreResult.estimated_band
      }),
      JSON.stringify(scoreResult.improved_paragraphs),
      JSON.stringify(scoreResult.error_corrections)
    ]);

    // 4. 提取好句（异步，不阻塞）
    this._extractAndSaveSentences(userId, content).catch(err => {
      console.error('[WritingService] 提取好句失败:', err);
    });

    // 5. 返回结果
    return {
      practiceId: result.lastID,
      score: scoreResult.overall_score,
      bandScore: scoreResult.band_score,
      feedback: scoreResult.feedback,
      strengths: scoreResult.strengths,
      weaknesses: scoreResult.weaknesses,
      suggestions: scoreResult.suggestions,
      errorCorrections: scoreResult.error_corrections,
      improvedParagraphs: scoreResult.improved_paragraphs,
      vocabularyHighlights: scoreResult.vocabulary_highlights,
      usefulExpressions: scoreResult.useful_expressions,
      wordCount: scoreResult.word_count
    };
  }

  /**
   * 获取练习历史
   * @param {number} userId
   * @param {object} options
   * @returns {Promise<array>}
   */
  async getPracticeHistory(userId, options = {}) {
    const {
      essayType,
      limit = 20,
      offset = 0
    } = options;

    const database = await db.initializeDatabase();

    let query = `
      SELECT * FROM writing_practice 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (essayType) {
      query += ' AND essay_type = ?';
      params.push(essayType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const records = await database.all(query, params);

    return records.map(record => ({
      ...record,
      ai_feedback: JSON.parse(record.ai_feedback || '{}'),
      highlighted_errors: JSON.parse(record.highlighted_errors || '[]'),
      improved_version: JSON.parse(record.improved_version || '[]')
    }));
  }

  /**
   * 获取统计数据
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getStats(userId) {
    const database = await db.initializeDatabase();

    // 总统计
    const totalStats = await database.get(`
      SELECT 
        COUNT(*) as total_practices,
        SUM(word_count) as total_words,
        AVG(ai_score) as avg_score,
        AVG(task_response) as avg_task_response,
        AVG(coherence) as avg_coherence,
        AVG(vocabulary) as avg_vocabulary,
        AVG(grammar) as avg_grammar
      FROM writing_practice
      WHERE user_id = ?
    `, [userId]);

    // 按类型统计
    const typeStats = await database.all(`
      SELECT 
        essay_type,
        COUNT(*) as count,
        AVG(ai_score) as avg_score
      FROM writing_practice
      WHERE user_id = ?
      GROUP BY essay_type
    `, [userId]);

    // 最近 7 天趋势
    const trendStats = await database.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as practices,
        AVG(ai_score) as avg_score
      FROM writing_practice
      WHERE user_id = ? AND created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [userId]);

    return {
      total: totalStats,
      byType: typeStats,
      trend: trendStats
    };
  }

  /**
   * 获取随机题目
   * @param {object} options
   * @returns {Promise<array>}
   */
  async getRandomTopics(options = {}) {
    const {
      taskType,
      topic,
      difficulty,
      count = 5
    } = options;

    const database = await db.initializeDatabase();

    let query = 'SELECT * FROM writing_topics WHERE 1=1';
    const params = [];

    if (taskType) {
      query += ' AND task_type = ?';
      params.push(taskType);
    }

    if (topic) {
      query += ' AND topic = ?';
      params.push(topic);
    }

    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(count);

    return await database.all(query, params);
  }

  /**
   * 生成 AI 题目（根据学过的词汇）
   * @param {number} userId
   * @param {string} essayType
   * @returns {Promise<object>}
   */
  async generateAITopic(userId, essayType = 'task2') {
    const database = await db.initializeDatabase();

    // 获取用户学过的词汇
    const learnedWords = await database.all(`
      SELECT DISTINCT w.word
      FROM ielts_words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.user_id = ? AND p.mastery_score >= 75
      LIMIT 50
    `, [userId]);

    const wordList = learnedWords.map(w => w.word);

    if (wordList.length < 10) {
      throw new Error('学过的词汇太少，请先学习更多单词（至少 10 个）');
    }

    // AI 生成题目
    const topic = await writingScorer.generateTopic(wordList, essayType);

    return {
      ...topic,
      generatedFrom: wordList.slice(0, 10)
    };
  }

  /**
   * 提取并保存好句
   * @private
   */
  async _extractAndSaveSentences(userId, essay) {
    const sentences = await writingScorer.extractGoodSentences(essay);

    if (!sentences || sentences.length === 0) {
      return;
    }

    const database = await db.initializeDatabase();

    for (const sentence of sentences) {
      await database.run(`
        INSERT INTO personal_corpus 
        (user_id, source_type, content, content_type, topic_tags, ai_analysis)
        VALUES (?, 'writing', ?, 'sentence', ?, ?)
      `, [
        userId,
        sentence.sentence,
        JSON.stringify(['writing']),
        JSON.stringify({
          translation: sentence.translation,
          highlights: sentence.highlights,
          usage_tips: sentence.usage_tips
        })
      ]);
    }
  }

  /**
   * 获取要求（根据作文类型）
   * @private
   */
  _getRequirements(essayType) {
    if (essayType === 'task2') {
      return [
        'Give reasons for your answer',
        'Include any relevant examples from your knowledge or experience',
        'Write at least 250 words'
      ];
    } else if (essayType === 'task1_academic') {
      return [
        'Summarize the information by selecting and reporting the main features',
        'Make comparisons where relevant',
        'Write at least 150 words'
      ];
    } else {
      return [
        'Address all three bullet points',
        'Use appropriate tone and style',
        'Write at least 150 words'
      ];
    }
  }
}

module.exports = new WritingService();
