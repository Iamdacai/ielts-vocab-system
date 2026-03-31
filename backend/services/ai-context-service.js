/**
 * AI 语境生成服务
 * 根据用户兴趣生成个性化例句
 */

const db = require('../database');
const BailianClient = require('./bailian-client');
const crypto = require('crypto');

class AIContextService {
  constructor() {
    this.bailian = new BailianClient({
      model: process.env.BAILIAN_MODEL || 'qwen-plus',
      timeout: 30000
    });
    
    // 内存缓存（生产环境建议用 Redis）
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 60 * 24; // 24 小时缓存
  }

  /**
   * 获取用户兴趣配置
   * @param {number} userId 
   * @returns {Promise<object>}
   */
  async getUserInterests(userId) {
    const database = await db.initializeDatabase();
    
    const user = await database.get(`
      SELECT interests, preferred_topics, ai_context_enabled 
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (!user) {
      // 返回默认配置
      return {
        interests: [],
        preferred_topics: [],
        ai_context_enabled: true
      };
    }

    return {
      interests: JSON.parse(user.interests || '[]'),
      preferred_topics: JSON.parse(user.preferred_topics || '[]'),
      ai_context_enabled: user.ai_context_enabled === 1
    };
  }

  /**
   * 更新用户兴趣配置
   * @param {number} userId 
   * @param {object} interests 
   */
  async updateUserInterests(userId, interests) {
    const database = await db.initializeDatabase();
    
    await database.run(`
      UPDATE users 
      SET interests = ?, preferred_topics = ?, ai_context_enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      JSON.stringify(interests.interests || []),
      JSON.stringify(interests.preferred_topics || []),
      interests.ai_context_enabled !== false ? 1 : 0,
      userId
    ]);

