const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DB = '/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend/ielts_vocab.db';
const ROOT = '/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/vocabulary/词汇总汇大纲';

const db = new sqlite3.Database(DB);

console.log('📚 开始导入词库...\n');

const tasks = [
  // 雅思 - 优先级最高
  ['雅思词汇 4500+ 词汇 9400', '【00】雅思必备词汇 4541.xlsx', 'IELTS 核心', '雅思必备 4541'],
  ['雅思词汇 4500+ 词汇 9400', '赠 3：词汇汇编 9400（P162）.xlsx', 'IELTS 高级', '词汇汇编 9400'],
  
  // 高中 - 优先级高
  ['3500 词汇高中词汇表/3500 词汇乱序版/乱序带音标', '3500 单词乱序版（带音标）.xlsx', '高中课标', '高中 3500 词'],
  
  // 四级
  ['05.大学英语四级词汇带默写版/四级 Word 版本 - 可编辑', null, 'CET-4', '大学英语四级'],
  
  // 六级
  ['05.大学英语六级词汇带默写版/六级 Word 版本 - 可编辑', null, 'CET-6', '大学英语六级'],
  
  // 考研
  ['考研英语大纲 5500 词汇【正序版 + 乱序版】/01、正序版【Word＋PDF＋Excel 三种格式】', null, '考研核心', '考研 5500 词'],
  
  // 托福
  ['托福词汇 4700+ 词汇 9400/【00】托福 word 版本', null, 'TOEFL 核心', '托福词汇'],
  
  // GRE
  ['GRE 词汇 7500+ 词汇 9400/GRE 词汇 word 版', null, 'GRE 核心', 'GRE 词汇'],
];

let total = 0;
let pending = tasks.length;

tasks.forEach(([dir, file, cat, src]) => {
  const dirPath = path.join(ROOT, dir);
  
  console.log(`📖 ${src} (${cat})`);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`   ⚠️ 目录不存在\n`);
    pending--;
    checkDone();
    return;
  }
  
  const files = file ? [file] : fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  
  if (files.length === 0) {
    console.log(`   ⚠️ 无 Excel 文件\n`);
    pending--;
    checkDone();
    return;
  }
  
  let dirTotal = 0;
  let filePending = files.length;
  
  files.forEach(f => {
    const fp = path.join(dirPath, f);
    try {
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
        dirTotal += count;
        filePending--;
        if (filePending === 0) {
          console.log(`   ✅ ${dirTotal} 词\n`);
          total += dirTotal;
          checkDone();
        }
      });
    } catch(err) {
      console.log(`   ❌ ${err.message}\n`);
      filePending--;
      if (filePending === 0) checkDone();
    }
  });
});

function checkDone() {
  if (pending === 0) {
    db.get('SELECT COUNT(*) as total FROM ielts_words', (err, row) => {
      console.log('='.repeat(60));
      console.log(`✅ 词库总计：${row.total} 个单词`);
      console.log(`📊 本次新增：约 ${total} 词`);
      console.log('='.repeat(60));
      console.log('\n✅ 词库导入完成！\n');
      db.close();
    });
  }
}
