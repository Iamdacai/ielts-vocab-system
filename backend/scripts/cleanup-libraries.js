#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ielts_vocab.db');
const db = new sqlite3.Database(DB_PATH);

console.log('📚 开始整理词库...\n');

// 词库名称映射
const libraryMap = {
  '雅思词汇 4500+ 词汇 9400': 'IELTS 雅思核心',
  '词汇汇编 9800': 'IELTS 雅思高级',
  '词汇总编 9800 带音标 + 词汇 9400': 'IELTS 雅思高级',
  '托福词汇 4700+ 词汇 9400': 'TOEFL 托福核心',
  '托福 9000 词 Word': 'TOEFL 托福高级',
  'GRE 词汇 7500+ 词汇 9400': 'GRE 核心词汇',
  '3500 词汇高中词汇表': '高中课标词汇',
  '初中英语单词表大全 2182 个单词中考英语 1600 词汇对照表分类记忆法 (1)': '初中课标词汇',
  '小学英语常用单词汇总大全': '小学基础词汇',
  '05.大学英语四级词汇带默写版': 'CET-4 四级词汇',
  '05.大学英语六级词汇带默写版': 'CET-6 六级词汇',
  '考研英语大纲 5500 词汇【正序版 + 乱序版】': '考研核心词汇',
};

async function main() {
  // 1. 获取所有分类
  const categories = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT category FROM ielts_words WHERE category IS NOT NULL AND category != ""', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  console.log(`找到 ${categories.length} 个原始分类\n`);
  
  // 2. 更新分类名称
  for (const { category } of categories) {
    const newName = libraryMap[category] || category;
    
    if (newName !== category) {
      await new Promise((resolve, reject) => {
        db.run('UPDATE ielts_words SET category = ? WHERE category = ?', [newName, category], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log(`   ${category.substring(0, 40)} → ${newName}`);
    }
  }
  
  // 3. 统计每个词库
  console.log('\n📊 词库统计：');
  const stats = await new Promise((resolve, reject) => {
    db.all(`
      SELECT category, COUNT(*) as word_count 
      FROM ielts_words 
      GROUP BY category 
      ORDER BY word_count DESC
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  console.log('\n' + '='.repeat(60));
  let currentGroup = '';
  const groups = {
    'IELTS': '雅思',
    'TOEFL': '托福',
    'GRE': 'GRE',
    '考研': '考研',
    'CET': '四六级',
    '高中': '中小学',
    '初中': '中小学',
    '小学': '中小学',
    '真经': '雅思真经',
  };
  
  stats.forEach(stat => {
    const cat = stat.category || '(未分类)';
    const groupKey = Object.keys(groups).find(k => cat.includes(k)) || '其他';
    const group = groups[groupKey] || '其他';
    
    if (group !== currentGroup) {
      currentGroup = group;
      console.log(`\n【${group}】`);
    }
    console.log(`   ${cat}: ${stat.word_count.toLocaleString()} 词`);
  });
  
  // 4. 创建词库元数据表
  await new Promise((resolve, reject) => {
    db.run(`DROP TABLE IF EXISTS library_metadata`, resolve);
  });
  
  await new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE library_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        library_key TEXT UNIQUE NOT NULL,
        library_name TEXT NOT NULL,
        library_group TEXT,
        description TEXT,
        word_count INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, resolve);
  });
  
  // 5. 插入词库元数据
  let sortOrder = 0;
  const groupOrder = ['雅思', '托福', 'GRE', '考研', '四六级', '中小学', '雅思真经', '其他'];
  
  for (const group of groupOrder) {
    const libs = stats.filter(s => {
      const cat = s.category || '';
      const g = Object.keys(groups).find(k => cat.includes(k));
      return groups[g] === group;
    });
    
    for (const lib of libs) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO library_metadata 
          (library_key, library_name, library_group, word_count, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [lib.category, lib.category, group, lib.word_count, sortOrder++], resolve);
      });
    }
  }
  
  // 6. 最终统计
  const totalWords = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as total FROM ielts_words', (err, row) => {
      resolve(row ? row.total : 0);
    });
  });
  
  const totalLibraries = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as total FROM library_metadata', (err, row) => {
      resolve(row ? row.total : 0);
    });
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ 词库总计：${totalLibraries} 个`);
  console.log(`✅ 单词总计：${totalWords.toLocaleString()} 个`);
  console.log('='.repeat(60));
  console.log('\n✅ 词库整理完成！\n');
  
  db.close();
}

main().catch(console.error);
