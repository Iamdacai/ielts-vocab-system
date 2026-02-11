const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbPromise = null;

async function initializeDatabase() {
  if (!dbPromise) {
    // 使用scripts目录中的数据库文件
    const dbPath = path.join(__dirname, 'scripts', 'ielts_vocab.db');
    console.log('使用数据库文件:', dbPath);
    
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    }).then(async (db) => {
      // 检查表是否存在，如果不存在则创建
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='ielts_words'");
      if (tables.length === 0) {
        console.log('表 ielts_words 不存在，正在创建...');
        await db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            openid TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE TABLE IF NOT EXISTS user_configs (
            user_id INTEGER PRIMARY KEY,
            weekly_new_words_days TEXT DEFAULT '[1,2,3,4,5,6,7]',
            daily_new_words_count INTEGER DEFAULT 20,
            review_time TEXT DEFAULT '20:00',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
          
          CREATE TABLE IF NOT EXISTS ielts_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            phonetic TEXT,
            part_of_speech TEXT,
            definition TEXT NOT NULL,
            example_sentences TEXT,
            frequency_level TEXT CHECK(frequency_level IN ('high', 'medium', 'low')),
            cambridge_book INTEGER CHECK(cambridge_book BETWEEN 1 AND 18),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(word, cambridge_book)
          );
          
          CREATE TABLE IF NOT EXISTS user_word_progress (
            user_id INTEGER,
            word_id INTEGER,
            status TEXT CHECK(status IN ('new', 'learning', 'mastered', 'forgotten')),
            next_review_at DATETIME,
            review_count INTEGER DEFAULT 0,
            mastery_score REAL DEFAULT 0.00,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, word_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (word_id) REFERENCES ielts_words(id) ON DELETE CASCADE
          );
          
          CREATE TABLE IF NOT EXISTS learning_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            word_id INTEGER,
            action_type TEXT CHECK(action_type IN ('new_word', 'review', 'test', 'mastered')),
            result TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (word_id) REFERENCES ielts_words(id) ON DELETE CASCADE
          );
          
          CREATE INDEX IF NOT EXISTS idx_ielts_words_frequency ON ielts_words(frequency_level);
          CREATE INDEX IF NOT EXISTS idx_ielts_words_book ON ielts_words(cambridge_book);
        `);
        console.log('表结构创建成功!');
      }
      
      console.log('SQLite数据库初始化成功!');
      return db;
    });
  }
  
  return dbPromise;
}

// 导出数据库实例和初始化函数
module.exports = { initializeDatabase };