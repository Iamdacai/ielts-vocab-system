/**
 * 系统配置 API
 * 提供系统参数配置管理功能
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
 * GET /api/admin/config - 获取系统配置
 */
router.get('/config', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 学习配置
    const config = {
      learning: {
        defaultDailyNewWords: 20,
        defaultReviewTime: '20:00',
        maxSessionWords: 100,
        minSessionWords: 10
      },
      reminder: {
        enabled: true,
        defaultTime: '20:00',
        maxRemindersPerDay: 3
      },
      system: {
        maintenanceMode: false,
        allowRegistration: true,
        maxUsersPerWordbook: 1000
      }
    };

    res.json({ config });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ error: '获取系统配置失败' });
  } finally {
    db.close();
  }
});

/**
 * PUT /api/admin/config - 更新系统配置
 */
router.put('/config', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { learning, reminder, system } = req.body;

  try {
    const adminId = req.user.userId;

    // 记录配置变更日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_config_update', JSON.stringify({ learning, reminder, system })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '配置已更新' });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({ error: '更新系统配置失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
