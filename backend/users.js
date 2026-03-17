/**
 * 用户管理 API
 * 处理用户信息、学习进度复位等功能
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { authenticateToken } = require('./auth-middleware');
const { updateUserProfile, isAdmin } = require('./auth-wechat');

const router = express.Router();
const dbPath = path.join(__dirname, 'scripts', 'ielts_vocab.db');

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
 * GET /api/users/profile - 获取用户个人信息
 */
router.get('/profile', authenticateToken, async (req, res) => {
  const db = await getDb();
  const userId = req.user.userId;

  try {
    // 获取用户基本信息
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, openid, role, status, created_at, last_login_at FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取用户 profile
    const profile = await new Promise((resolve) => {
      db.get(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId],
        (err, row) => resolve(row || {})
      );
    });

    // 获取学习统计
    const stats = await new Promise((resolve) => {
      db.get(
        `SELECT 
           COUNT(DISTINCT DATE(created_at)) as studyDays,
           COUNT(*) as totalLearned,
           SUM(CASE WHEN action_type = 'mastered' THEN 1 ELSE 0 END) as masteredCount
         FROM learning_records 
         WHERE user_id = ?`,
        [userId],
        (err, row) => resolve(row || { studyDays: 0, totalLearned: 0, masteredCount: 0 })
      );
    });

    // 获取连续学习天数
    const streakDays = await calculateStreak(db, userId);

    res.json({
      user: {
        id: user.id,
        role: user.role,
        nickname: profile.nickname || '微信用户',
        avatar: profile.avatar_url || '',
        gender: profile.gender || 0,
        city: profile.city,
        province: profile.province,
        country: profile.country
      },
      stats: {
        studyDays: stats.studyDays,
        totalLearned: stats.totalLearned,
        masteredWords: stats.masteredCount || 0,
        streakDays
      },
      config: await getUserConfig(db, userId)
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '服务器错误' });
  } finally {
    db.close();
  }
});

/**
 * PUT /api/users/profile - 更新用户个人信息
 */
router.put('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { nickname, avatarUrl, gender, city, province, country } = req.body;

  try {
    await updateUserProfile(userId, {
      nickname,
      avatarUrl,
      gender,
      city,
      province,
      country
    });

    res.json({ success: true, message: '个人信息更新成功' });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * POST /api/users/reset-progress - 复位学习进度
 */
router.post('/reset-progress', authenticateToken, async (req, res) => {
  const db = await getDb();
  const userId = req.user.userId;
  const { confirm, reason } = req.body;

  if (!confirm) {
    return res.status(400).json({ error: '需要确认复位操作' });
  }

  try {
    db.run('BEGIN TRANSACTION');

    const resetCount = {};

    // 1. 清空 user_word_progress
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_word_progress WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else {
            resetCount.words = this.changes;
            resolve();
          }
        }
      );
    });

    // 2. 清空 learning_records
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM learning_records WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else {
            resetCount.records = this.changes;
            resolve();
          }
        }
      );
    });

    // 3. 清空 review_sessions
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM review_sessions WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else {
            resetCount.sessions = this.changes;
            resolve();
          }
        }
      );
    });

    // 4. 清空 pronunciation_records
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM pronunciation_records WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 5. 记录系统日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, 'reset_progress', 'user', userId, JSON.stringify({ reason, resetCount })],
        (err) => err ? reject(err) : resolve()
      );
    });

    db.run('COMMIT', (err) => {
      if (err) {
        db.run('ROLLBACK');
        throw err;
      }
    });

    res.json({
      success: true,
      message: '学习进度已复位',
      resetCount
    });
  } catch (error) {
    console.error('复位学习进度失败:', error);
    res.status(500).json({ error: '复位失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/users/config - 获取用户配置
 */
router.get('/config', authenticateToken, async (req, res) => {
  const db = await getDb();
  const userId = req.user.userId;

  try {
    const config = await getUserConfig(db, userId);
    res.json(config);
  } catch (error) {
    console.error('获取用户配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  } finally {
    db.close();
  }
});

/**
 * PUT /api/users/config - 更新用户配置
 */
router.put('/config', authenticateToken, async (req, res) => {
  const db = await getDb();
  const userId = req.user.userId;
  const { weeklyNewWordsDays, dailyNewWordsCount, reviewTime } = req.body;

  try {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO user_configs 
         (user_id, weekly_new_words_days, daily_new_words_count, review_time, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, weeklyNewWordsDays, dailyNewWordsCount, reviewTime],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ success: true, message: '配置更新成功' });
  } catch (error) {
    console.error('更新用户配置失败:', error);
    res.status(500).json({ error: '更新配置失败' });
  } finally {
    db.close();
  }
});

/**
 * 辅助函数：获取用户配置
 */
async function getUserConfig(db, userId) {
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM user_configs WHERE user_id = ?',
      [userId],
      (err, row) => {
        resolve(row || {
          weekly_new_words_days: '[1,2,3,4,5,6,7]',
          daily_new_words_count: 20,
          review_time: '20:00'
        });
      }
    );
  });
}

/**
 * 辅助函数：计算连续学习天数
 */
async function calculateStreak(db, userId) {
  return new Promise((resolve) => {
    db.all(
      'SELECT DISTINCT DATE(created_at) as date FROM learning_records WHERE user_id = ? ORDER BY date DESC',
      [userId],
      (err, rows) => {
        if (!rows || rows.length === 0) {
          resolve(0);
          return;
        }

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        let expectedDate = new Date(today);

        for (const row of rows) {
          const recordDate = new Date(row.date);
          const diffDays = Math.floor((expectedDate - recordDate) / (1000 * 60 * 60 * 24));

          if (diffDays === 0 || diffDays === 1) {
            streak++;
            expectedDate = recordDate;
          } else {
            break;
          }
        }

        resolve(streak);
      }
    );
  });
}

module.exports = router;
