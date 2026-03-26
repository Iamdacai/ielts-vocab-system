#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const path = require('path');

const DB_PATH = '/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend/ielts_vocab.db';
const VOCAB_ROOT = '/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/vocabulary/词汇总汇大纲';

const db = new sqlite3.Database(DB_PATH);

const tasks = [
  { file: '雅思词汇 4500+ 词汇 9400/【00】雅思必备词汇 4541.xlsx', cat: 'IELTS 核心', src: '雅思必备 4541' },
  { file: '雅思词汇 4500+ 词汇 9400/赠 3：词汇汇编 9400（P162）.xlsx', cat: 'IELTS 高级', src: '词汇汇编 9400' },
  { file: '3500 词汇高中词汇表/3500 词汇乱序版/乱序带音标/3500 单词乱序版（带音标）.xlsx', cat: '高中课标', src: '高中 3500 词' },
];

console.log('📚 开始导入词库...\n');

let total = 0;
let current = 0;

function importFile(task) {
  return new Promise((resolve) => {
    const filePath = path.join(VOCAB_ROOT, task.file);
    console.log(`📖 ${task.src} (${task.cat})`);
    
    try {
      const wb = XLSX.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      let count = 0;
      const stmt = db.prepare(`INSERT OR IGNORE INTO ielts_words 
        (word,phonetic,part_of_speech,definition,category,source,frequency_level) 
        VALUES (?,?,?,?,?,?,?)`);
      
      data.forEach((row, i) => {
        if (i === 0) return;
        const word = String(row[0] || '').trim();
        if (word && word.length >= 2) {
          stmt.run(word.toLowerCase(), row[1] || null, row[2] || null, row[3] || null, task.cat, task.src, 'medium');
          count++;
        }
      });
      
      stmt.finalize(() => {
        console.log(`   ✅ ${count} 词\n`);
        total += count;
        resolve();
      });
    } catch (err) {
      console.log(`   ❌ ${err.message}\n`);
      resolve();
    }
  });
}

async function main() {
  for (const task of tasks) {
    await importFile(task);
  }
  
  db.get('SELECT COUNT(*) as total FROM ielts_words', (err, row) => {
    console.log('='.repeat(60));
    console.log(`✅ 词库总计：${row.total} 个单词`);
    console.log(`📊 本次新增：约 ${total} 词`);
    console.log('='.repeat(60));
    console.log('\n✅ 词库导入完成！\n');
    db.close();
  });
}

main();
