/**
 * 清理老词库脚本 - 只保留 7 个标准词库
 * 
 * 保留的词库：
 * 1. GRE 单词表
 * 2. 大学英语六级
 * 3. 大学英语四级
 * 4. 托福单词表
 * 5. 考研单词表
 * 6. 英语单词表汇编
 * 7. 雅思单词表
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../ielts_vocab.db');

// 要保留的词库
const KEEP_CATEGORIES = [
  'GRE 单词表',
  '大学英语六级',
  '大学英语四级',
  '托福单词表',
  '考研单词表',
  '英语单词表汇编',
  '雅思单词表'
];

console.log('========================================');
console.log('🧹 清理老词库脚本');
console.log('========================================\n');

console.log('保留的词库：');
KEEP_CATEGORIES.forEach((cat, i) => console.log(`  ${i + 1}. ${cat}`));
console.log();

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE);

db.serialize(async () => {
  try {
    // 1. 统计清理前的数据
    const beforeCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM ielts_words', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    console.log(`📊 清理前总单词数：${beforeCount}`);
    
    // 2. 统计要保留的单词数
    const keepCount = await new Promise((resolve, reject) => {
      const placeholders = KEEP_CATEGORIES.map(() => '?').join(',');
      db.get(
        `SELECT COUNT(*) as count FROM ielts_words WHERE category IN (${placeholders})`,
        KEEP_CATEGORIES,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
    console.log(`📚 保留的单词数：${keepCount}`);
    
    // 3. 统计要删除的单词数
    const deleteCount = beforeCount - keepCount;
    console.log(`🗑️  将删除的单词数：${deleteCount}`);
    console.log();
    
    // 4. 删除老词库数据
    console.log('🗑️  开始删除老词库数据...');
    
    const placeholders = KEEP_CATEGORIES.map(() => '?').join(',');
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM ielts_words WHERE category NOT IN (${placeholders})`,
        KEEP_CATEGORIES,
        function(err) {
          if (err) reject(err);
          else {
            console.log(`  ✓ 已删除 ${this.changes} 个单词`);
            resolve();
          }
        }
      );
    });
    
    // 5. 清理相关的学习记录（可选，根据需求决定）
    // 注意：这会清除所有用户的学习进度，谨慎使用
    console.log('\n⚠️  用户学习进度处理：');
    console.log('  学习记录 (learning_records) 未删除 - 保留用户进度');
    console.log('  用户进度 (user_word_progress) 未删除 - 保留用户进度');
    console.log('  复习会话 (review_sessions) 未删除 - 保留用户进度');
    console.log('  错题记录 (mistakes) 未删除 - 保留用户进度');
    
    // 6. 统计清理后的数据
    const afterCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM ielts_words', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    const afterByCategory = await new Promise((resolve, reject) => {
      db.all(
        'SELECT category, COUNT(*) as count FROM ielts_words GROUP BY category ORDER BY count DESC',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    console.log('\n========================================');
    console.log('✅ 清理完成！');
    console.log('========================================');
    console.log(`📊 清理后总单词数：${afterCount}`);
    console.log(`📚 词库数量：${afterByCategory.length}`);
    console.log('\n词库详情：');
    afterByCategory.forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat.category}: ${cat.count} 词`);
    });
    
  } catch (error) {
    console.error('\n❌ 清理失败:', error);
    process.exit(1);
  } finally {
    db.close();
  }
});
