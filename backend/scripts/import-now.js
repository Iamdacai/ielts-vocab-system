const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, 'ielts_vocab.db');
const ROOT = '/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/vocabulary/词汇总汇大纲';

const db = new sqlite3.Database(DB);

console.log('📚 开始导入词库...\n');

// 雅思
importExcel('雅思词汇 4500+ 词汇 9400', '【00】雅思必备词汇 4541.xlsx', 'IELTS 核心', '雅思必备 4541');
importExcel('雅思词汇 4500+ 词汇 9400', '赠 3：词汇汇编 9400（P162）.xlsx', 'IELTS 高级', '词汇汇编 9400');

// 高中
importExcel('3500 词汇高中词汇表/3500 词汇乱序版/乱序带音标', '3500 单词乱序版（带音标）.xlsx', '高中课标', '高中 3500 词');

// 四级
autoImport('05.大学英语四级词汇带默写版/四级 Word 版本 - 可编辑', 'CET-4', '大学英语四级');

// 六级
autoImport('05.大学英语六级词汇带默写版/六级 Word 版本 - 可编辑', 'CET-6', '大学英语六级');

// 考研
autoImport('考研英语大纲 5500 词汇【正序版 + 乱序版】/01、正序版【Word＋PDF＋Excel 三种格式】', '考研核心', '考研 5500 词');

// 托福
autoImport('托福词汇 4700+ 词汇 9400/【00】托福 word 版本', 'TOEFL 核心', '托福词汇');

// GRE
autoImport('GRE 词汇 7500+ 词汇 9400/GRE 词汇 word 版', 'GRE 核心', 'GRE 词汇');

function importExcel(dir, file, cat, src) {
  const fp = path.join(ROOT, dir, file);
  console.log(`📖 ${src} (${cat})`);
  
  if (!fs.existsSync(fp)) {
    console.log(`   ⚠️ 文件不存在\n`);
    return;
  }
  
  const wb = XLSX.readFile(fp);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, {header:1});
  
  let count = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');
  
  data.forEach((row, i) => {
    if (i === 0) return;
    const word = String(row[0] || '').trim();
    if (word && word.length >= 2) {
      stmt.run(word.toLowerCase(), row[1], row[2], row[3], cat, src, 'medium');
      count++;
    }
  });
  
  stmt.finalize(() => {
    console.log(`   ✅ ${count} 词\n`);
    checkDone();
  });
}

function autoImport(dir, cat, src) {
  const dp = path.join(ROOT, dir);
  console.log(`📖 ${src} (${cat})`);
  
  if (!fs.existsSync(dp)) {
    console.log(`   ⚠️ 目录不存在\n`);
    checkDone();
    return;
  }
  
  const files = fs.readdirSync(dp).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  if (files.length === 0) {
    console.log(`   ⚠️ 无 Excel 文件\n`);
    checkDone();
    return;
  }
  
  let total = 0;
  let pending = files.length;
  
  files.forEach(file => {
    const fp = path.join(dp, file);
    const wb = XLSX.readFile(fp);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, {header:1});
    
    let count = 0;
    const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');
    
    data.forEach((row, i) => {
      if (i === 0) return;
      const word = String(row[0] || '').trim();
      if (word && word.length >= 2) {
        stmt.run(word.toLowerCase(), row[1], row[2], row[3], cat, src, 'medium');
        count++;
      }
    });
    
    stmt.finalize(() => {
      total += count;
      pending--;
      if (pending === 0) {
        console.log(`   ✅ ${total} 词\n`);
        checkDone();
      }
    });
  });
}

let pendingTasks = 8;
function checkDone() {
  pendingTasks--;
  if (pendingTasks === 0) {
    db.get('SELECT COUNT(*) as total FROM ielts_words', (err, row) => {
      console.log('='.repeat(60));
      console.log(`✅ 词库总计：${row.total} 个单词`);
      console.log('='.repeat(60));
      console.log('\n✅ 词库导入完成！\n');
      db.close();
    });
  }
}
