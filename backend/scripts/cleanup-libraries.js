/**
 * 清理老词库脚本 - 删除 32 个老词库，只保留 7 个标准词库
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

// 要保留的 7 个标准词库
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

console.log('✅ 保留的词库（7 个）:');
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
    console.log(`📊 清理前总单词数：${beforeCount.toLocaleString()}`);
    
    // 2. 统计要保留的单词数
    const placeholders = KEEP_CATEGORIES.map(() => '?').join(',');
    const keepCount = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM ielts_words WHERE category IN (${placeholders})`,
        KEEP_CATEGORIES,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
    console.log(`📚 保留的单词数：${keepCount.toLocaleString()}`);
    
    // 3. 统计要删除的单词数
    const deleteCount = beforeCount - keepCount;
    console.log(`🗑️  将删除的单词数：${deleteCount.toLocaleString()}`);
    console.log();
    
    // 4. 列出要删除的词库
    const toDelete = await new Promise((resolve, reject) => {
      db.all(
        `SELECT category, COUNT(*) as count FROM ielts_words 
         WHERE category NOT IN (${placeholders}) 
         GROUP BY category 
         ORDER BY count DESC`,
        KEEP_CATEGORIES,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    console.log('🗑️  将删除的词库（32 个）:');
    toDelete.forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat.category}: ${cat.count.toLocaleString()} 词`);
    });
    console.log();
    
    // 5. 确认删除
    console.log('⚠️  警告：此操作不可逆！');
    console.log('按 Ctrl+C 取消，或等待 3 秒后继续...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. 删除老词库数据
    console.log('\n🗑️  开始删除老词库数据...');
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM ielts_words WHERE category NOT IN (${placeholders})`,
        KEEP_CATEGORIES,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
    
    console.log(`  ✓ 已删除 ${result.changes.toLocaleString()} 个单词`);
    
    // 7. 清理无分类的单词
    const nullResult = await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM ielts_words WHERE category IS NULL OR category = ''`,
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
    
    if (nullResult.changes > 0) {
      console.log(`  ✓ 已删除 ${nullResult.changes.toLocaleString()} 个无分类单词`);
    }
    
    // 8. 统计清理后的数据
    const afterCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM ielts_words', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    const afterByCategory = await new Promise((resolve, reject) => {
      db.all(
        'SELECT category, COUNT(*) as count FROM ielts_words WHERE category IS NOT NULL AND category != "" GROUP BY category ORDER BY count DESC',
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
    console.log(`📊 清理后总单词数：${afterCount.toLocaleString()}`);
    console.log(`📚 词库数量：${afterByCategory.length}`);
    console.log('\n词库详情：');
    afterByCategory.forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat.category}: ${cat.count.toLocaleString()} 词`);
    });
    
    // 9. 备份数据库
    console.log('\n💾 建议手动备份数据库:');
    console.log('  cp backend/ielts_vocab.db backend/ielts_vocab.db.backup.after-cleanup');
    
  } catch (error) {
    console.error('\n❌ 清理失败:', error);
    process.exit(1);
  } finally {
    db.close();
  }
});
