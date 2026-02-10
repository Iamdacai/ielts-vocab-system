const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let dbPromise = null;

async function initializeDatabase() {
  if (!dbPromise) {
    dbPromise = open({
      filename: './ielts_vocab.db',
      driver: sqlite3.Database
    }).then(async (db) => {
      // 创建表结构
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
        
        CREATE INDEX IF NOT EXISTS idx_user_word_progress_next_review ON user_word_progress(next_review_at);
        CREATE INDEX IF NOT EXISTS idx_user_word_progress_status ON user_word_progress(status);
        CREATE INDEX IF NOT EXISTS idx_ielts_words_frequency ON ielts_words(frequency_level);
        CREATE INDEX IF NOT EXISTS idx_ielts_words_book ON ielts_words(cambridge_book);
      `);
      
      console.log('SQLite数据库初始化成功!');
      return db;
    });
  }
  
  return dbPromise;
}

module.exports = { initializeDatabase };