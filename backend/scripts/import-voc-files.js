/**
 * VOC 词库导入脚本
 * 动态读取 vocabulary/VOC/ 目录下所有 Excel 文件并导入
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

const dbPath = path.join(__dirname, '../ielts_vocab.db');
const vocabDir = path.join(__dirname, '../../vocabulary/VOC');

/**
 * 获取数据库连接
 */
function getDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

/**
 * 清空现有数据
 */
async function clearData(db) {
  console.log('\n🗑️  清空单词数据...');
  try { await db.run('DELETE FROM learning_records'); } catch(e) {}
  try { await db.run('DELETE FROM user_word_progress'); } catch(e) {}
  try { await db.run('DELETE FROM review_sessions'); } catch(e) {}
  try { await db.run('DELETE FROM mistakes'); } catch(e) {}
  await db.run('DELETE FROM ielts_words');
  await db.run("DELETE FROM sqlite_sequence WHERE name='ielts_words'");
  console.log('  ✅ 已清空');
}

/**
 * 导入单个文件
 */
async function importFile(db, filePath) {
  const fileName = path.basename(filePath);
  const category = fileName.replace(/\.(xlsx|xls)$/, '');
  
  console.log(`\n📚 导入：${category}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  if (data.length === 0) {
    console.log('  ⚠️  空文件');
    return 0;
  }
  
  // 分析列
  const keys = Object.keys(data[0]);
  const wordKey = keys.find(k => /单词|Word|word/i.test(k));
  const phoneticKey = keys.find(k => /音标|Phonetic|phonetic/i.test(k));
  const defKey = keys.find(k => /释义|Definition|中文/i.test(k));
  const exampleKey = keys.find(k => /例句|Example/i.test(k));
  const posKey = keys.find(k => /词性|Part/i.test(k));
  
  console.log(`  行数：${data.length}, 列：word=${wordKey}, def=${defKey}`);
  
  let inserted = 0;
  let errors = 0;
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN');
      
      data.forEach((row, i) => {
        const word = row[wordKey] || '';
        if (!word) { errors++; return; }
        
        db.run(
          `INSERT INTO ielts_words (word, phonetic, part_of_speech, definition, example_sentences, category)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            word,
            row[phoneticKey] || '',
            row[posKey] || '',
            row[defKey] || '',
            row[exampleKey] || '',
            category
          ],
          (err) => { if (err) errors++; else inserted++; }
        );
        
        if (i === data.length - 1) {
          db.run('COMMIT', (err) => {
            if (err) { db.run('ROLLBACK'); reject(err); }
            else {
              console.log(`  ✅ ${inserted} 成功，${errors} 错误`);
              resolve(inserted);
            }
          });
        }
      });
    });
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('📥 VOC 词库导入脚本');
  console.log('========================================');
  console.log('词库目录:', vocabDir);
  
  const files = fs.readdirSync(vocabDir).filter(f => /\.(xlsx|xls)$/.test(f));
  console.log('找到文件:', files.length);
  
  if (files.length === 0) {
    console.log('❌ 没有找到 Excel 文件');
    return;
  }
  
  const db = await getDb();
  
  try {
    // 清空
    await clearData(db);
    
    // 导入
    let total = 0;
    for (const file of files) {
      const filePath = path.join(vocabDir, file);
      const count = await importFile(db, filePath);
      total += count;
    }
    
    // 统计
    const result = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    const cats = await db.all('SELECT category, COUNT(*) as count FROM ielts_words GROUP BY category ORDER BY count DESC');
    
    console.log('\n========================================');
    console.log('✅ 导入完成！');
    console.log('========================================');
    console.log(`📊 总单词数：${result.count}`);
    console.log(`📚 词库：${cats.length} 个`);
    cats.forEach((c, i) => console.log(`  ${i+1}. ${c.category}: ${c.count}`));
    
  } catch (error) {
    console.error('❌ 失败:', error);
  } finally {
    db.close();
  }
}

main();