    return { success: true };
  }

  /**
   * 生成 AI 例句
   * @param {string} word - 单词
   * @param {number} userId - 用户 ID
   * @param {object} options - 选项
   * @returns {Promise<object>}
   */
  async generateExamples(word, userId, options = {}) {
    const {
      count = 3,
      difficulty = 'medium',
      forceRegenerate = false,
      wordId = null
    } = options;

    const startTime = Date.now();
    
    // 1. 获取用户兴趣
    const userInterests = await this.getUserInterests(userId);
    
    // 如果用户关闭了 AI 语境，返回空
    if (!userInterests.ai_context_enabled) {
      return {
        word,
        examples: [],
        ai_explanation: 'AI 语境生成已关闭',
        from_cache: false
      };
    }

    // 2. 构建缓存键
    const cacheKey = `${word}_${difficulty}_${count}_${userInterests.interests.join(',')}`;
    
    // 3. 检查缓存（非强制刷新）
    if (!forceRegenerate) {
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        console.log(`[AI] ✅ 命中缓存：${word}`);
        await this._logGeneration(userId, word, wordId, '', cached, Date.now() - startTime, true);
        return { ...cached, from_cache: true };
      }
    }

    // 4. 构建 Prompt
    const prompt = this._buildPrompt(word, count, difficulty, userInterests);

    // 5. 调用 Bailian API
    console.log(`[AI] 🔄 生成例句：${word} (兴趣：${userInterests.interests.join(',')})`);
    
    let result;
    try {
      result = await this.bailian.generate(prompt, {
        temperature: 0.7,
        maxTokens: 1500,
        jsonMode: true,
        retryCount: 3
      });
    } catch (error) {
      console.error('[AI] ❌ Bailian API 调用失败:', error.message);
      console.log('[AI] 🔄 降级到模拟数据...');
      
      // 降级：返回模拟例句
      const mockExamples = this._generateMockExamples(word, count, difficulty);
      const mockResult = {
        word,
        examples: mockExamples,
        ai_explanation: `AI 服务暂时不可用，已返回模拟例句。请稍后重试。`,
        from_cache: false,
        isMock: true
      };
      
      await this._logGeneration(userId, word, wordId, '', mockResult, Date.now() - startTime, false);
      return mockResult;
    }

    // 6. 验证和清理结果
    const examples = this._parseAndValidate(result, count);

    // 7. 保存到数据库
    const savedExamples = await this._saveExamples(wordId, examples, userInterests, difficulty);

    // 8. 构建返回结果
    const response = {
      word,
      examples: savedExamples,
      ai_explanation: result.explanation || this._generateExplanation(word, examples)
    };

    // 9. 缓存结果
    this._saveToCache(cacheKey, response);

    // 10. 记录日志
    await this._logGeneration(userId, word, wordId, prompt, response, Date.now() - startTime, false);

    console.log(`[AI] ✅ 生成成功：${word} (${Date.now() - startTime}ms)`);
    
    return { ...response, from_cache: false };
  }

  /**
   * 构建 Prompt
   * @private
   */
  _buildPrompt(word, count, difficulty, userInterests) {
    const interests = userInterests.interests.length > 0 
      ? userInterests.interests.join('、') 
      : '通用场景';
    
    const topics = userInterests.preferred_topics.length > 0
      ? userInterests.preferred_topics.join('、')
      : '雅思常见场景';

    return `
你是一名雅思英语教学专家。请为单词 "${word}" 生成${count}个例句。

【用户信息】
- 兴趣领域：${interests}
- 偏好场景：${topics}
- 英语水平：${difficulty}

【要求】
1. 例句要结合用户的兴趣，让用户觉得有用、有趣
2. 符合雅思考试场景（学术、生活、工作等）
3. 难度分级：
   - easy: 简单句，15 词以内，基础词汇
   - medium: 复合句，15-25 词，含雅思高频词
   - hard: 复杂句，25 词+，含学术词汇
4. 每个例句包含：
   - 英文原句
   - 中文翻译
   - 重点搭配（2-3 个常用搭配）
5. 避免敏感话题（政治、宗教等）
6. 确保英文地道、自然

【输出格式】
严格返回 JSON，不要其他解释：
{
  "examples": [
    {
      "en": "英文句子",
      "cn": "中文翻译",
      "collocations": ["搭配 1", "搭配 2"]
    }
  ],
  "explanation": "这个词的核心用法说明（50 字内，中文）"
}
`.trim();
  }

  /**
   * 解析和验证 AI 响应
   * @private
   */
  _parseAndValidate(result, expectedCount) {
    if (!result || !result.examples || !Array.isArray(result.examples)) {
      throw new Error('AI 返回格式无效');
    }

    // 验证每个例句
    const validated = result.examples.slice(0, expectedCount).map((ex, index) => {
      if (!ex.en || !ex.cn) {
        throw new Error(`第${index + 1}个例句格式错误`);
      }

      return {
        en: ex.en.trim(),
        cn: ex.cn.trim(),
        collocations: Array.isArray(ex.collocations) ? ex.collocations : []
      };
    });

    return validated;
  }

  /**
   * 保存例句到数据库
   * @private
   */
  async _saveExamples(wordId, examples, userInterests, difficulty) {
    if (!wordId) {
      // 如果没有 wordId，返回不带 ID 的例句
      return examples.map((ex, idx) => ({
        id: `temp_${idx}`,
        ...ex,
        ai_generated: true,
        difficulty_level: difficulty,
        topic_category: userInterests.preferred_topics[0] || '通用',
        interest_tags: userInterests.interests
      }));
    }

    const database = await db.initializeDatabase();
    const savedIds = [];

    for (const ex of examples) {
      const result = await database.run(`
        INSERT INTO word_examples 
        (word_id, example_text, translation, source, ai_generated, interest_tags, difficulty_level, topic_category)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
      `, [
        wordId,
        ex.en,
        ex.cn,
        'ai',
        JSON.stringify(userInterests.interests),
        difficulty,
        userInterests.preferred_topics[0] || '通用'
      ]);

      savedIds.push({
        id: result.lastID,
        en: ex.en,
        cn: ex.cn,
        collocations: ex.collocations,
        ai_generated: true,
        difficulty_level: difficulty,
        topic_category: userInterests.preferred_topics[0] || '通用',
        interest_tags: userInterests.interests
      });
    }

    return savedIds;
  }

  /**
   * 生成模拟例句（降级用）
   * @private
   */
  _generateMockExamples(word, count, difficulty) {
    const mockExamples = [
      {
        sentence: `The ${word} is widely used in academic research.`,
        translation: `${word} 广泛应用于学术研究中。`,
        context: 'academic'
      },
      {
        sentence: `Many experts recommend using ${word} in daily communication.`,
        translation: `许多专家建议在日常交流中使用 ${word}。`,
        context: 'daily'
      },
      {
        sentence: `The concept of ${word} has gained significant attention in recent years.`,
        translation: `${word} 的概念近年来受到了广泛关注。`,
        context: 'general'
      }
    ];
    
    return mockExamples.slice(0, count);
  }

  /**
   * 生成用法说明（备用）
   * @private
   */
  _generateExplanation(word, examples) {
    return `这个词常用于${examples.length > 0 ? '学术和日常交流' : '多种场景'}，建议结合例句记忆。`;
  }

  /**
   * 缓存操作
   * @private
   */
  _getFromCache(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.cacheTimeout) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  _saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 记录生成日志
   * @private
   */
  async _logGeneration(userId, word, wordId, prompt, result, timeMs, cacheHit) {
    try {
      const database = await db.initializeDatabase();
      const promptHash = BailianClient.hashPrompt(prompt);
      
      await database.run(`
        INSERT INTO ai_generation_logs 
        (user_id, word, word_id, prompt_hash, prompt_text, generated_examples, generation_time_ms, cache_hit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        word,
        wordId,
        promptHash,
        prompt || null,
        JSON.stringify(result),
        timeMs,
        cacheHit ? 1 : 0
      ]);
    } catch (error) {
      console.error('[AI] 日志记录失败:', error.message);
    }
  }

  /**
   * 提交例句反馈
   * @param {number} exampleId 
   * @param {string} feedback - 'like' | 'dislike'
   * @param {string} reason - 可选原因
   */
  async submitFeedback(exampleId, feedback, reason = '') {
    const database = await db.initializeDatabase();
    
    const isPositive = feedback === 'like' ? 1 : 0;
    
    await database.run(`
      UPDATE word_examples 
      SET feedback_count = feedback_count + 1,
          positive_feedback = positive_feedback + ?
      WHERE id = ?
    `, [isPositive, exampleId]);

    // 记录用户反馈到日志
    await database.run(`
      UPDATE ai_generation_logs 
      SET user_feedback = ?
      WHERE generated_examples LIKE '%"id":' + ? + '%'
    `, [JSON.stringify({ feedback, reason }), exampleId]);

    return { success: true };
  }

  /**
   * 清理旧缓存
   */
  cleanupCache() {
    const now = Date.now();
    let count = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
        count++;
      }
    }
    
    console.log(`[AI] 清理缓存：${count} 条`);
    return count;
  }
}

module.exports = new AIContextService();
