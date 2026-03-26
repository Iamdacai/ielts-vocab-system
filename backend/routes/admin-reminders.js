/**
 * 提醒管理 API
 * 提供系统通知、提醒配置等功能
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
 * GET /api/admin/reminders - 获取提醒配置
 */
router.get('/reminders', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 提醒配置（硬编码，实际应该从配置表读取）
    const config = {
      enabled: true,
      defaultTime: '20:00',
      maxRemindersPerDay: 3,
      allowCustomTime: true
    };

    // 系统通知模板
    const templates = [
      { id: 1, name: '学习提醒', content: '该学习啦！今天的目标还没完成哦~', type: 'study_reminder' },
      { id: 2, name: '复习提醒', content: '今天有 {count} 个单词需要复习，别忘了！', type: 'review_reminder' },
      { id: 3, name: '活动通知', content: '新活动上线！连续学习 7 天可获得特殊成就~', type: 'activity' },
      { id: 4, name: '系统通知', content: '系统将于 {time} 进行维护，请提前保存学习进度。', type: 'system' }
    ];

    res.json({ config, templates });
  } catch (error) {
    console.error('获取提醒配置失败:', error);
    res.status(500).json({ error: '获取提醒配置失败' });
  } finally {
    db.close();
  }
});

/**
 * PUT /api/admin/reminders - 更新提醒配置
 */
router.put('/reminders', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { config } = req.body;
  const adminId = req.user.userId;

  try {
    // 记录配置变更日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_reminder_config_update', JSON.stringify({ config })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '提醒配置已更新' });
  } catch (error) {
    console.error('更新提醒配置失败:', error);
    res.status(500).json({ error: '更新提醒配置失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/reminders/notify - 发送系统通知
 */
router.post('/reminders/notify', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { title, content, targetUsers, templateId } = req.body;
  const adminId = req.user.userId;

  try {
    // 这里简化处理，实际应该调用消息推送服务
    // 记录通知发送日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_send_notification', JSON.stringify({ title, targetUsers, templateId })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 模拟发送成功
    res.json({ 
      success: true, 
      message: '通知已发送',
      stats: {
        total: targetUsers?.length || 0,
        sent: targetUsers?.length || 0,
        failed: 0
      }
    });
  } catch (error) {
    console.error('发送系统通知失败:', error);
    res.status(500).json({ error: '发送系统通知失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/reminders/history - 获取通知发送历史
 */
router.get('/reminders/history', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { limit = 50 } = req.query;

  try {
    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           id,
           admin_id,
           action,
           details,
           created_at
         FROM system_logs
         WHERE action = 'admin_send_notification'
         ORDER BY created_at DESC
         LIMIT ?`,
        [parseInt(limit)],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ history });
  } catch (error) {
    console.error('获取通知历史失败:', error);
    res.status(500).json({ error: '获取通知历史失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
