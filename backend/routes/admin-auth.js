/**
 * 管理员认证 API
 * 提供管理员登录、登出、信息管理等功能
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { requireAdmin } = require('../auth-middleware');

const router = express.Router();
const dbPath = path.join(__dirname, '../ielts_vocab.db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

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
 * POST /api/admin/auth/login - 管理员登录
 */
router.post('/login', async (req, res) => {
  const db = await getDb();
  const { username, password, remember } = req.body;

  try {
    // 查找管理员
    const admin = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM admins WHERE username = ? AND status = ?',
        [username, 'active'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!admin) {
      return res.status(401).json({ 
        error: '用户名或密码错误',
        message: '用户名或密码错误' 
      });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        error: '用户名或密码错误',
        message: '用户名或密码错误' 
      });
    }

    // 检查登录失败次数
    if (admin.failed_attempts >= 5) {
      const lastAttempt = new Date(admin.last_failed_at);
      const now = new Date();
      const diffMinutes = (now - lastAttempt) / 60000;
      
      if (diffMinutes < 30) {
        return res.status(423).json({ 
          error: '账号已锁定',
          message: `连续登录失败次数过多，请 ${Math.ceil(30 - diffMinutes)} 分钟后再试` 
        });
      } else {
        // 重置失败次数
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE admins SET failed_attempts = 0, last_failed_at = NULL WHERE id = ?',
            [admin.id],
            (err) => err ? reject(err) : resolve()
          );
        });
      }
    }

    // 生成 JWT Token
    const expiresIn = remember ? '7d' : '24h';
    const token = jwt.sign(
      { 
        userId: admin.id, 
        username: admin.username, 
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn }
    );

    // 更新登录信息
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE admins SET last_login_at = CURRENT_TIMESTAMP, failed_attempts = 0, last_failed_at = NULL WHERE id = ?',
        [admin.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    // 记录登录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, details, ip_address)
         VALUES (?, ?, ?, ?, ?)`,
        [admin.id, 'login', 'admin', JSON.stringify({ username: admin.username }), req.ip],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        role: admin.role,
        lastLoginAt: admin.last_login_at
      }
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/auth/logout - 管理员登出
 */
router.post('/logout', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;

  try {
    // 记录登出日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, details)
         VALUES (?, ?, ?, ?)`,
        [adminId, 'logout', 'admin', JSON.stringify({})],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ success: true, message: '已登出' });
  } catch (error) {
    console.error('管理员登出失败:', error);
    res.status(500).json({ error: '登出失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/auth/me - 获取当前管理员信息
 */
router.get('/me', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;

  try {
    const admin = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, nickname, role, status, last_login_at, created_at FROM admins WHERE id = ?',
        [adminId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        role: admin.role,
        status: admin.status,
        lastLoginAt: admin.last_login_at,
        createdAt: admin.created_at
      }
    });
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    res.status(500).json({ error: '获取信息失败' });
  } finally {
    db.close();
  }
});

/**
 * PUT /api/admin/auth/password - 修改密码
 */
router.put('/password', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请提供旧密码和新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '密码长度至少 6 位' });
  }

  try {
    // 验证旧密码
    const admin = await new Promise((resolve, reject) => {
      db.get('SELECT password_hash FROM admins WHERE id = ?', [adminId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const validPassword = await bcrypt.compare(oldPassword, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    // 加密新密码
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, adminId],
        (err) => err ? reject(err) : resolve()
      );
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system_logs (admin_id, action, target_type, details)
         VALUES (?, ?, ?, ?)`,
        [adminId, 'change_password', 'admin', JSON.stringify({})],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.json({ success: true, message: '密码已修改' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
