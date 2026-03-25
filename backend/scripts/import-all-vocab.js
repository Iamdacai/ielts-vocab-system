#!/usr/bin/env node
/**
 * 批量词库导入脚本 - 简化版
 * 导入所有 Excel 词库到数据库
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'ielts_vocab.db');
const REPO_ROOT = path.join(__dirname, '..');
const VOCAB_DIR = path.join(REPO_ROOT, 'vocabulary', '词汇总汇大纲');

// 数据库连接
const db = new sqlite3.Database(DB_PATH);

// 确保表存在
function ensureTables() {
  return Promise.all([
    new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, resolve);
    }),
    new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS word_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT UNIQUE NOT NULL,
        category TEXT,
        file_path TEXT,
        word_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, resolve);
    })
  ]);
}

// 从 Excel 导入
async function importExcel(filePath, category, source) {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  let inserted = 0;
  let skipped = 0;
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO ielts_words 
    (word, phonetic, part_of_speech, definition, category, source, frequency_level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  return new Promise((resolve) => {
    data.forEach((row, index) => {
      if (index === 0) return;
      
      let word = String(row[0] || '').trim();
      if (!word || word.length < 2) {
        skipped++;
        return;
      }
      
      stmt.run(
        word.toLowerCase(),
        row[1] || null,
        row[2] || null,
        row[3] || null,
        category,
        source,
        'medium'
      );
    });
    
    stmt.finalize((err) => {
      if (err) {
        console.error(`   ❌ ${err.message}`);
        resolve({ inserted: 0, skipped });
      } else {
        inserted = data.length - 1 - skipped;
        console.log(`   ✅ ${source}: ${inserted} 词`);
        resolve({ inserted, skipped });
      }
    });
  });
}

// 主函数
async function main() {
  console.log('📚 开始导入词库...\n');
  
  await ensureTables();
  
  const tasks = [
    // 雅思 - 优先级最高
    { file: '雅思词汇 4500+ 词汇 9400/【00】雅思必备词汇 4541.xlsx', cat: 'IELTS 核心', src: '雅思必备 4541' },
    { file: '雅思词汇 4500+ 词汇 9400/赠 3：词汇汇编 9400（P162）.xlsx', cat: 'IELTS 高级', src: '词汇汇编 9400' },
    
    // 高中 - 优先级高
    { file: '3500 词汇高中词汇表/3500 词汇乱序版/乱序带音标/3500 单词乱序版（带音标）.xlsx', cat: '高中课标', src: '高中 3500 词' },
    
    // 四级
    { file: '05.大学英语四级词汇带默写版/四级 Word 版本 - 可编辑', cat: 'CET-4', src: '大学英语四级', auto: true },
    
    // 六级
    { file: '05.大学英语六级词汇带默写版/六级 Word 版本 - 可编辑', cat: 'CET-6', src: '大学英语六级', auto: true },
    
    // 考研
    { file: '考研英语大纲 5500 词汇【正序版 + 乱序版】/01、正序版【Word＋PDF＋Excel 三种格式】', cat: '考研核心', src: '考研 5500 词', auto: true },
    
    // 托福
    { file: '托福词汇 4700+ 词汇 9400/【00】托福 word 版本', cat: 'TOEFL 核心', src: '托福词汇', auto: true },
    
    // GRE
    { file: 'GRE 词汇 7500+ 词汇 9400/GRE 词汇 word 版', cat: 'GRE 核心', src: 'GRE 词汇', auto: true }
  ];
  
  let total = 0;
  
  for (const task of tasks) {
    const fullPath = path.join(VOCAB_DIR, task.file);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  跳过：${task.file}`);
      continue;
    }
    
    console.log(`\n📖 ${task.src} (${task.cat})`);
    
    if (task.auto) {
      // 自动查找 Excel
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
      for (const f of files) {
        const result = await importExcel(path.join(fullPath, f), task.cat, task.src);
        total += result.inserted;
      }
    } else {
      const result = await importExcel(fullPath, task.cat, task.src);
      total += result.inserted;
    }
  }
  
  // 统计
  console.log('\n' + '='.repeat(60));
  await new Promise(resolve => {
    db.get('SELECT COUNT(*) as total FROM ielts_words', (err, row) => {
      console.log(`✅ 词库总计：${row.total} 个单词`);
      console.log(`📊 本次新增：约 ${total} 词`);
      resolve();
    });
  });
  
  db.close();
  console.log('\n✅ 词库导入完成！\n');
}

main().catch(console.error);
