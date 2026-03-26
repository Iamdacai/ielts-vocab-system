/**
 * 后台管理 - 系统通知管理
 * 用于管理和发送系统通知给用户
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'ielts_vocab.db');

/**
 * 获取数据库连接
 */
function getDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

/**
 * GET /api/admin/notifications/templates
 * 获取通知模板列表
 */
router.get('/templates', authenticateToken, requireAdmin, async (req, res) => {
  const db = await getDb();
  
  try {
    // 预定义的通知模板
    const templates = [
      {
        id: 'library_update',
        title: '🎉 词库已更新',
        content: '词库列表已升级，请重新选择你想学习的词库（支持多选）',
        type: 'system',
        category: '功能更新'
      },
      {
        id: 'maintenance',
        title: '🔧 系统维护通知',
        content: '系统将于今晚 23:00-24:00 进行维护，请提前保存学习进度',
        type: 'maintenance',
        category: '系统维护'
      },
      {
        id: 'new_feature',
        title: '✨ 新功能上线',
        content: '我们新增了 XXX 功能，快去体验吧！',
        type: 'feature',
        category: '功能更新'
      }
    ];
    
    res.json({ templates });
  } catch (error) {
    console.error('获取通知模板失败:', error);
    res.status(500).json({ error: '获取模板失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/notifications/history
 * 获取通知发送历史
 */
router.get('/history', authenticateToken, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    // 创建通知历史表（如果不存在）
    await db.run(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'system',
        target_users TEXT DEFAULT 'all',
        sent_by TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        recipient_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'sent'
      )
    `);
    
    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT ? OFFSET ?`,
        [parseInt(limit), offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM notification_history`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
    
    res.json({
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取通知历史失败:', error);
    res.status(500).json({ error: '获取历史失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/notifications/send
 * 发送系统通知
 */
router.post('/send', authenticateToken, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { title, content, type = 'system', target_users = 'all', template_id } = req.body;
  
  try {
    // 验证参数
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    
    // 创建通知历史表（如果不存在）
    await db.run(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'system',
        target_users TEXT DEFAULT 'all',
        sent_by TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        recipient_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'sent'
      )
    `);
    
    // 获取管理员信息
    const admin = req.user;
    
    // 计算接收用户数量
    let recipientCount = 0;
    if (target_users === 'all') {
      const result = await new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM users WHERE status = 'active'`, [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      recipientCount = result.count;
    }
    
    // 保存通知记录
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO notification_history (title, content, type, target_users, sent_by, recipient_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, content, type, target_users, admin?.username || 'admin', recipientCount],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
    
    // TODO: 实际发送通知（可以通过微信模板消息、推送服务等）
    // 这里先记录日志
    console.log(`[通知发送] 标题：${title}, 类型：${type}, 目标用户：${target_users}, 预计接收人数：${recipientCount}`);
    
    res.json({
      success: true,
      message: '通知已发送',
      data: {
        recipient_count: recipientCount,
        sent_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('发送通知失败:', error);
    res.status(500).json({ error: '发送通知失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/notifications/reset-flag
 * 重置用户的通知标记（让用户再次看到提示）
 */
router.post('/reset-flag', authenticateToken, requireAdmin, async (req, res) => {
  const db = await getDb();
  const { user_id, flag_name } = req.body;
  
  try {
    if (!flag_name) {
      return res.status(400).json({ error: '请指定要重置的标记名称' });
    }
    
    // 这里可以添加逻辑到用户表或配置表
    // 由于小程序的标记存储在本地存储，需要通过用户下次登录时同步
    
    // 创建用户标记表（如果不存在）
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_flags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        flag_name TEXT NOT NULL,
        flag_value INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, flag_name)
      )
    `);
    
    if (user_id) {
      // 重置指定用户的标记
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO user_flags (user_id, flag_name, flag_value, updated_at)
           VALUES (?, ?, 0, CURRENT_TIMESTAMP)`,
          [user_id, flag_name],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      res.json({
        success: true,
        message: `已重置用户 ${user_id} 的标记 ${flag_name}`
      });
    } else {
      // 重置所有用户的标记
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO user_flags (user_id, flag_name, flag_value, updated_at)
           SELECT open_id, ?, 0, CURRENT_TIMESTAMP FROM users`,
          [flag_name],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      res.json({
        success: true,
        message: `已重置所有用户的标记 ${flag_name}`
      });
    }
  } catch (error) {
    console.error('重置标记失败:', error);
    res.status(500).json({ error: '重置标记失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/notifications/stats
 * 获取通知统计
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  const db = await getDb();
  
  try {
    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as total_sent,
          SUM(recipient_count) as total_recipients
         FROM notification_history`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    res.json({
      stats: {
        total_sent: stats.total_sent || 0,
        total_recipients: stats.total_recipients || 0
      }
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
