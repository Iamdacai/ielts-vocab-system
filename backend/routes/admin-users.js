/**
 * 用户管理 API
 * 提供用户列表、详情、禁用/启用、学习进度查看等功能
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
 * GET /api/admin/users - 获取用户列表
 */
router.get('/users', requireAdmin, async (req, res) => {
  const db = await getDb();
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const offset = (page - 1) * pageSize;
  const { search, status } = req.query;

  try {
    // 构建查询条件
    let whereClause = '1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (u.openid LIKE ? OR p.nickname LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    // 获取用户总数
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM users u WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 获取用户列表
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           u.id,
           u.openid,
           u.role,
           u.status,
           u.created_at,
           u.last_login_at,
           p.nickname,
           p.avatar_url,
           (SELECT COUNT(DISTINCT DATE(lr.created_at)) FROM learning_records lr WHERE lr.user_id = u.id) as studyDays,
           (SELECT COUNT(*) FROM learning_records lr WHERE lr.user_id = u.id) as totalWords
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
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
        createdAt: u.created_at
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
 * GET /api/admin/users/:id - 获取用户详情
 */
router.get('/users/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const userId = req.params.id;

  try {
    // 获取用户基本信息
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
           u.*,
           p.nickname,
           p.avatar_url,
           p.created_at as profile_created_at
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

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取用户学习统计
    const stats = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           (SELECT COUNT(*) FROM learning_records WHERE user_id = ?) as totalRecords,
           (SELECT COUNT(DISTINCT word_id) FROM learning_records WHERE user_id = ?) as uniqueWords,
           (SELECT COUNT(DISTINCT DATE(created_at)) FROM learning_records WHERE user_id = ?) as studyDays,
           (SELECT COUNT(*) FROM learning_records WHERE user_id = ? AND action_type = 'mastered') as masteredWords,
           (SELECT COUNT(*) FROM mistakes WHERE user_id = ?) as mistakeCount,
           (SELECT COUNT(*) FROM user_achievements WHERE user_id = ?) as achievementCount`,
        [userId, userId, userId, userId, userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0]);
        }
      );
    });

    // 获取用户词库配置
    const libraries = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           wl.id,
           wl.name,
           uwc.is_active,
           uwc.daily_new_words,
           uwc.created_at
         FROM user_word_configs uwc
         INNER JOIN word_libraries wl ON uwc.library_id = wl.id
         WHERE uwc.user_id = ?`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname || '微信用户',
        avatar: user.avatar_url || '',
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      },
      stats: {
        totalRecords: stats.totalRecords || 0,
        uniqueWords: stats.uniqueWords || 0,
        studyDays: stats.studyDays || 0,
        masteredWords: stats.masteredWords || 0,
        mistakeCount: stats.mistakeCount || 0,
        achievementCount: stats.achievementCount || 0
      },
      libraries: libraries.map(l => ({
        id: l.id,
        name: l.name,
        isActive: l.is_active,
        dailyNewWords: l.daily_new_words,
        configAt: l.created_at
      }))
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({ error: '获取用户详情失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/users/:id/disable - 禁用用户
 */
router.post('/users/:id/disable', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;
  const userId = req.params.id;
  const { reason } = req.body;

  try {
    // 检查用户是否存在
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, openid, status FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.status === 'banned') {
      return res.status(400).json({ error: '用户已被禁用' });
    }

    // 禁用用户
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET status = ?, banned_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['banned', reason || '', userId],
        (err) => err ? reject(err) : resolve()
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

    res.json({
      success: true,
      message: '用户已禁用'
    });
  } catch (error) {
    console.error('禁用用户失败:', error);
    res.status(500).json({ error: '禁用用户失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/users/:id/enable - 启用用户
 */
router.post('/users/:id/enable', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;
  const userId = req.params.id;

  try {
    // 检查用户是否存在
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, openid, status FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.status !== 'banned') {
      return res.status(400).json({ error: '用户未被禁用' });
    }

    // 启用用户
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET status = ?, banned_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['active', userId],
        (err) => err ? reject(err) : resolve()
      );
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'unban_user', 'user', userId, JSON.stringify({})],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({
      success: true,
      message: '用户已启用'
    });
  } catch (error) {
    console.error('启用用户失败:', error);
    res.status(500).json({ error: '启用用户失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/users/:id/progress - 获取用户学习进度
 */
router.get('/users/:id/progress', requireAdmin, async (req, res) => {
  const db = await getDb();
  const userId = req.params.id;

  try {
    // 检查用户是否存在
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取用户各词库学习进度
    const progress = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           wl.id as libraryId,
           wl.name as libraryName,
           COUNT(uwp.word_id) as learnedWords,
           SUM(CASE WHEN uwp.status = 'mastered' THEN 1 ELSE 0 END) as masteredWords,
           SUM(CASE WHEN uwp.status = 'learning' THEN 1 ELSE 0 END) as learningWords,
           SUM(CASE WHEN uwp.status = 'new' THEN 1 ELSE 0 END) as newWords
         FROM word_libraries wl
         LEFT JOIN library_words lw ON wl.id = lw.library_id
         LEFT JOIN user_word_progress uwp ON lw.word_id = uwp.word_id AND uwp.user_id = ?
         WHERE wl.status = 'active'
         GROUP BY wl.id, wl.name`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      progress: progress.map(p => ({
        libraryId: p.libraryId,
        libraryName: p.libraryName,
        learnedWords: p.learnedWords || 0,
        masteredWords: p.masteredWords || 0,
        learningWords: p.learningWords || 0,
        newWords: p.newWords || 0
      }))
    });
  } catch (error) {
    console.error('获取用户学习进度失败:', error);
    res.status(500).json({ error: '获取学习进度失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
