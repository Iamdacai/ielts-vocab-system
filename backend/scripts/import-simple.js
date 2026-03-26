/**
 * VOC 词库导入 - 简化版
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

const dbPath = path.join(__dirname, '../ielts_vocab.db');
const vocabDir = path.join(__dirname, '../../vocabulary/VOC');

console.log('📥 VOC 词库导入\n');

const files = fs.readdirSync(vocabDir).filter(f => /\.(xlsx|xls)$/.test(f));
console.log('找到', files.length, '个文件\n');

const db = new sqlite3.Database(dbPath);

// 清空
console.log('🗑️  清空 ielts_words...');
db.run('DELETE FROM ielts_words', () => {
  db.run("DELETE FROM sqlite_sequence WHERE name='ielts_words'", runImport);
});

function runImport() {
  console.log('✅ 已清空\n');
  
  let total = 0;
  let fileIndex = 0;
  
  function nextFile() {
    if (fileIndex >= files.length) {
      finish();
      return;
    }
    
    const file = files[fileIndex++];
    const category = file.replace(/\.(xlsx|xls)$/, '');
    const filePath = path.join(vocabDir, file);
    
    console.log(`📚 ${category}...`);
    
    const wb = XLSX.readFile(filePath);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    
    if (!data.length) {
      console.log('  空文件\n');
      nextFile();
      return;
    }
    
    const keys = Object.keys(data[0]);
    const wordKey = keys.find(k => /单词|Word/i.test(k));
    const phKey = keys.find(k => /音标|Phonetic/i.test(k));
    const defKey = keys.find(k => /释义|Definition|中文/i.test(k));
    const exKey = keys.find(k => /例句|Example/i.test(k));
    const posKey = keys.find(k => /词性|Part/i.test(k));
    
    console.log(`  ${data.length}行，word 列=${wordKey}`);
    
    let inserted = 0;
    db.serialize(() => {
      db.run('BEGIN');
      
      data.forEach(row => {
        const word = row[wordKey];
        if (!word) return;
        
        db.run(
          `INSERT INTO ielts_words (word, phonetic, part_of_speech, definition, example_sentences, category)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [word, row[phKey]||'', row[posKey]||'', row[defKey]||'', row[exKey]||'', category],
          (err) => { if (!err) inserted++; }
        );
      });
      
      db.run('COMMIT', () => {
        total += inserted;
        console.log(`  ✅ ${inserted}\n`);
        nextFile();
      });
    });
  }
  
  nextFile();
}

function finish() {
  db.get('SELECT COUNT(*) as c FROM ielts_words', (e, r) => {
    console.log('========================================');
    console.log(`✅ 完成！总单词数：${r.c}`);
    console.log('========================================');
  });
  db.close();
}
