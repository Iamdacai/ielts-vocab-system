/**
 * 用户学习轨迹 API
 * 提供用户学习历史、进度详情等功能
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
 * GET /api/admin/users/:userId/learning-history - 获取用户学习轨迹
 */
router.get('/users/:userId/learning-history', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { userId } = req.params;
  const { days = 30 } = req.query;

  try {
    // 检查用户是否存在
    const userExists = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });

    if (!userExists) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取学习历史（按天统计）
    const learningHistory = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as wordCount,
           COUNT(DISTINCT word_id) as uniqueWords,
           AVG(response_time) as avgResponseTime,
           SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as accuracy
         FROM learning_records
         WHERE user_id = ? AND DATE(created_at) >= DATE('now', ?)
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
        [userId, `-${days} days`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // 获取用户基本信息
    const userInfo = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
           u.id,
           u.openid,
           u.role,
           u.status,
           u.created_at,
           p.nickname,
           p.avatar_url,
           (SELECT COUNT(*) FROM learning_records WHERE user_id = u.id) as totalLearning,
           (SELECT COUNT(DISTINCT DATE(created_at)) FROM learning_records WHERE user_id = u.id) as studyDays
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = ?`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // 获取词库分布
    const libraryDistribution = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           iw.category,
           COUNT(*) as wordCount,
           AVG(uwp.mastery_score) as avgMastery
         FROM user_word_progress uwp
         INNER JOIN ielts_words iw ON uwp.word_id = iw.id
         WHERE uwp.user_id = ? AND iw.category IS NOT NULL
         GROUP BY iw.category
         ORDER BY wordCount DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      user: userInfo,
      learningHistory,
      libraryDistribution,
      stats: {
        totalDays: learningHistory.length,
        avgWordsPerDay: learningHistory.reduce((sum, d) => sum + d.wordCount, 0) / (learningHistory.length || 1),
        avgAccuracy: learningHistory.reduce((sum, d) => sum + (d.accuracy || 0), 0) / (learningHistory.length || 1)
      }
    });
  } catch (error) {
    console.error('获取用户学习轨迹失败:', error);
    res.status(500).json({ error: '获取用户学习轨迹失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/users/:userId/sessions - 获取用户学习会话
 */
router.get('/users/:userId/sessions', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { userId } = req.params;
  const { limit = 20 } = req.query;

  try {
    const sessions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           rs.id,
           rs.user_id,
           rs.word_count,
           rs.new_words_count,
           rs.review_words_count,
           rs.accuracy,
           rs.duration,
           rs.completed_at,
           rs.created_at
         FROM review_sessions rs
         WHERE rs.user_id = ?
         ORDER BY rs.created_at DESC
         LIMIT ?`,
        [userId, parseInt(limit)],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ sessions });
  } catch (error) {
    console.error('获取用户会话失败:', error);
    res.status(500).json({ error: '获取用户会话失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
