/**
 * 管理员 API
 * 用户管理、全局统计、数据复位等功能
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { requireAdmin } = require('./auth-middleware');

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
 * GET /api/admin/users - 获取用户列表
 */
router.get('/users', requireAdmin, async (req, res) => {
  const db = await getDb();
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const offset = (page - 1) * pageSize;

  try {
    // 获取用户总数
    const total = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 获取用户列表
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           u.id, u.openid, u.role, u.status, u.created_at, u.last_login_at, u.banned_reason,
           p.nickname, p.avatar_url,
           (SELECT COUNT(DISTINCT DATE(lr.created_at)) FROM learning_records lr WHERE lr.user_id = u.id) as studyDays,
           (SELECT COUNT(*) FROM learning_records lr WHERE lr.user_id = u.id) as totalWords
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [pageSize, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      users: users.map(u => ({
        id: u.id,
        openid: u.openid,
        nickname: u.nickname || '微信用户',
        avatar: u.avatar_url || '',
        role: u.role,
        status: u.status,
        studyDays: u.studyDays || 0,
        totalWords: u.totalWords || 0,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        bannedReason: u.banned_reason
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/stats - 获取全局统计
 */
router.get('/stats', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 总用户数
    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 活跃用户数（最近 7 天有学习记录）
    const activeUsers = await new Promise((resolve, reject) => {
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

    // 总学习记录数
    const totalLearningRecords = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM learning_records', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 总单词学习数（去重）
    const totalWordsLearned = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(DISTINCT word_id) as count FROM learning_records',
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 排行榜 Top 10
    const topUsers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           u.id,
           COALESCE(p.nickname, '微信用户') as nickname,
           (SELECT COUNT(DISTINCT DATE(lr.created_at)) FROM learning_records lr WHERE lr.user_id = u.id) as studyDays,
           (SELECT COUNT(*) FROM learning_records lr WHERE lr.user_id = u.id) as totalWords,
           (SELECT COUNT(*) FROM learning_records lr WHERE lr.user_id = u.id AND lr.action_type = 'mastered') as masteredWords
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.status = 'active'
         ORDER BY totalWords DESC
         LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      totalUsers,
      activeUsers,
      newUsersToday,
      totalLearningRecords,
      totalWordsLearned,
      topUsers
    });
  } catch (error) {
    console.error('获取全局统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/users/:id/role - 修改用户角色
 */
router.post('/users/:id/role', requireAdmin, async (req, res) => {
  const db = await getDb();
  const userId = req.params.id;
  const adminId = req.user.userId;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: '无效的角色' });
  }

  try {
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'change_role', 'user', userId, JSON.stringify({ role })],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ success: true, message: `用户角色已更新为 ${role}` });
  } catch (error) {
    console.error('修改用户角色失败:', error);
    res.status(500).json({ error: '修改角色失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/users/:id/ban - 封禁用户
 */
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  const db = await getDb();
  const userId = req.params.id;
  const adminId = req.user.userId;
  const { reason } = req.body;

  try {
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET status = ?, banned_reason = ? WHERE id = ?',
        ['banned', reason, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'ban_user', 'user', userId, JSON.stringify({ reason })],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ success: true, message: '用户已封禁' });
  } catch (error) {
    console.error('封禁用户失败:', error);
    res.status(500).json({ error: '封禁失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/users/:id/unban - 解封用户
 */
router.post('/users/:id/unban', requireAdmin, async (req, res) => {
  const db = await getDb();
  const userId = req.params.id;
  const adminId = req.user.userId;

  try {
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET status = ?, banned_reason = NULL WHERE id = ?',
        ['active', userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'unban_user', 'user', userId, null],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ success: true, message: '用户已解封' });
  } catch (error) {
    console.error('解封用户失败:', error);
    res.status(500).json({ error: '解封失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/data-reset - 管理员数据复位
 */
router.post('/data-reset', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;
  const { userIds, confirm, reason } = req.body;

  if (!confirm) {
    return res.status(400).json({ error: '需要确认复位操作' });
  }

  try {
    db.run('BEGIN TRANSACTION');

    let targetUserIds = userIds;
    
    // 如果未指定用户 ID，则复位所有用户
    if (!targetUserIds || targetUserIds.length === 0) {
      targetUserIds = await new Promise((resolve, reject) => {
        db.all('SELECT id FROM users', (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.id));
        });
      });
    }

    const resetCount = { users: 0, words: 0, records: 0, sessions: 0 };

    for (const uid of targetUserIds) {
      // 清空 user_word_progress
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM user_word_progress WHERE user_id = ?', [uid], function(err) {
          if (err) reject(err);
          else {
            resetCount.words += this.changes;
            resolve();
          }
        });
      });

      // 清空 learning_records
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM learning_records WHERE user_id = ?', [uid], function(err) {
          if (err) reject(err);
          else {
            resetCount.records += this.changes;
            resolve();
          }
        });
      });

      // 清空 review_sessions
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM review_sessions WHERE user_id = ?', [uid], function(err) {
          if (err) reject(err);
          else {
            resetCount.sessions += this.changes;
            resolve();
          }
        });
      });

      resetCount.users++;
    }

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'admin_data_reset', 'users', null, JSON.stringify({ userIds: targetUserIds, reason, resetCount })],
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
      message: `已复位 ${resetCount.users} 个用户的数据`,
      resetCount
    });
  } catch (error) {
    console.error('管理员数据复位失败:', error);
    res.status(500).json({ error: '复位失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/logs - 获取系统日志
 */
router.get('/logs', requireAdmin, async (req, res) => {
  const db = await getDb();
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const offset = (page - 1) * pageSize;

  try {
    const total = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM system_logs', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const logs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           l.*,
           COALESCE(p.nickname, '管理员') as admin_nickname
         FROM system_logs l
         LEFT JOIN user_profiles p ON l.admin_id = p.user_id
         ORDER BY l.created_at DESC
         LIMIT ? OFFSET ?`,
        [pageSize, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        adminId: l.admin_id,
        adminNickname: l.admin_nickname,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        details: l.details ? JSON.parse(l.details) : null,
        ipAddress: l.ip_address,
        createdAt: l.created_at
      })),
      total,
      page,
      pageSize
    });
  } catch (error) {
    console.error('获取系统日志失败:', error);
    res.status(500).json({ error: '获取日志失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
