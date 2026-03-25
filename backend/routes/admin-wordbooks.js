/**
 * 词库管理 API
 * 提供词库 CRUD、单词管理、批量导入导出等功能
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const csv = require('csv-parser');
const { requireAdmin } = require('../auth-middleware');

const router = express.Router();
const dbPath = path.join(__dirname, '../ielts_vocab.db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/wordbooks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'wordbook-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || 
        file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 CSV 或 Excel 文件'), false);
    }
  }
});

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
 * GET /api/admin/wordbooks - 获取词库列表（基于 ielts_words 的 category）
 */
router.get('/wordbooks', requireAdmin, async (req, res) => {
  const db = await getDb();
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const offset = (page - 1) * pageSize;
  const { search } = req.query;

  try {
    // 获取所有词库分类（基于 ielts_words.category）
    let whereClause = 'category IS NOT NULL AND category != ""';
    let params = [];

    if (search) {
      whereClause += ' AND category LIKE ?';
      params.push(`%${search}%`);
    }

    // 获取总数
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT category) as count FROM ielts_words WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 获取词库列表（带使用统计）
    const wordbooks = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           category as id,
           category as name,
           category as description,
           COUNT(*) as wordCount,
           'active' as status,
           (SELECT COUNT(DISTINCT uwc.user_id) 
            FROM user_configs uwc 
            WHERE uwc.vocab_category = category) as activeUsers,
           (SELECT COUNT(DISTINCT uwp.user_id) 
            FROM user_word_progress uwp
            INNER JOIN ielts_words iw ON uwp.word_id = iw.id
            WHERE iw.category = category) as learningUsers
         FROM ielts_words
         WHERE ${whereClause}
         GROUP BY category
         ORDER BY wordCount DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      wordbooks,
      total,
      page,
      pageSize
    });
  } catch (error) {
    console.error('获取词库列表失败:', error);
    res.status(500).json({ 
      error: '获取词库列表失败',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/wordbooks/:id - 获取词库详情
 */
router.get('/wordbooks/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { id } = req.params;

  try {
    // 获取词库信息
    const wordbook = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
           category as id,
           category as name,
           category as description,
           COUNT(*) as wordCount,
           (SELECT COUNT(DISTINCT uwc.user_id) 
            FROM user_configs uwc 
            WHERE uwc.vocab_category = category) as activeUsers,
           (SELECT COUNT(DISTINCT uwp.user_id) 
            FROM user_word_progress uwp
            INNER JOIN ielts_words iw ON uwp.word_id = iw.id
            WHERE iw.category = category) as learningUsers
         FROM ielts_words
         WHERE category = ?
         GROUP BY category`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!wordbook) {
      return res.status(404).json({ error: '词库不存在' });
    }

    res.json({ wordbook });
  } catch (error) {
    console.error('获取词库详情失败:', error);
    res.status(500).json({ 
      error: '获取词库详情失败',
      message: error.message 
    });
  }
});

/**
 * POST /api/admin/wordbooks - 创建新词库（添加新分类）
 */
router.post('/wordbooks', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { name, description } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: '词库名称不能为空' });
    }

    // 检查是否已存在
    const existing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT category FROM ielts_words WHERE category = ?',
        [name],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existing) {
      return res.status(409).json({ error: '词库名称已存在' });
    }

    // 词库是基于 category 的，不需要实际创建表
    // 这里只记录日志
    const adminId = req.user.userId;
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_wordbook_create', JSON.stringify({ name, description })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ 
      success: true, 
      message: '词库创建成功，请导入单词',
      wordbookId: name
    });
  } catch (error) {
    console.error('创建词库失败:', error);
    res.status(500).json({ 
      error: '创建词库失败',
      message: error.message 
    });
  }
});

/**
 * PUT /api/admin/wordbooks/:id - 更新词库（重命名分类）
 */
router.put('/wordbooks/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const { name, description, status } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: '词库名称不能为空' });
    }

    // 检查新名称是否已存在
    const existing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT category FROM ielts_words WHERE category = ?',
        [name],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existing && existing.category !== id) {
      return res.status(409).json({ error: '词库名称已存在' });
    }

    // 更新所有该分类的单词
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE ielts_words SET category = ? WHERE category = ?',
        [name, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 记录日志
    const adminId = req.user.userId;
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_wordbook_update', JSON.stringify({ oldName: id, newName: name, description, status })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error('更新词库失败:', error);
    res.status(500).json({ 
      error: '更新词库失败',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/admin/wordbooks/:id - 删除词库
 * ⚠️ 删除前检查使用状态
 */
router.delete('/wordbooks/:id', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { id } = req.params;

  try {
    // 检查是否有用户正在使用该词库
    const activeUsers = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(DISTINCT user_id) as count FROM user_configs WHERE vocab_category = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 检查是否有用户有该词库的学习记录
    const learningUsers = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT uwp.user_id) as count 
         FROM user_word_progress uwp
         INNER JOIN ielts_words iw ON uwp.word_id = iw.id
         WHERE iw.category = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 如果有用户使用中，不允许删除
    if (activeUsers > 0 || learningUsers > 0) {
      return res.status(409).json({
        error: '无法删除词库',
        message: '当前有用户正在学习该词库或有学习记录',
        activeUsers,
        learningUsers
      });
    }

    // 删除该分类的所有单词
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM ielts_words WHERE category = ?',
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // 记录日志
    const adminId = req.user.userId;
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_wordbook_delete', JSON.stringify({ wordbookId: id, wordbookName: id })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error('删除词库失败:', error);
    res.status(500).json({ 
      error: '删除词库失败',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/wordbooks/:id/words - 获取词库单词列表
 */
router.get('/wordbooks/:id/words', requireAdmin, async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const { page = 1, pageSize = 50, search } = req.query;
  const pageNum = parseInt(page);
  const pageSizeNum = parseInt(pageSize);
  const offset = (pageNum - 1) * pageSizeNum;

  try {
    // 构建查询条件
    let whereClause = 'category = ?';
    let params = [id];

    if (search) {
      whereClause += ' AND (word LIKE ? OR definition LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 获取总数
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM ielts_words WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 获取单词列表
    const words = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, word, phonetic, definition, example, category 
         FROM ielts_words 
         WHERE ${whereClause} 
         ORDER BY word 
         LIMIT ? OFFSET ?`,
        [...params, pageSizeNum, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      words,
      total,
      page: pageNum,
      pageSize: pageSizeNum
    });
  } catch (error) {
    console.error('获取单词列表失败:', error);
    res.status(500).json({ 
      error: '获取单词列表失败',
      message: error.message 
    });
  }
});

/**
 * POST /api/admin/wordbooks/:id/import - 批量导入单词
 */
router.post('/wordbooks/:id/import', requireAdmin, upload.single('file'), async (req, res) => {
  const db = await getDb();
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }

  try {
    const results = [];
    let stats = { total: 0, success: 0, duplicate: 0, error: 0 };

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // 批量插入
    for (const row of results) {
      stats.total++;
      
      // 映射列名（支持中英文）
      const word = row.word || row['单词'] || row['Word'];
      const phonetic = row.phonetic || row['音标'] || row['Phonetic'] || '';
      const definition = row.definition || row['释义'] || row['Definition'] || '';
      const example = row.example || row['例句'] || row['Example'] || '';

      if (!word) {
        stats.error++;
        continue;
      }

      // 检查是否重复
      const exists = await new Promise((resolve) => {
        db.get('SELECT id FROM ielts_words WHERE word = ? AND category = ?', [word, id], (err, row) => {
          resolve(!!row);
        });
      });

      if (exists) {
        stats.duplicate++;
        continue;
      }

      // 插入单词
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO ielts_words (word, phonetic, definition, example, category) VALUES (?, ?, ?, ?, ?)',
          [word, phonetic, definition, example, id],
          (err) => {
            if (err) {
              stats.error++;
              reject(err);
            } else {
              stats.success++;
              resolve();
            }
          }
        );
      });
    }

    // 删除临时文件
    fs.unlink(req.file.path, () => {});

    // 记录日志
    const adminId = req.user.userId;
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO system_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [adminId, 'admin_word_import', JSON.stringify({ wordbookId: id, stats })],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, stats });
  } catch (error) {
    console.error('导入单词失败:', error);
    res.status(500).json({ 
      error: '导入单词失败',
      message: error.message 
    });
  }
});

module.exports = router;
