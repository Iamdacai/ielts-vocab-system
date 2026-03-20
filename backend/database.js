const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbPromise = null;

async function initializeDatabase() {
  if (!dbPromise) {
    // 使用 scripts 目录中的数据库文件
    const dbPath = path.join(__dirname, 'scripts', 'ielts_vocab.db');
    console.log('[DB] 使用数据库文件:', dbPath);
    
    dbPromise = (async () => {
      try {
        const db = await open({
          filename: dbPath,
          driver: sqlite3.Database
        });
        
        // 启用 WAL 模式提高并发性能
        await db.exec('PRAGMA journal_mode=WAL');
        
        console.log('[DB] SQLite 数据库初始化成功!');
        return db;
      } catch (error) {
        console.error('[DB] 初始化失败:', error);
        dbPromise = null; // 重置，允许重试
        throw error;
      }
    })();
  }
  
  return dbPromise;
}

// 导出数据库实例和初始化函数
module.exports = { initializeDatabase };
