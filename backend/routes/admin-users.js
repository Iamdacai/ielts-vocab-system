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
router.get('/', requireAdmin, async (req, res) => {
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
           p.phone,
           p.email,
           p.city,
           p.province,
           p.country,
           p.gender,
           p.wx_unionid,
           p.first_login_at,
           (SELECT COUNT(DISTINCT DATE(lr.created_at)) FROM learning_records lr WHERE lr.user_id = u.id) as studyDays,
           (SELECT COUNT(*) FROM learning_records lr WHERE lr.user_id = u.id) as totalWords,
           (SELECT COUNT(DISTINCT DATE(lr.created_at)) FROM learning_records lr WHERE lr.user_id = u.id AND lr.created_at >= datetime('now', '-7 days')) as studyDays7,
           (SELECT COUNT(DISTINCT DATE(lr.created_at)) FROM learning_records lr WHERE lr.user_id = u.id AND lr.created_at >= datetime('now', '-30 days')) as studyDays30
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
        unionid: u.wx_unionid,
        nickname: u.nickname || '微信用户',
        avatar: u.avatar_url || '/default-avatar.png',
        phone: u.phone || '-',
        email: u.email || '-',
        city: u.city || '-',
        province: u.province || '-',
        country: u.country || '-',
        gender: u.gender || 0,
        role: u.role,
        status: u.status,
        studyDays: u.studyDays || 0,
        studyDays7: u.studyDays7 || 0,
        studyDays30: u.studyDays30 || 0,
        totalWords: u.totalWords || 0,
        lastLoginAt: u.last_login_at,
        firstLoginAt: u.first_login_at,
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
router.get('/:id', requireAdmin, async (req, res) => {
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
router.post('/:id/disable', requireAdmin, async (req, res) => {
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
router.post('/:id/enable', requireAdmin, async (req, res) => {
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
 * PUT /api/admin/users/:id/status - 更新用户状态（禁用/启用）
 */
router.put('/:id/status', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;
  const userId = req.params.id;
  const { status } = req.body;

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

    // 更新用户状态
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, userId],
        (err) => err ? reject(err) : resolve()
      );
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'user_status_update', 'user', userId, JSON.stringify({ status })],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({
      success: true,
      message: status === 'banned' ? '用户已禁用' : '用户已启用'
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({ error: '更新用户状态失败' });
  } finally {
    db.close();
  }
});

/**
 * PUT /api/admin/users/:id/profile - 更新用户资料（管理员）
 */
router.put('/:id/profile', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;
  const userId = req.params.id;
  const { nickname, phone, email, avatar_url, gender, city, province, country } = req.body;

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

    // 验证必填字段
    if (!nickname || nickname.trim() === '') {
      return res.status(400).json({ error: '昵称为必填项' });
    }

    // 更新用户资料
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_profiles SET 
           nickname = ?, 
           phone = ?, 
           email = ?, 
           avatar_url = ?, 
           gender = ?, 
           city = ?, 
           province = ?, 
           country = ?,
           last_login_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [nickname, phone, email, avatar_url, gender, city, province, country, userId],
        function(err) {
          if (err) {
            // 如果没有记录，插入新记录
            if (err.message.includes('no such table') || this.changes === 0) {
              db.run(
                `INSERT INTO user_profiles (user_id, nickname, phone, email, avatar_url, gender, city, province, country)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, nickname, phone, email, avatar_url, gender, city, province, country],
                (err2) => err2 ? reject(err2) : resolve()
              );
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        }
      );
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, target_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'user_profile_update', 'user', userId, JSON.stringify({ nickname, phone, email })],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({
      success: true,
      message: '用户资料已更新'
    });
  } catch (error) {
    console.error('更新用户资料失败:', error);
    res.status(500).json({ error: '更新用户资料失败', message: error.message });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/users/:id/progress - 获取用户学习进度
 */
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

/**
 * GET /api/admin/users/default-avatar - 获取默认头像（根据用户 ID 生成）
 */
router.get('/default-avatar', async (req, res) => {
  const { userId, seed } = req.query;
  
  // 使用 DiceBear API 生成默认头像
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed || userId || 'default'}`;
  
  res.redirect(avatarUrl);
});

/**
 * POST /api/admin/users/:id/sync-wechat - 同步微信用户信息
 */
router.post('/:id/sync-wechat', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;
  const userId = req.params.id;

  try {
    // 获取用户 openid
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT openid FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 这里可以调用微信 API 获取用户信息
    // 由于需要 access_token，暂时返回提示
    res.json({
      success: true,
      message: '微信信息同步功能需要配置微信 API，当前使用本地编辑',
      openid: user.openid
    });
  } catch (error) {
    console.error('同步微信信息失败:', error);
    res.status(500).json({ error: '同步微信信息失败', message: error.message });
  } finally {
    db.close();
  }
});

module.exports = router;
