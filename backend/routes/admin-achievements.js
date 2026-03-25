/**
 * 成就系统管理 API
 * 提供成就配置、统计、用户成就查看等功能
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
 * GET /api/admin/achievements - 获取成就配置列表
 */
router.get('/achievements', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 成就配置（硬编码，实际应该从配置表读取）
    const achievements = [
      { id: 1, name: '初学者', description: '学习 100 个单词', condition: 'learning_count:100', icon: '🌱' },
      { id: 2, name: '勤奋者', description: '连续学习 7 天', condition: 'continuous_days:7', icon: '🔥' },
      { id: 3, name: '词汇达人', description: '学习 1000 个单词', condition: 'learning_count:1000', icon: '📚' },
      { id: 4, name: '坚持之星', description: '连续学习 30 天', condition: 'continuous_days:30', icon: '⭐' },
      { id: 5, name: '完美主义', description: '正确率达到 95%', condition: 'accuracy:95', icon: '💯' },
      { id: 6, name: '词汇大师', description: '学习 3000 个单词', condition: 'learning_count:3000', icon: '🏆' }
    ];

    // 统计每个成就的达成人数（如果表不存在则返回 0）
    for (const achievement of achievements) {
      const count = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(DISTINCT user_id) as count FROM user_achievements WHERE achievement_id = ?',
          [achievement.id],
          (err, row) => {
            if (err) {
              // 表不存在时返回 0
              resolve(0);
            } else {
              resolve(row?.count || 0);
            }
          }
        );
      });
      achievement.achievedCount = count;
    }

    res.json({ achievements });
  } catch (error) {
    console.error('获取成就配置失败:', error);
    res.status(500).json({ error: '获取成就配置失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/achievements/stats - 成就统计
 */
router.get('/achievements/stats', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    // 总成就数
    const totalAchievements = 6;

    // 总达成次数（如果表不存在则返回 0）
    const totalAchieved = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM user_achievements', (err, row) => {
        if (err) resolve(0);
        else resolve(row?.count || 0);
      });
    });

    // 获得成就的用户数（如果表不存在则返回 0）
    const usersWithAchievements = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(DISTINCT user_id) as count FROM user_achievements', (err, row) => {
        if (err) resolve(0);
        else resolve(row?.count || 0);
      });
    });

    // 成就达成率
    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const achievementRate = totalUsers > 0 ? ((usersWithAchievements / totalUsers) * 100).toFixed(2) : 0;

    res.json({
      stats: {
        totalAchievements,
        totalAchieved,
        usersWithAchievements,
        totalUsers,
        achievementRate
      }
    });
  } catch (error) {
    console.error('获取成就统计失败:', error);
    res.status(500).json({ error: '获取成就统计失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/achievements/users/:userId - 查看用户成就
 */
router.get('/achievements/users/:userId', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { userId } = req.params;

  try {
    // 用户已获得的成就（如果表不存在则返回空数组）
    const userAchievements = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           ua.achievement_id,
           ua.achieved_at,
           a.name,
           a.description,
           a.icon
         FROM user_achievements ua
         LEFT JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = ?
         ORDER BY ua.achieved_at DESC`,
        [userId],
        (err, rows) => {
          if (err) resolve([]);
          else resolve(rows);
        }
      );
    });

    // 用户信息
    const userInfo = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, openid, role, status, created_at FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!userInfo) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      user: userInfo,
      achievements: userAchievements
    });
  } catch (error) {
    console.error('获取用户成就失败:', error);
    res.status(500).json({ error: '获取用户成就失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/achievements/trigger/:userId - 手动触发成就检测
 */
router.post('/achievements/trigger/:userId', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { userId } = req.params;
  const adminId = req.user.userId;

  try {
    // 这里简化处理，实际应该根据用户学习数据检测所有成就条件
    // 仅作为测试接口

    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_achievement_trigger', JSON.stringify({ userId })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '成就检测已触发' });
  } catch (error) {
    console.error('触发成就检测失败:', error);
    res.status(500).json({ error: '触发成就检测失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
