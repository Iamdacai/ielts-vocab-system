const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'ielts_vocab.db');

/**
 * 获取词库列表（按分组整理）
 * GET /api/words/libraries
 * 
 * 只显示 7 个标准词库，其他词库隐藏（数据保留）
 */
router.get('/libraries', auth.optional, (req, res) => {
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
  
  // 🆕 只显示 7 个标准词库
  const STANDARD_LIBRARIES = [
    'GRE 单词表',
    '大学英语六级',
    '大学英语四级',
    '托福单词表',
    '考研单词表',
    '英语单词表汇编',
    '雅思单词表'
  ];
  
  const placeholders = STANDARD_LIBRARIES.map(() => '?').join(',');
  
  const query = `
    SELECT 
      category as id,
      category as name,
      CASE 
        WHEN category LIKE '%雅思%' OR category LIKE '%IELTS%' THEN 'IELTS'
        WHEN category LIKE '%托福%' OR category LIKE '%TOEFL%' THEN 'TOEFL'
        WHEN category LIKE '%GRE%' THEN 'GRE'
        WHEN category LIKE '%考研%' THEN '考研'
        WHEN category LIKE '%四级%' OR category LIKE '%CET-4%' THEN 'CET4'
        WHEN category LIKE '%六级%' OR category LIKE '%CET-6%' THEN 'CET6'
        ELSE '其他'
      END as group_name,
      COUNT(*) as word_count
    FROM ielts_words
    WHERE category IN (${placeholders})
    GROUP BY category
    ORDER BY 
      CASE 
        WHEN category = '雅思单词表' THEN 1
        WHEN category = '托福单词表' THEN 2
        WHEN category = 'GRE 单词表' THEN 3
        WHEN category = '考研单词表' THEN 4
        WHEN category = '大学英语六级' THEN 5
        WHEN category = '大学英语四级' THEN 6
        WHEN category = '英语单词表汇编' THEN 7
        ELSE 8
      END,
      word_count DESC
  `;
  
  db.all(query, STANDARD_LIBRARIES, (err, rows) => {
    db.close();
    
    if (err) {
      console.error('获取词库列表失败:', err);
      return res.status(500).json({ error: '查询失败' });
    }
    
    // 按分组整理
    const groups = {};
    rows.forEach(row => {
      if (!groups[row.group_name]) {
        groups[row.group_name] = [];
      }
      groups[row.group_name].push({
        id: row.id,
        name: row.name,
        group: row.group_name,
        word_count: row.word_count
      });
    });
    
    res.json(groups);
  });
});

/**
 * 获取词库分类（用于真经词库）
 * GET /api/words/categories?source=真经
 */
router.get('/categories', auth.optional, (req, res) => {
  const { source } = req.query;
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
  
  let query = `SELECT DISTINCT category as id, category as name, COUNT(*) as word_count FROM ielts_words`;
  
  if (source === '真经') {
    query += ` WHERE category LIKE '%真经%'`;
  }
  
  query += ` GROUP BY category ORDER BY word_count DESC`;
  
  db.all(query, [], (err, rows) => {
    db.close();
    
    if (err) {
      console.error('获取分类列表失败:', err);
      return res.status(500).json({ error: '查询失败' });
    }
    
    res.json(rows);
  });
});

module.exports = router;
