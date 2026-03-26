/**
 * 数据导出 API
 * 提供用户数据、学习记录、词库数据等导出功能
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { requireAdmin } = require('../auth-middleware');

const router = express.Router();
const dbPath = path.join(__dirname, '../ielts_vocab.db');
const exportDir = path.join(__dirname, '../exports');

// 确保导出目录存在
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

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
 * GET /api/admin/export/users - 导出用户数据
 */
router.get('/export/users', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { format = 'excel' } = req.query;

  try {
    // 获取用户数据
    const users = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          u.id,
          u.openid,
          u.role,
          u.status,
          u.created_at as createdAt,
          u.last_login_at as lastLoginAt,
          p.nickname,
          p.avatar_url as avatarUrl,
          (SELECT COUNT(*) FROM learning_records WHERE user_id = u.id) as totalLearning,
          (SELECT COUNT(DISTINCT DATE(created_at)) FROM learning_records WHERE user_id = u.id) as studyDays
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        ORDER BY u.created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (format === 'csv') {
      // CSV 格式
      const csv = [
        ['ID', 'OpenID', '昵称', '角色', '状态', '注册时间', '最后登录', '学习次数', '学习天数']
      ];
      users.forEach(u => {
        csv.push([
          u.id,
          u.openid,
          u.nickname || '',
          u.role,
          u.status,
          u.createdAt,
          u.lastLoginAt || '',
          u.totalLearning,
          u.studyDays
        ]);
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send(csv.map(row => row.join(',')).join('\n'));
    } else {
      // Excel 格式
      const ws = xlsx.utils.json_to_sheet(users);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Users');

      const filename = `users_${Date.now()}.xlsx`;
      const filepath = path.join(exportDir, filename);
      xlsx.writeFile(wb, filepath);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.sendFile(filepath, () => {
        // 发送后删除文件
        setTimeout(() => fs.unlink(filepath, () => {}), 1000);
      });
    }
  } catch (error) {
    console.error('导出用户数据失败:', error);
    res.status(500).json({ error: '导出用户数据失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/export/wordbooks - 导出词库数据
 */
router.get('/export/wordbooks', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { category, format = 'excel' } = req.query;

  try {
    let query = `
      SELECT 
        id,
        word,
        phonetic,
        definition,
        example,
        category
      FROM ielts_words
      WHERE 1=1
    `;
    let params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, word';

    const words = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (format === 'csv') {
      const csv = [
        ['ID', '单词', '音标', '释义', '例句', '词库分类']
      ];
      words.forEach(w => {
        csv.push([w.id, w.word, w.phonetic || '', w.definition || '', w.example || '', w.category || '']);
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=wordbooks.csv');
      res.send(csv.map(row => row.join(',')).join('\n'));
    } else {
      const ws = xlsx.utils.json_to_sheet(words);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Words');

      const filename = `wordbooks_${Date.now()}.xlsx`;
      const filepath = path.join(exportDir, filename);
      xlsx.writeFile(wb, filepath);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.sendFile(filepath, () => {
        setTimeout(() => fs.unlink(filepath, () => {}), 1000);
      });
    }
  } catch (error) {
    console.error('导出词库数据失败:', error);
    res.status(500).json({ error: '导出词库数据失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/export/learning - 导出学习记录
 */
router.get('/export/learning', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { userId, startDate, endDate, format = 'excel' } = req.query;

  try {
    let query = `
      SELECT 
        lr.id,
        lr.user_id as userId,
        lr.word_id as wordId,
        lr.is_correct as isCorrect,
        lr.response_time as responseTime,
        lr.created_at as createdAt,
        u.openid,
        p.nickname,
        iw.word,
        iw.definition
      FROM learning_records lr
      LEFT JOIN users u ON lr.user_id = u.id
      LEFT JOIN user_profiles p ON lr.user_id = p.user_id
      LEFT JOIN ielts_words iw ON lr.word_id = iw.id
      WHERE 1=1
    `;
    let params = [];

    if (userId) {
      query += ' AND lr.user_id = ?';
      params.push(userId);
    }

    if (startDate) {
      query += ' AND DATE(lr.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(lr.created_at) <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY lr.created_at DESC LIMIT 10000';

    const records = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const ws = xlsx.utils.json_to_sheet(records);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Learning Records');

    const filename = `learning_${Date.now()}.xlsx`;
    const filepath = path.join(exportDir, filename);
    xlsx.writeFile(wb, filepath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.sendFile(filepath, () => {
      setTimeout(() => fs.unlink(filepath, () => {}), 1000);
    });
  } catch (error) {
    console.error('导出学习记录失败:', error);
    res.status(500).json({ error: '导出学习记录失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
