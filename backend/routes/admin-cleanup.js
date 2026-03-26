/**
 * 数据清理 API
 * 清理僵尸用户、无效数据等
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
 * GET /api/admin/cleanup/analysis - 数据清理分析
 */
router.get('/cleanup/analysis', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 僵尸用户（注册超过 30 天，从未学习）
    const zombieUsers = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count 
         FROM users u
         LEFT JOIN learning_records lr ON u.id = lr.user_id
         WHERE u.created_at <= datetime('now', '-30 days')
         AND lr.user_id IS NULL`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });

    // 无效学习记录（关联的单词不存在）
    const orphanedRecords = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count 
         FROM learning_records lr
         LEFT JOIN ielts_words iw ON lr.word_id = iw.id
         WHERE iw.id IS NULL`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });

    // 过期会话（超过 90 天）
    const oldSessions = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count 
         FROM review_sessions
         WHERE created_at <= datetime('now', '-90 days')`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });

    // 禁用用户数
    const bannedUsers = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as count FROM users WHERE status = 'banned'",
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });

    // 数据库大小
    const dbSize = await new Promise((resolve, reject) => {
      const fs = require('fs');
      fs.stat(dbPath, (err, stats) => {
        if (err) resolve(0);
        else resolve(stats.size);
      });
    });

    res.json({
      analysis: {
        zombieUsers,
        orphanedRecords,
        oldSessions,
        bannedUsers,
        dbSize: (dbSize / 1024 / 1024).toFixed(2) + ' MB'
      },
      recommendations: {
        cleanZombieUsers: zombieUsers > 0,
        cleanOrphanedRecords: orphanedRecords > 0,
        cleanOldSessions: oldSessions > 0
      }
    });
  } catch (error) {
    console.error('获取清理分析失败:', error);
    res.status(500).json({ error: '获取清理分析失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/cleanup/zombie-users - 清理僵尸用户
 */
router.post('/cleanup/zombie-users', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { confirm } = req.body;
  const adminId = req.user.userId;

  try {
    if (!confirm) {
      return res.status(400).json({ error: '需要确认操作' });
    }

    // 获取僵尸用户 ID 列表
    const zombieUserIds = await new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id 
         FROM users u
         LEFT JOIN learning_records lr ON u.id = lr.user_id
         WHERE u.created_at <= datetime('now', '-30 days')
         AND lr.user_id IS NULL`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => r.id));
        }
      );
    });

    if (zombieUserIds.length === 0) {
      return res.json({ success: true, deletedCount: 0, message: '没有僵尸用户' });
    }

    // 删除僵尸用户
    let deletedCount = 0;
    for (const userId of zombieUserIds) {
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
          if (err) reject(err);
          else {
            deletedCount++;
            resolve();
          }
        });
      });
    }

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_cleanup_zombie_users', JSON.stringify({ deletedCount })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ 
      success: true, 
      deletedCount,
      message: `已清理 ${deletedCount} 个僵尸用户`
    });
  } catch (error) {
    console.error('清理僵尸用户失败:', error);
    res.status(500).json({ error: '清理僵尸用户失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/cleanup/orphaned-records - 清理无效记录
 */
router.post('/cleanup/orphaned-records', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { confirm } = req.body;
  const adminId = req.user.userId;

  try {
    if (!confirm) {
      return res.status(400).json({ error: '需要确认操作' });
    }

    // 删除无效学习记录
    const result = await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM learning_records 
         WHERE word_id NOT IN (SELECT id FROM ielts_words)`,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_cleanup_orphaned_records', JSON.stringify({ deletedCount: result })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ 
      success: true, 
      deletedCount: result,
      message: `已清理 ${result} 条无效记录`
    });
  } catch (error) {
    console.error('清理无效记录失败:', error);
    res.status(500).json({ error: '清理无效记录失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/cleanup/old-sessions - 清理过期会话
 */
router.post('/cleanup/old-sessions', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { confirm, days = 90 } = req.body;
  const adminId = req.user.userId;

  try {
    if (!confirm) {
      return res.status(400).json({ error: '需要确认操作' });
    }

    // 删除过期会话
    const result = await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM review_sessions 
         WHERE created_at <= datetime('now', ?)`,
        [`-${days} days`],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_cleanup_old_sessions', JSON.stringify({ deletedCount: result, days })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ 
      success: true, 
      deletedCount: result,
      message: `已清理 ${result} 条过期会话（${days}天前）`
    });
  } catch (error) {
    console.error('清理过期会话失败:', error);
    res.status(500).json({ error: '清理过期会话失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/cleanup/vacuum - 数据库优化
 */
router.post('/cleanup/vacuum', requireAdmin, async (req, res) => {
  const db = await getDb();
  const adminId = req.user.userId;

  try {
    // 执行 VACUUM 优化数据库
    await new Promise((resolve, reject) => {
      db.run('VACUUM', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_cleanup_vacuum', JSON.stringify({ action: 'database_optimization' })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 获取优化后的大小
    const fs = require('fs');
    const dbSize = await new Promise((resolve) => {
      fs.stat(dbPath, (err, stats) => {
        if (err) resolve(0);
        else resolve(stats.size);
      });
    });

    res.json({ 
      success: true, 
      message: '数据库优化完成',
      dbSize: (dbSize / 1024 / 1024).toFixed(2) + ' MB'
    });
  } catch (error) {
    console.error('数据库优化失败:', error);
    res.status(500).json({ error: '数据库优化失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
