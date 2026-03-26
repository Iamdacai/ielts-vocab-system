/**
 * 系统日志 API
 * 提供操作日志查询、导出等功能
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
 * GET /api/admin/logs - 获取系统日志
 */
router.get('/logs', requireAdmin, async (req, res) => {
  const db = await getDb();
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const offset = (page - 1) * pageSize;
  const { action, adminId, startDate, endDate } = req.query;

  try {
    // 构建查询条件
    let whereClause = '1=1';
    let params = [];

    if (action) {
      whereClause += ' AND action = ?';
      params.push(action);
    }

    if (adminId) {
      whereClause += ' AND admin_id = ?';
      params.push(adminId);
    }

    if (startDate) {
      whereClause += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    // 获取日志总数
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM system_logs WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    // 获取日志列表
    const logs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           l.*,
           COALESCE(a.username, 'Unknown') as admin_username
         FROM system_logs l
         LEFT JOIN admins a ON l.admin_id = a.id
         WHERE ${whereClause}
         ORDER BY l.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        adminId: l.admin_id,
        adminUsername: l.admin_username,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        details: l.details ? JSON.parse(l.details) : null,
        ipAddress: l.ip_address,
        createdAt: l.created_at
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取系统日志失败:', error);
    res.status(500).json({ error: '获取日志失败' });
  } finally {
    db.close();
  }
});

/**
 * GET /api/admin/logs/actions - 获取操作类型列表
 */
router.get('/logs/actions', requireAdmin, async (req, res) => {
  const db = await getDb();

  try {
    const actions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT action, COUNT(*) as count 
         FROM system_logs 
         GROUP BY action 
         ORDER BY count DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      actions: actions.map(a => ({
        action: a.action,
        count: a.count
      }))
    });
  } catch (error) {
    console.error('获取操作类型失败:', error);
    res.status(500).json({ error: '获取操作类型失败' });
  } finally {
    db.close();
  }
});

module.exports = router;
