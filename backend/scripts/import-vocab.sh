#!/bin/bash
# 词库导入脚本

cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend

echo "📚 开始导入词库..."
echo ""

# 雅思词汇
echo "📖 雅思必备词汇 4541..."
node -e "
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const db = new sqlite3.Database('ielts_vocab.db');

const wb = XLSX.readFile('../vocabulary/词汇总汇大纲/雅思词汇 4500+ 词汇 9400/【00】雅思必备词汇 4541.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});

let count = 0;
const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');

data.forEach((row,i) => {
  if(i===0) return;
  const word = String(row[0]||'').trim();
  if(word && word.length>=2) {
    stmt.run(word.toLowerCase(), row[1]||null, row[2]||null, row[3]||null, 'IELTS 核心', '雅思必备 4541', 'medium');
    count++;
  }
});

stmt.finalize(() => {
  console.log('   ✅ 导入:', count, '词');
  db.close();
});
"

# 雅思 9400
echo "📖 词汇汇编 9400..."
node -e "
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const db = new sqlite3.Database('ielts_vocab.db');

const wb = XLSX.readFile('../vocabulary/词汇总汇大纲/雅思词汇 4500+ 词汇 9400/赠 3：词汇汇编 9400（P162）.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});

let count = 0;
const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');

data.forEach((row,i) => {
  if(i===0) return;
  const word = String(row[0]||'').trim();
  if(word && word.length>=2) {
    stmt.run(word.toLowerCase(), row[1]||null, row[2]||null, row[3]||null, 'IELTS 高级', '词汇汇编 9400', 'medium');
    count++;
  }
});

stmt.finalize(() => {
  console.log('   ✅ 导入:', count, '词');
  db.close();
});
"

# 高中 3500
echo "📖 高中 3500 词汇..."
node -e "
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const db = new sqlite3.Database('ielts_vocab.db');

const wb = XLSX.readFile('../vocabulary/词汇总汇大纲/3500 词汇高中词汇表/3500 词汇乱序版/乱序带音标/3500 单词乱序版（带音标）.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});

let count = 0;
const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');

data.forEach((row,i) => {
  if(i===0) return;
  const word = String(row[0]||'').trim();
  if(word && word.length>=2) {
    stmt.run(word.toLowerCase(), row[1]||null, row[2]||null, row[3]||null, '高中课标', '高中 3500 词', 'medium');
    count++;
  }
});

stmt.finalize(() => {
  console.log('   ✅ 导入:', count, '词');
  db.close();
});
"

# 四级
echo "📖 大学英语四级..."
node -e "
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const fs = require('fs');
const db = new sqlite3.Database('ielts_vocab.db');

const dir = '../vocabulary/词汇总汇大纲/05.大学英语四级词汇带默写版/四级 Word 版本 - 可编辑';
if(!fs.existsSync(dir)) { console.log('   ⚠️ 目录不存在'); db.close(); process.exit(0); }

const files = fs.readdirSync(dir).filter(f=>f.endsWith('.xlsx'));
let total = 0;

const processFile = (file) => {
  const wb = XLSX.readFile(dir+'/'+file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, {header:1});
  
  let count = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');
  
  data.forEach((row,i) => {
    if(i===0) return;
    const word = String(row[0]||'').trim();
    if(word && word.length>=2) {
      stmt.run(word.toLowerCase(), row[1]||null, row[2]||null, row[3]||null, 'CET-4', '大学英语四级', 'medium');
      count++;
    }
  });
  
  stmt.finalize(() => { total += count; });
};

files.forEach(processFile);
setTimeout(() => { console.log('   ✅ 导入:', total, '词'); db.close(); }, 2000);
"

# 六级
echo "📖 大学英语六级..."
node -e "
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const fs = require('fs');
const db = new sqlite3.Database('ielts_vocab.db');

const dir = '../vocabulary/词汇总汇大纲/05.大学英语六级词汇带默写版/六级 Word 版本 - 可编辑';
if(!fs.existsSync(dir)) { console.log('   ⚠️ 目录不存在'); db.close(); process.exit(0); }

const files = fs.readdirSync(dir).filter(f=>f.endsWith('.xlsx'));
let total = 0;

const processFile = (file) => {
  const wb = XLSX.readFile(dir+'/'+file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, {header:1});
  
  let count = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');
  
  data.forEach((row,i) => {
    if(i===0) return;
    const word = String(row[0]||'').trim();
    if(word && word.length>=2) {
      stmt.run(word.toLowerCase(), row[1]||null, row[2]||null, row[3]||null, 'CET-6', '大学英语六级', 'medium');
      count++;
    }
  });
  
  stmt.finalize(() => { total += count; });
};

files.forEach(processFile);
setTimeout(() => { console.log('   ✅ 导入:', total, '词'); db.close(); }, 2000);
"

# 考研
echo "📖 考研 5500 词汇..."
node -e "
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const fs = require('fs');
const db = new sqlite3.Database('ielts_vocab.db');

const dir = '../vocabulary/词汇总汇大纲/考研英语大纲 5500 词汇【正序版 + 乱序版】/01、正序版【Word＋PDF＋Excel 三种格式】';
if(!fs.existsSync(dir)) { console.log('   ⚠️ 目录不存在'); db.close(); process.exit(0); }

const files = fs.readdirSync(dir).filter(f=>f.endsWith('.xlsx'));
let total = 0;

const processFile = (file) => {
  const wb = XLSX.readFile(dir+'/'+file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, {header:1});
  
  let count = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');
  
  data.forEach((row,i) => {
    if(i===0) return;
    const word = String(row[0]||'').trim();
    if(word && word.length>=2) {
      stmt.run(word.toLowerCase(), row[1]||null, row[2]||null, row[3]||null, '考研核心', '考研 5500 词', 'medium');
      count++;
    }
  });
  
  stmt.finalize(() => { total += count; });
};

files.forEach(processFile);
setTimeout(() => { console.log('   ✅ 导入:', total, '词'); db.close(); }, 2000);
"

# 托福
echo "📖 托福词汇..."
node -e "
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const fs = require('fs');
const db = new sqlite3.Database('ielts_vocab.db');

const dir = '../vocabulary/词汇总汇大纲/托福词汇 4700+ 词汇 9400/【00】托福 word 版本';
if(!fs.existsSync(dir)) { console.log('   ⚠️ 目录不存在'); db.close(); process.exit(0); }

const files = fs.readdirSync(dir).filter(f=>f.endsWith('.xlsx'));
let total = 0;

const processFile = (file) => {
  const wb = XLSX.readFile(dir+'/'+file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, {header:1});
  
  let count = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');
  
  data.forEach((row,i) => {
    if(i===0) return;
    const word = String(row[0]||'').trim();
    if(word && word.length>=2) {
      stmt.run(word.toLowerCase(), row[1]||null, row[2]||null, row[3]||null, 'TOEFL 核心', '托福词汇', 'medium');
      count++;
    }
  });
  
  stmt.finalize(() => { total += count; });
};

files.forEach(processFile);
setTimeout(() => { console.log('   ✅ 导入:', total, '词'); db.close(); }, 2000);
"

# GRE
echo "📖 GRE 词汇..."
node -e "
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const fs = require('fs');
const db = new sqlite3.Database('ielts_vocab.db');

const dir = '../vocabulary/词汇总汇大纲/GRE 词汇 7500+ 词汇 9400/GRE 词汇 word 版';
if(!fs.existsSync(dir)) { console.log('   ⚠️ 目录不存在'); db.close(); process.exit(0); }

const files = fs.readdirSync(dir).filter(f=>f.endsWith('.xlsx'));
let total = 0;

const processFile = (file) => {
  const wb = XLSX.readFile(dir+'/'+file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, {header:1});
  
  let count = 0;
  const stmt = db.prepare('INSERT OR IGNORE INTO ielts_words (word,phonetic,part_of_speech,definition,category,source,frequency_level) VALUES (?,?,?,?,?,?,?)');
  
  data.forEach((row,i) => {
    if(i===0) return;
    const word = String(row[0]||'').trim();
    if(word && word.length>=2) {
      stmt.run(word.toLowerCase(), row[1]||null, row[2]||null, row[3]||null, 'GRE 核心', 'GRE 词汇', 'medium');
      count++;
    }
  });
  
  stmt.finalize(() => { total += count; });
};

files.forEach(processFile);
setTimeout(() => { console.log('   ✅ 导入:', total, '词'); db.close(); }, 2000);
"

echo ""
echo "============================================================"
echo "📊 统计"
echo "============================================================"
sqlite3 ielts_vocab.db "SELECT COUNT(*) as total FROM ielts_words;" | xargs -I {} echo "✅ 词库总计：{} 个单词"
echo ""
echo "✅ 词库导入完成！"
