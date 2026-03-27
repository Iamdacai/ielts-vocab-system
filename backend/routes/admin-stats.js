/**
 * 统计分析 API
 * 提供数据概览、用户分析、词库分析、错题分析等功能
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { requireAdmin } = require('../auth-middleware');

const router = express.Router();
const dbPath = path.join(__dirname, '../ielts_vocab.db');

/**
 * 获取数据库连接
 */
function getDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

/**
 * GET /api/admin/stats/overview - 数据概览
 */
router.get('/overview', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 总用户数
    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 活跃用户数（最近 7 天）
    const activeUsers7d = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT user_id) as count 
         FROM learning_records 
         WHERE created_at >= datetime('now', '-7 days')`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 活跃用户数（最近 30 天）
    const activeUsers30d = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT user_id) as count 
         FROM learning_records 
         WHERE created_at >= datetime('now', '-30 days')`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 今日新增用户
    const newUsersToday = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')",
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 今日学习人次
    const studySessionsToday = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as count FROM learning_records WHERE DATE(created_at) = DATE('now')",
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 总学习记录数
    const totalLearningRecords = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM learning_records', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 总词库数（基于 category 去重）
    const totalWordbooks = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(DISTINCT category) as count FROM ielts_words WHERE category IS NOT NULL AND category != ''", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 总单词数
    const totalWords = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM ielts_words', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    res.json({
      overview: {
        totalUsers,
        activeUsers7d,
        activeUsers30d,
        newUsersToday,
        studySessionsToday,
        totalLearningRecords,
        totalWordbooks,
        totalWords
      },
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取数据概览失败:', error);
    res.status(500).json({ error: '获取数据概览失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/stats/trends - 趋势数据
 */
router.get('/trends', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { days = '7' } = req.query;
  const dayCount = parseInt(days);

  try {
    // 用户增长趋势
    const userTrend = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DATE(created_at) as date, COUNT(*) as count 
         FROM users 
         WHERE created_at >= datetime('now', '-${dayCount} days')
         GROUP BY DATE(created_at)
         ORDER BY date`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // 学习趋势
    const studyTrend = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DATE(created_at) as date, COUNT(*) as count 
         FROM learning_records 
         WHERE created_at >= datetime('now', '-${dayCount} days')
         GROUP BY DATE(created_at)
         ORDER BY date`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      trends: {
        userGrowth: userTrend.map(t => ({ date: t.date, count: t.count })),
        studyActivity: studyTrend.map(t => ({ date: t.date, count: t.count }))
      }
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({ error: '获取趋势数据失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/stats/wordbooks - 词库分析
 */
router.get('/wordbooks', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 词库使用统计
    // 使用 ielts_words 的 category 作为词库统计
    const wordbookStats = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           category as id,
           category as name,
           COUNT(*) as word_count,
           (SELECT COUNT(DISTINCT uwc.user_id) FROM user_configs uwc 
            WHERE uwc.vocab_category = category) as activeUsers,
           (SELECT COUNT(DISTINCT uwp.user_id) FROM user_word_progress uwp
            INNER JOIN ielts_words iw ON uwp.word_id = iw.id
            WHERE iw.category = category) as learningUsers,
           (SELECT COUNT(*) FROM learning_records lr
            INNER JOIN ielts_words iw ON lr.word_id = iw.id
            WHERE iw.category = category) as totalLearning
         FROM ielts_words
         WHERE category IS NOT NULL AND category != ''
         GROUP BY category
         ORDER BY activeUsers DESC
         LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      wordbooks: wordbookStats.map(w => ({
        id: w.id,
        name: w.name,
        word_count: w.word_count || 0,
        learner_count: w.learningUsers || 0,
        total_reviews: w.totalLearning || 0,
        avg_mastery: 65 // 临时值，后续可从 user_word_progress 计算
      }))
    });
  } catch (error) {
    console.error('获取词库分析失败:', error);
    res.status(500).json({ error: '获取词库分析失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/stats/mistakes - 错题分析
 */
router.get('/mistakes', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { limit = '50' } = req.query;
  const limitCount = parseInt(limit);

  try {
    // 高频错题 TOP50（基于 user_word_progress 中 mastery_score < 60 的单词）
    const topMistakes = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           iw.id,
           iw.word,
           iw.phonetic,
           iw.definition,
           iw.category,
           COUNT(uwp.user_id) as userCount,
           AVG(uwp.mastery_score) as avgMastery
         FROM user_word_progress uwp
         INNER JOIN ielts_words iw ON uwp.word_id = iw.id
         WHERE uwp.mastery_score < 60
         GROUP BY iw.id
         ORDER BY userCount DESC
         LIMIT ?`,
        [limitCount],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => ({
            id: r.id,
            word: r.word,
            phonetic: r.phonetic,
            definition: r.definition,
            category: r.category,
            userCount: r.userCount,
            mistakeCount: r.userCount,
            avgMastery: r.avgMastery
          })));
        }
      );
    });

    // 错题趋势（最近 7 天学习但掌握度低的记录）
    const mistakeTrend = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DATE(lr.created_at) as date, COUNT(*) as count 
         FROM learning_records lr
         INNER JOIN user_word_progress uwp ON lr.word_id = uwp.word_id
         WHERE lr.created_at >= datetime('now', '-7 days')
         AND uwp.mastery_score < 60
         GROUP BY DATE(lr.created_at)
         ORDER BY date`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      mistakes: {
        topMistakes: topMistakes.map(m => ({
          word: m.word,
          phonetic: m.phonetic || '',
          error_count: m.userCount,
          error_rate: 100 - (m.avgMastery || 50) // 错误率 = 100 - 掌握率
        })),
        trend: mistakeTrend.map(t => ({ date: t.date, count: t.count }))
      }
    });
  } catch (error) {
    console.error('获取错题分析失败:', error);
    res.status(500).json({ error: '获取错题分析失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/stats/users - 用户分析
 */
router.get('/users', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 用户学习时长分布
    const studyTimeDistribution = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           CASE 
             WHEN duration < 300 THEN '< 5 分钟'
             WHEN duration < 600 THEN '5-10 分钟'
             WHEN duration < 1800 THEN '10-30 分钟'
             WHEN duration < 3600 THEN '30-60 分钟'
             ELSE '> 60 分钟'
           END as range,
           COUNT(*) as count
         FROM learning_sessions
         WHERE duration > 0
         GROUP BY range`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // 用户留存率
    const retention = await new Promise((resolve, reject) => {
      // 次日留存
      db.get(
        `SELECT 
           COUNT(DISTINCT u1.id) as totalUsers,
           COUNT(DISTINCT u2.id) as retainedUsers
         FROM users u1
         LEFT JOIN users u2 ON u1.id = u2.id
           AND DATE(u2.created_at) = DATE(u1.created_at, '+1 day')
         WHERE DATE(u1.created_at) >= DATE('now', '-30 days')`,
        (err, row) => {
          if (err) reject(err);
          else resolve({
            day1: row.totalUsers > 0 ? ((row.retainedUsers || 0) / row.totalUsers * 100).toFixed(2) : 0
          });
        }
      );
    });

    res.json({
      users: {
        studyTimeDistribution,
        retention
      }
    });
  } catch (error) {
    console.error('获取用户分析失败:', error);
    res.status(500).json({ error: '获取用户分析失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
