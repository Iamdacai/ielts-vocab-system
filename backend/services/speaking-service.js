/**
 * 口语练习服务
 * 管理口语练习全流程
 */

const db = require('../database');
const sttService = require('./bailian-stt-service');
const speakingScorer = require('./speaking-scorer');
const fs = require('fs');
const path = require('path');

class SpeakingService {
  constructor() {
    this.audioDir = path.join(__dirname, '../audio/speaking');
    // 确保音频目录存在
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  /**
   * 开始练习
   * @param {object} params - 参数
   * @returns {Promise<object>} - 练习信息
   */
  async startPractice(params) {
    const {
      userId,
      practiceType,
      wordId,
      sentence,
      topicId,
      question
    } = params;

    // 验证参数
    if (!['word', 'sentence', 'conversation', 'ielts_mock'].includes(practiceType)) {
      throw new Error('无效的练习类型');
    }

    // 获取题目信息
    let questionText = question;
    let topic = '';

    if (practiceType === 'word' && wordId) {
      const database = await db.initializeDatabase();
      const word = await database.get('SELECT word FROM ielts_words WHERE id = ?', [wordId]);
      if (!word) throw new Error('单词不存在');
      questionText = word.word;
      topic = '单词跟读';
    } else if (practiceType === 'sentence' && sentence) {
      questionText = sentence;
      topic = '句子跟读';
    } else if (practiceType === 'ielts_mock' && topicId) {
      const database = await db.initializeDatabase();
      const topicData = await database.get(
        'SELECT topic, question FROM ielts_speaking_topics WHERE id = ?',
        [topicId]
      );
      if (!topicData) throw new Error('题目不存在');
      topic = topicData.topic;
      questionText = topicData.question;
    }

    // 创建练习记录
    const database = await db.initializeDatabase();
    const result = await database.run(`
      INSERT INTO speaking_practice 
      (user_id, practice_type, topic, question)
      VALUES (?, ?, ?, ?)
    `, [userId, practiceType, topic, questionText]);

    return {
      practiceId: result.lastID,
      practiceType,
      question: questionText,
      topic
    };
  }

  /**
   * 提交练习（录音文件）
   * @param {object} params - 参数
   * @returns {Promise<object>} - 评分结果
   */
  async submitPractice(params) {
    const {
      practiceId,
      userId,
      audioPath,
      audioDuration
    } = params;

    const database = await db.initializeDatabase();

    // 1. 获取练习信息
    const practice = await database.get(
      'SELECT * FROM speaking_practice WHERE id = ?',
      [practiceId]
    );

    if (!practice) {
      throw new Error('练习记录不存在');
    }

    // 2. 保存音频文件
    const fileName = `${Date.now()}_${practiceId}.wav`;
    const savePath = path.join(this.audioDir, fileName);
    
    // 移动临时文件到保存目录
    await fs.promises.rename(audioPath, savePath);
    const audioUrl = `/audio/speaking/${fileName}`;

    // 3. 语音识别（如果还没有 transcript）
    let transcript = params.transcript;
    if (!transcript) {
      try {
        const sttResult = await sttService.recognizeFromFile(savePath, {
          language: 'en-US'
        });
        transcript = sttResult.transcript;
      } catch (error) {
        console.error('[SpeakingService] 语音识别失败:', error);
        transcript = '';
      }
    }

    // 4. 评分
    let scoreResult;
    try {
      scoreResult = await speakingScorer.score({
        question: practice.question,
        transcript: transcript || '',
        practiceType: practice.practice_type,
        userLevel: 'intermediate',
        targetScore: 7
      });
    } catch (error) {
      console.error('[SpeakingService] 评分失败:', error);
      scoreResult = {
        overall_score: 0,
        feedback: '评分失败，请稍后重试'
      };
    }

    // 5. 更新练习记录
    await database.run(`
      UPDATE speaking_practice 
      SET audio_url = ?,
          audio_duration = ?,
          transcript = ?,
          score = ?,
          accuracy = ?,
          fluency = ?,
          pronunciation = ?,
          grammar = ?,
          vocabulary = ?,
          coherence = ?,
          feedback = ?,
          ai_suggestions = ?
      WHERE id = ?
    `, [
      audioUrl,
      audioDuration,
      transcript,
      scoreResult.overall_score || 0,
      scoreResult.accuracy || 0,
      scoreResult.fluency || 0,
      scoreResult.pronunciation || 0,
      scoreResult.grammar || 0,
      scoreResult.vocabulary || 0,
      scoreResult.coherence || 0,
      JSON.stringify({
        feedback: scoreResult.feedback,
        strengths: scoreResult.strengths,
        weaknesses: scoreResult.weaknesses,
        estimated_band: scoreResult.estimated_band
      }),
      JSON.stringify(scoreResult.suggestions || []),
      practiceId
    ]);

    // 6. 返回结果
    return {
      practiceId,
      transcript,
      score: scoreResult.overall_score || 0,
      feedback: scoreResult.feedback,
      strengths: scoreResult.strengths || [],
      weaknesses: scoreResult.weaknesses || [],
      suggestions: scoreResult.suggestions || [],
      audioUrl
    };
  }

  /**
   * 获取练习历史
   * @param {number} userId - 用户 ID
   * @param {object} options - 选项
   * @returns {Promise<array>}
   */
  async getPracticeHistory(userId, options = {}) {
    const {
      practiceType,
      limit = 20,
      offset = 0
    } = options;

    const database = await db.initializeDatabase();

    let query = `
      SELECT * FROM speaking_practice 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (practiceType) {
      query += ' AND practice_type = ?';
      params.push(practiceType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const records = await database.all(query, params);

    return records.map(record => ({
      ...record,
      feedback: JSON.parse(record.feedback || '{}'),
      ai_suggestions: JSON.parse(record.ai_suggestions || '[]')
    }));
  }

  /**
   * 获取统计数据
   * @param {number} userId - 用户 ID
   * @returns {Promise<object>}
   */
  async getStats(userId) {
    const database = await db.initializeDatabase();

    // 总统计
    const totalStats = await database.get(`
      SELECT 
        COUNT(*) as total_practices,
        SUM(audio_duration) / 60 as total_minutes,
        AVG(score) as avg_score,
        AVG(fluency) as avg_fluency,
        AVG(vocabulary) as avg_vocabulary,
        AVG(grammar) as avg_grammar,
        AVG(pronunciation) as avg_pronunciation
      FROM speaking_practice
      WHERE user_id = ?
    `, [userId]);

    // 按类型统计
    const typeStats = await database.all(`
      SELECT 
        practice_type,
        COUNT(*) as count,
        AVG(score) as avg_score
      FROM speaking_practice
      WHERE user_id = ?
      GROUP BY practice_type
    `, [userId]);

    // 最近 7 天趋势
    const trendStats = await database.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as practices,
        AVG(score) as avg_score
      FROM speaking_practice
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
   * @param {object} options - 选项
   * @returns {Promise<array>}
   */
  async getRandomTopics(options = {}) {
    const {
      part,
      topic,
      difficulty,
      count = 5
    } = options;

    const database = await db.initializeDatabase();

    let query = 'SELECT * FROM ielts_speaking_topics WHERE 1=1';
    const params = [];

    if (part) {
      query += ' AND part = ?';
      params.push(part);
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
   * 删除练习记录
   * @param {number} practiceId - 练习 ID
   * @param {number} userId - 用户 ID
   */
  async deletePractice(practiceId, userId) {
    const database = await db.initializeDatabase();

    // 先获取音频文件路径
    const practice = await database.get(
      'SELECT audio_url FROM speaking_practice WHERE id = ? AND user_id = ?',
      [practiceId, userId]
    );

    if (!practice) {
      throw new Error('练习记录不存在');
    }

    // 删除音频文件
    if (practice.audio_url) {
      const audioPath = path.join(__dirname, '..', practice.audio_url);
      try {
        await fs.promises.unlink(audioPath);
      } catch (error) {
        console.error('[SpeakingService] 删除音频文件失败:', error);
      }
    }

    // 删除记录
    await database.run(
      'DELETE FROM speaking_practice WHERE id = ? AND user_id = ?',
      [practiceId, userId]
    );
  }
}

module.exports = new SpeakingService();
