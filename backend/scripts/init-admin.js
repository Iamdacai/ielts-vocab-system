/**
 * 初始化管理员账号脚本
 * 用法：node scripts/init-admin.js
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../ielts_vocab.db');
const sqlPath = path.join(__dirname, '../migrations/migrate-admin-table.sql');

async function initAdmin() {
  // 检查数据库文件是否存在
  if (!fs.existsSync(dbPath)) {
    console.error('❌ 数据库文件不存在:', dbPath);
    return;
  }

  const db = new sqlite3.Database(dbPath);

  try {
    // 执行迁移 SQL - 创建管理员表
    console.log('📝 执行管理员表迁移...');
    
    // 直接执行创建表语句
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          nickname VARCHAR(50),
          role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
          last_login_at TIMESTAMP,
          failed_attempts INTEGER DEFAULT 0,
          last_failed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 管理员表创建成功');
    
    // 创建索引
    await new Promise((resolve, reject) => {
      db.run('CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username)', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run('CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status)', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 管理员表索引创建成功');

    // 创建管理员账号
    console.log('👤 创建管理员账号...');
    
    const username = 'admin';
    const password = 'admin123';
    const nickname = '超级管理员';
    const role = 'super_admin';
    
    // 检查是否已存在
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM admins WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      console.log('⚠️  管理员账号已存在，跳过创建');
    } else {
      // 加密密码
      const passwordHash = await bcrypt.hash(password, 10);
      console.log('🔐 密码已加密');

      // 插入管理员
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO admins (username, password_hash, nickname, role) 
           VALUES (?, ?, ?, ?)`,
          [username, passwordHash, nickname, role],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log('✅ 管理员账号创建成功！');
      console.log('');
      console.log('📋 登录信息:');
      console.log('   用户名：admin');
      console.log('   密码：admin123');
      console.log('');
      console.log('⚠️  请在首次登录后立即修改密码！');
    }

    // 验证 system_logs 表是否存在
    console.log('📋 检查系统日志表...');
    const logsTable = await new Promise((resolve, reject) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='system_logs'",
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!logsTable) {
      console.log('⚠️  system_logs 表不存在，创建中...');
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER,
            action VARCHAR(50) NOT NULL,
            target_type VARCHAR(50),
            target_id INTEGER,
            details TEXT,
            ip_address VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ system_logs 表创建成功');
    } else {
      console.log('✅ system_logs 表已存在');
    }

    console.log('');
    console.log('🎉 管理员系统初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    db.close();
  }
}

initAdmin();
