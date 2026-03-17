/**
 * 账号管理系统数据库迁移
 * 创建时间：2026-03-17
 * 
 * 变更内容：
 * 1. users 表添加角色和状态字段
 * 2. 创建 user_profiles 表
 * 3. 创建 system_logs 表
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../scripts/ielts_vocab.db');

async function runMigration() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('数据库连接失败:', err);
        reject(err);
        return;
      }
      console.log('已连接到数据库:', dbPath);
    });

    db.serialize(() => {
      // 1. 修改 users 表
      db.run('BEGIN TRANSACTION');

      db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('添加 role 字段失败:', err);
        } else {
          console.log('✓ users.role 字段添加成功');
        }
      });

      db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('添加 status 字段失败:', err);
        } else {
          console.log('✓ users.status 字段添加成功');
        }
      });

      db.run(`ALTER TABLE users ADD COLUMN last_login_at DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('添加 last_login_at 字段失败:', err);
        } else {
          console.log('✓ users.last_login_at 字段添加成功');
        }
      });

      db.run(`ALTER TABLE users ADD COLUMN banned_reason TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('添加 banned_reason 字段失败:', err);
        } else {
          console.log('✓ users.banned_reason 字段添加成功');
        }
      });

      // 2. 创建 user_profiles 表
      db.run(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id INTEGER PRIMARY KEY,
          nickname TEXT,
          avatar_url TEXT,
          gender INTEGER DEFAULT 0,
          city TEXT,
          province TEXT,
          country TEXT,
          language TEXT DEFAULT 'zh_CN',
          first_login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('创建 user_profiles 表失败:', err);
        } else {
          console.log('✓ user_profiles 表创建成功');
        }
      });

      // 3. 创建 system_logs 表
      db.run(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_id INTEGER,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id INTEGER,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('创建 system_logs 表失败:', err);
        } else {
          console.log('✓ system_logs 表创建成功');
        }
      });

      // 4. 创建索引
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        CREATE INDEX IF NOT EXISTS idx_system_logs_admin ON system_logs(admin_id);
        CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
      `, (err) => {
        if (err) {
          console.error('创建索引失败:', err);
        } else {
          console.log('✓ 索引创建成功');
        }
      });

      db.run('COMMIT', (err) => {
        if (err) {
          console.error('事务提交失败:', err);
          db.run('ROLLBACK');
          reject(err);
          return;
        }
        console.log('\n✅ 数据库迁移完成！');
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
}

// 执行迁移
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('迁移失败:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };
