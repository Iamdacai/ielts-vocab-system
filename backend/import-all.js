const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const { execSync } = require('child_process');

const db = new sqlite3.Database('ielts_vocab.db');

console.log('📚 开始导入词库...\n');

// 用 git 列出所有 xlsx 文件
let files;
try {
  const out = execSync('git ls-files vocabulary/词汇总汇大纲/*.xlsx', {encoding:'utf8'});
  files = out.trim().split('\n').filter(f => f.length > 0);
} catch(e) {
  files = [];
}

console.log(`找到 ${files.length} 个 Excel 文件\n`);

let total = 0;
let pending = files.length;

if (pending === 0) {
  console.log('⚠️  没有找到 Excel 文件');
  db.close();
  process.exit(0);
}

files.forEach(file => {
  try {
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, {header:1});
    
    // 从路径提取分类
    const parts = file.split('/');
    const cat = parts[1] || '其他';
    const src = parts[parts.length-1].replace('.xlsx','').substring(0, 30);
    
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
      console.log(`📄 ${file}: ${count} 词`);
      
      if (pending === 0) {
        db.get('SELECT COUNT(*) as total FROM ielts_words', (err, row) => {
          console.log('\n' + '='.repeat(60));
          console.log(`✅ 词库总计：${row.total} 个单词`);
          console.log(`📊 本次新增：约 ${total} 词`);
          console.log('='.repeat(60));
          console.log('\n✅ 词库导入完成！\n');
          db.close();
        });
      }
    });
  } catch(err) {
    console.log(`❌ ${file}: ${err.message}`);
    pending--;
    if (pending === 0) db.close();
  }
});
