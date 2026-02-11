const { Pool } = require('pg');
require('dotenv').config();

// 初始化数据库连接（用于创建数据库和表）
const initPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'postgres' // 连接到默认数据库来创建新数据库
});

async function initializeDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 创建数据库
    await initPool.query(`CREATE DATABASE ${process.env.DB_NAME || 'ielts_vocab'};`);
    console.log('数据库创建成功');
    
    // 关闭初始化连接
    await initPool.end();
    
    // 连接到新创建的数据库
    const dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ielts_vocab',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD
    });
    
    // 执行数据库表创建脚本
    const fs = require('fs');
    const schemaSQL = fs.readFileSync('./database-schema.sql', 'utf8');
    await dbPool.query(schemaSQL);
    console.log('数据库表结构创建成功');
    
    await dbPool.end();
    console.log('数据库初始化完成！');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('数据库已存在，跳过创建步骤');
      // 如果数据库已存在，直接创建表结构
      const dbPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'ielts_vocab',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
      });
      
      const fs = require('fs');
      const schemaSQL = fs.readFileSync('./database-schema.sql', 'utf8');
      await dbPool.query(schemaSQL);
      console.log('数据库表结构创建成功');
      await dbPool.end();
    } else {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  initializeDatabase().catch(console.error);
}

module.exports = { initializeDatabase };