/**
 * 异常检测 API
 * 检测异常学习行为（刷课、作弊等）
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
 * GET /api/admin/anomaly/detection - 异常检测报告
 */
router.get('/anomaly/detection', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { days = 7 } = req.query;

  try {
    // 异常检测规则
    const anomalies = {
      // 1. 超快学习速度（每小时超过 100 个单词）
      superFastLearning: await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
             u.id as userId,
             p.nickname,
             u.openid,
             DATE(lr.created_at) as date,
             strftime('%H', lr.created_at) as hour,
             COUNT(*) as wordsPerHour
           FROM learning_records lr
           INNER JOIN users u ON lr.user_id = u.id
           LEFT JOIN user_profiles p ON u.id = p.user_id
           WHERE lr.created_at >= datetime('now', ?)
           GROUP BY u.id, DATE(lr.created_at), strftime('%H', lr.created_at)
           HAVING COUNT(*) > 100
           ORDER BY wordsPerHour DESC
           LIMIT 50`,
          [`-${days} days`],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      }),

      // 2. 100% 正确率持续异常（连续 50 题以上）
      perfectAccuracy: await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
             u.id as userId,
             p.nickname,
             u.openid,
             COUNT(*) as consecutiveCorrect,
             MIN(lr.created_at) as startTime
           FROM learning_records lr
           INNER JOIN users u ON lr.user_id = u.id
           LEFT JOIN user_profiles p ON u.id = p.user_id
           WHERE lr.is_correct = 1 AND lr.created_at >= datetime('now', ?)
           GROUP BY u.id
           HAVING COUNT(*) >= 50
           ORDER BY consecutiveCorrect DESC
           LIMIT 50`,
          [`-${days} days`],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      }),

      // 3. 24 小时不间断学习
      nonStopLearning: await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
             u.id as userId,
             p.nickname,
             u.openid,
             COUNT(DISTINCT strftime('%H', created_at)) as activeHours,
             DATE(lr.created_at) as date
           FROM learning_records lr
           INNER JOIN users u ON lr.user_id = u.id
           LEFT JOIN user_profiles p ON u.id = p.user_id
           WHERE lr.created_at >= datetime('now', ?)
           GROUP BY u.id, DATE(lr.created_at)
           HAVING COUNT(DISTINCT strftime('%H', created_at)) >= 20
           ORDER BY activeHours DESC
           LIMIT 50`,
          [`-${days} days`],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      }),

      // 4. 响应时间异常（平均响应时间 < 1 秒）
      superFastResponse: await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
             u.id as userId,
             p.nickname,
             u.openid,
             AVG(lr.response_time) as avgResponseTime,
             COUNT(*) as totalQuestions
           FROM learning_records lr
           INNER JOIN users u ON lr.user_id = u.id
           LEFT JOIN user_profiles p ON u.id = p.user_id
           WHERE lr.response_time IS NOT NULL AND lr.created_at >= datetime('now', ?)
           GROUP BY u.id
           HAVING AVG(lr.response_time) < 1.0 AND COUNT(*) >= 20
           ORDER BY avgResponseTime ASC
           LIMIT 50`,
          [`-${days} days`],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      })
    };

    // 统计异常总数
    const totalAnomalies = 
      anomalies.superFastLearning.length +
      anomalies.perfectAccuracy.length +
      anomalies.nonStopLearning.length +
      anomalies.superFastResponse.length;

    res.json({
      anomalies,
      summary: {
        totalAnomalies,
        superFastLearning: anomalies.superFastLearning.length,
        perfectAccuracy: anomalies.perfectAccuracy.length,
        nonStopLearning: anomalies.nonStopLearning.length,
        superFastResponse: anomalies.superFastResponse.length
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('生成异常检测报告失败:', error);
    res.status(500).json({ error: '生成异常检测报告失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/anomaly/users/:userId - 查看用户详细行为分析
 */
router.get('/anomaly/users/:userId', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { userId } = req.params;

  try {
    // 用户学习行为分析
    const analysis = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as wordCount,
           AVG(response_time) as avgResponseTime,
           SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as accuracy,
           COUNT(DISTINCT strftime('%H', created_at)) as activeHours
         FROM learning_records
         WHERE user_id = ?
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
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

    // 风险评估
    let riskScore = 0;
    const riskFactors = [];

    if (analysis.some(d => d.wordCount > 200)) {
      riskScore += 30;
      riskFactors.push('单日学习量过大');
    }

    if (analysis.some(d => d.avgResponseTime < 1.0)) {
      riskScore += 40;
      riskFactors.push('响应时间过短');
    }

    if (analysis.some(d => d.accuracy === 100 && d.wordCount > 50)) {
      riskScore += 30;
      riskFactors.push('异常高正确率');
    }

    if (analysis.some(d => d.activeHours >= 20)) {
      riskScore += 50;
      riskFactors.push('活跃时间异常');
    }

    res.json({
      user: userInfo,
      analysis,
      riskAssessment: {
        score: riskScore,
        level: riskScore >= 80 ? '高风险' : riskScore >= 50 ? '中风险' : '低风险',
        factors: riskFactors
      }
    });
  } catch (error) {
    console.error('获取用户行为分析失败:', error);
    res.status(500).json({ error: '获取用户行为分析失败' });
  } finally {
    db.close();
  }
});

/**
 * POST /api/admin/anomaly/flag/:userId - 标记用户为异常
 */
router.post('/anomaly/flag/:userId', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { userId } = req.params;
  const { reason, action } = req.body; // action: 'warning', 'suspend', 'ban'
  const adminId = req.user.userId;

  try {
    // 记录日志
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_anomaly_flag', JSON.stringify({ userId, reason, action })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 如果选择封禁，更新用户状态
    if (action === 'ban') {
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE users SET status = 'banned' WHERE id = ?",
          [userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({ 
      success: true, 
      message: `用户已标记为${action === 'ban' ? '封禁' : action === 'suspend' ? '暂停' : '警告'}`
    });
  } catch (error) {
    console.error('标记用户失败:', error);
    res.status(500).json({ error: '标记用户失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
