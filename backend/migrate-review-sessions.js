/**
 * 复习课管理系统 - 数据库迁移脚本
 * 创建 review_sessions 和 review_session_items 表
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'scripts', 'ielts_vocab.db');

async function migrate() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('连接数据库失败:', err);
        reject(err);
        return;
      }
      console.log('✅ 数据库连接成功');
    });

    // 创建复习课表
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS review_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_date DATE NOT NULL,
          planned_words INTEGER DEFAULT 0,
          completed_words INTEGER DEFAULT 0,
          status TEXT DEFAULT 'pending',
          started_at DATETIME,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, session_date)
        )
      `, (err) => {
        if (err) {
          console.error('创建 review_sessions 表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 创建 review_sessions 表成功');
      });

      // 创建复习课详情表
      db.run(`
        CREATE TABLE IF NOT EXISTS review_session_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          word_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          result TEXT,
          answered_at DATETIME,
          FOREIGN KEY (session_id) REFERENCES review_sessions(id),
          FOREIGN KEY (word_id) REFERENCES ielts_words(id),
          UNIQUE(session_id, word_id)
        )
      `, (err) => {
        if (err) {
          console.error('创建 review_session_items 表失败:', err);
          reject(err);
          return;
        }
        console.log('✅ 创建 review_session_items 表成功');
      });

      // 创建索引
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_review_sessions_date 
        ON review_sessions(user_id, session_date)
      `, (err) => {
        if (err) {
          console.error('创建索引失败:', err);
        }
      });

      db.run(`
        CREATE INDEX IF NOT EXISTS idx_review_session_items_session 
        ON review_session_items(session_id, status)
      `, (err) => {
        if (err) {
          console.error('创建索引失败:', err);
        }
      });

      // 迁移现有数据（为今天生成复习课）
      db.run(`
        INSERT OR IGNORE INTO review_sessions (user_id, session_date, planned_words, status, started_at)
        SELECT 
          1 as user_id,
          date('now') as session_date,
          COUNT(*) as planned_words,
          'pending' as status,
          CURRENT_TIMESTAMP as started_at
        FROM user_word_progress
        WHERE user_id = 1 
          AND next_review_at <= datetime('now')
          AND mastery_score < 75
      `, function(err) {
        if (err) {
          console.error('迁移数据失败:', err);
        } else {
          console.log(`✅ 迁移数据成功，影响行数：${this.changes}`);
        }

        // 获取今天复习课的 ID
        db.get(`SELECT id FROM review_sessions WHERE user_id = 1 AND session_date = date('now')`, (err, session) => {
          if (!session) {
            console.log('⚠️ 今天没有待复习的单词');
            db.close();
            resolve();
            return;
          }

          console.log(`📋 今天复习课 ID: ${session.id}`);

          // 插入复习课详情
          db.run(`
            INSERT OR IGNORE INTO review_session_items (session_id, word_id, status)
            SELECT 
              ? as session_id,
              word_id,
              'pending' as status
            FROM user_word_progress
            WHERE user_id = 1 
              AND next_review_at <= datetime('now')
              AND mastery_score < 75
          `, [session.id], (err) => {
            if (err) {
              console.error('插入复习课详情失败:', err);
            } else {
              console.log('✅ 插入复习课详情成功');
            }

            db.close();
            resolve();
          });
        });
      });
    });
  });
}

// 执行迁移
migrate()
  .then(() => {
    console.log('\n🎉 数据库迁移完成！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 数据库迁移失败:', err);
    process.exit(1);
  });
