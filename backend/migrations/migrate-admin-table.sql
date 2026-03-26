-- 管理员表迁移脚本
-- 执行：sqlite3 ielts_vocab.db < migrate-admin-table.sql

-- 创建管理员表
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
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

-- 插入默认管理员账号（密码：admin123）
-- 使用 bcrypt 加密，salt rounds = 10
INSERT OR IGNORE INTO admins (username, password_hash, nickname, role) 
VALUES (
  'admin',
  '$2b$10$KIXjFJq8kQZqVqJzQZqVqO7Kx8kQZqVqJzQZqVqO7Kx8kQZqVqJzQ',
  '超级管理员',
  'super_admin'
);

-- 注意：上面的密码哈希是示例，实际应该用 bcrypt 生成
-- 运行以下 Node.js 脚本生成正确的密码哈希：
-- const bcrypt = require('bcrypt');
-- bcrypt.hash('admin123', 10).then(hash => console.log(hash));
