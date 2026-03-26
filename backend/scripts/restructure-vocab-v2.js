/**
 * 词库重构脚本 v2 - 使用通配符解决中文文件名问题
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '../ielts_vocab.db');
const vocabDir = '/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/vocabulary/VOC';

console.log('数据库路径:', dbPath);
console.log('词库目录:', vocabDir);

// 使用 bash 列出文件（避免 Node.js 中文编码问题）
function listFiles() {
  try {
    const output = execSync(`ls "${vocabDir}"`, { encoding: 'utf8' });
    return output.trim().split('\n');
  } catch (e) {
    console.error('列出文件失败:', e.message);
    return [];
  }
}

// 词库映射（通过文件名模式匹配）
const VOCAB_PATTERNS = [
  { pattern: 'GRE', category: 'GRE 单词表' },
  { pattern: '六级', category: '大学英语六级' },
  { pattern: '四级', category: '大学英语四级' },
  { pattern: '托福', category: '托福单词表' },
  { pattern: '考研', category: '考研单词表' },
  { pattern: '汇编', category: '英语单词表汇编' },
  { pattern: '雅思', category: '雅思单词表' }
];

function getDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

async function importVocabFile(db, filePath, category) {
  console.log(`\n📚 导入词库：${category}`);
  console.log(`   文件：${filePath}`);
  
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`   读取到 ${data.length} 行数据`);
      
      if (data.length === 0) {
        resolve(0);
        return;
      }
      
      const firstRow = data[0];
      const keys = Object.keys(firstRow);
      console.log(`   列名：${keys.join(', ')}`);
      
      const wordKey = keys.find(k => k.includes('单词') || k.includes('词汇') || k.includes('Word') || k === 'word');
      const phoneticKey = keys.find(k => k.includes('音标') || k.includes('Phonetic') || k === 'phonetic');
      const definitionKey = keys.find(k => k.includes('释义') || k.includes('Definition') || k.includes('中文') || k === 'definition');
      const exampleKey = keys.find(k => k.includes('例句') || k.includes('Example') || k === 'example');
      const posKey = keys.find(k => k.includes('词性') || k.includes('Part') || k === 'part_of_speech');
      
      console.log(`   映射：word=${wordKey}, phonetic=${phoneticKey}, definition=${definitionKey}`);
      
      let inserted = 0;
      let duplicates = 0;
      let errors = 0;
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        data.forEach((row, index) => {
          const word = row[wordKey] || row['word'] || '';
          const phonetic = row[phoneticKey] || row['phonetic'] || '';
          const definition = row[definitionKey] || row['definition'] || row['中文'] || '';
          const example = row[exampleKey] || row['example'] || row['例句'] || '';
          const partOfSpeech = row[posKey] || row['part_of_speech'] || '';
          
          if (!word) {
            errors++;
            return;
          }
          
          db.get('SELECT id FROM ielts_words WHERE word = ? AND category = ?', [word, category], (err, exists) => {
            if (exists) {
              duplicates++;
            } else {
              db.run(
                `INSERT INTO ielts_words (word, phonetic, part_of_speech, definition, example_sentences, category)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [word, phonetic, partOfSpeech, definition, example, category],
                (err) => {
                  if (err) errors++;
                  else inserted++;
                  
                  if (index === data.length - 1) {
                    db.run('COMMIT', (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                      } else {
                        console.log(`   ✅ 导入完成：${inserted} 成功，${duplicates} 重复，${errors} 错误`);
                        resolve(inserted);
                      }
                    });
                  }
                }
              );
            }
          });
        });
      });
    } catch (error) {
      console.error(`   ❌ 导入失败:`, error.message);
      reject(error);
    }
  });
}

async function main() {
  console.log('========================================');
  console.log('🔄 词库重构脚本 v2');
  console.log('========================================\n');
  
  const files = listFiles();
  console.log('找到的文件:');
  files.forEach(f => console.log(`  - ${f}`));
  
  const db = await getDb();
  
  try {
    let totalImported = 0;
    
    for (const pattern of VOCAB_PATTERNS) {
      const matchedFile = files.find(f => f.includes(pattern.pattern));
      if (!matchedFile) {
        console.log(`\n⚠️  未找到匹配 "${pattern.pattern}" 的文件`);
        continue;
      }
      
      const filePath = path.join(vocabDir, matchedFile);
      const count = await importVocabFile(db, filePath, pattern.category);
      totalImported += count;
    }
    
    const result = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    const categories = await db.all('SELECT category, COUNT(*) as count FROM ielts_words GROUP BY category ORDER BY count DESC');
    
    console.log('\n========================================');
    console.log('✅ 词库重构完成！');
    console.log('========================================');
    console.log(`📊 总单词数：${result.count}`);
    console.log(`📚 词库数量：${categories.length}`);
    console.log('\n词库详情：');
    categories.forEach((cat, i) => {
      console.log(`  ${i + 1}. ${cat.category}: ${cat.count} 词`);
    });
    
  } catch (error) {
    console.error('\n❌ 重构失败:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
