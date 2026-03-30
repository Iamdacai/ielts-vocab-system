/**
 * 语料库服务
 * 管理个人语料库
 */

const db = require('../database');

class CorpusService {
  /**
   * 获取语料库列表
   * @param {number} userId
   * @param {object} options
   * @returns {Promise<array>}
   */
  async getCorpus(userId, options = {}) {
    const {
      topic,
      contentType,
      sourceType,
      limit = 50,
      offset = 0
    } = options;

    const database = await db.initializeDatabase();

    let query = 'SELECT * FROM personal_corpus WHERE user_id = ?';
    const params = [userId];

    if (topic) {
      query += ' AND topic_tags LIKE ?';
      params.push(`%${topic}%`);
    }

    if (contentType) {
      query += ' AND content_type = ?';
      params.push(contentType);
    }

    if (sourceType) {
      query += ' AND source_type = ?';
      params.push(sourceType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await database.all(query, params);
  }

  /**
   * 添加语料
   * @param {number} userId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async addCorpus(userId, data) {
    const {
      content,
      contentType = 'sentence',
      sourceType = 'writing',
      topicTags = [],
      aiAnalysis = {}
    } = data;

    const database = await db.initializeDatabase();

    const result = await database.run(`
      INSERT INTO personal_corpus 
      (user_id, content, content_type, source_type, topic_tags, vocabulary_used, ai_analysis)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      content,
      contentType,
      sourceType,
      JSON.stringify(topicTags),
      JSON.stringify([]),
      JSON.stringify(aiAnalysis)
    ]);

    return {
      id: result.lastID,
      ...data
    };
  }

  /**
   * 删除语料
   * @param {number} corpusId
   * @param {number} userId
   */
  async deleteCorpus(corpusId, userId) {
    const database = await db.initializeDatabase();

    await database.run(
      'DELETE FROM personal_corpus WHERE id = ? AND user_id = ?',
      [corpusId, userId]
    );
  }

  /**
   * 更新语料使用次数
   * @param {number} corpusId
   */
  async incrementUsage(corpusId) {
    const database = await db.initializeDatabase();

    await database.run(`
      UPDATE personal_corpus 
      SET usage_count = usage_count + 1
      WHERE id = ?
    `, [corpusId]);
  }

  /**
   * 获取语料统计
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getStats(userId) {
    const database = await db.initializeDatabase();

    const stats = await database.get(`
      SELECT 
        COUNT(*) as total,
        SUM(usage_count) as total_usage,
        COUNT(DISTINCT source_type) as source_types,
        COUNT(DISTINCT content_type) as content_types
      FROM personal_corpus
      WHERE user_id = ?
    `, [userId]);

    // 按类型统计
    const byType = await database.all(`
      SELECT 
        content_type,
        COUNT(*) as count
      FROM personal_corpus
      WHERE user_id = ?
      GROUP BY content_type
    `, [userId]);

    // 按来源统计
    const bySource = await database.all(`
      SELECT 
        source_type,
        COUNT(*) as count
      FROM personal_corpus
      WHERE user_id = ?
      GROUP BY source_type
    `, [userId]);

    return {
      total: stats,
      byType,
      bySource
    };
  }
}

module.exports = new CorpusService();
