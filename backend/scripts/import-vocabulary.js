#!/usr/bin/env node
/**
 * 导入刘洪波词汇真经数据到数据库
 * 数据源：ielts-reference/src/pages/vocabulary/vocabulary.js
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 数据库路径
const DB_PATH = path.join(__dirname, 'ielts_vocab.db');
const db = new sqlite3.Database(DB_PATH);

// 词汇数据文件路径
const VOCABULARY_FILE = path.join(__dirname, '../../../../ielts-reference/src/pages/vocabulary/vocabulary.js');

console.log('📚 开始导入刘洪波词汇真经...');
console.log('📁 数据源:', VOCABULARY_FILE);
console.log('💾 数据库:', DB_PATH);

// 读取词汇数据
const vocabularyContent = fs.readFileSync(VOCABULARY_FILE, 'utf-8');

// 提取 vocabulary 对象 - 使用更健壮的解析方式
const startMarker = 'export default ';
const startIndex = vocabularyContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error('❌ 无法找到 export default 标记');
  process.exit(1);
}

const jsonStr = vocabularyContent.substring(startIndex + startMarker.length);
let vocabularyData;

try {
  // 使用更可靠的方式解析 - 移除可能的变量引用
  const cleanJson = jsonStr.replace(/vocabulary\s*=/g, '').trim();
  vocabularyData = new Function('return ' + cleanJson)();
  console.log('✅ 数据解析成功');
  console.log('📊 词群数量:', Object.keys(vocabularyData).length);
} catch (err) {
  console.error('❌ 解析失败:', err.message);
  // 尝试写入调试信息
  fs.writeFileSync('/tmp/vocab-debug.json', jsonStr.substring(0, 1000));
  process.exit(1);
}

// 创建词库表
db.serialize(() => {
  // 创建词库分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS vocabulary_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      audio TEXT,
      group_count INTEGER,
      word_count INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建单词表（如果不存在）
  db.run(`
    CREATE TABLE IF NOT EXISTS ielts_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      phonetic TEXT,
      part_of_speech TEXT,
      definition TEXT,
      example_sentences TEXT,
      frequency_level TEXT,
      cambridge_book INTEGER,
      category_id INTEGER,
      group_label TEXT,
      extra_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES vocabulary_categories(id)
    )
  `);

  // 插入数据
  let totalWords = 0;
  let totalCategories = 0;
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO ielts_words 
    (word, phonetic, part_of_speech, definition, example_sentences, category_id, group_label, extra_info)
    VALUES (?, '', ?, ?, ?, ?, ?, ?)
  `);

  const categoryStmt = db.prepare(`
    INSERT OR REPLACE INTO vocabulary_categories (name, label, audio, group_count, word_count)
    VALUES (?, ?, ?, ?, ?)
  `);

  // 遍历所有词群
  Object.entries(vocabularyData).forEach(([categoryKey, categoryData], categoryIndex) => {
    const categoryName = categoryKey;
    const categoryLabel = categoryData.label;
    const audio = categoryData.audio;
    const groupCount = categoryData.groupCount;
    const wordCount = categoryData.wordCount;

    // 插入词库分类
    categoryStmt.run(categoryName, categoryLabel, audio, groupCount, wordCount, function(err) {
      if (err) {
        console.error('❌ 插入词库分类失败:', categoryLabel, err.message);
      } else {
        totalCategories++;
        console.log(`✅ 词库分类：${categoryLabel} (${wordCount}词)`);
      }
    });

    const categoryId = this.lastID || (categoryIndex + 1);

    // 遍历所有词组
    categoryData.words.forEach((wordGroup) => {
      wordGroup.forEach((wordItem) => {
        const word = Array.isArray(wordItem.word) ? wordItem.word[0] : wordItem.word;
        const pos = wordItem.pos;
        const meaning = wordItem.meaning;
        const example = wordItem.example;
        const extra = wordItem.extra;

        stmt.run(word, pos, meaning, example, categoryId, categoryLabel, extra, function(err) {
          if (err) {
            console.error('❌ 插入单词失败:', word, err.message);
          } else {
            totalWords++;
          }
        });
      });
    });
  });

  stmt.finalize();
  categoryStmt.finalize();

  // 等待所有插入完成
  setTimeout(() => {
    db.get('SELECT COUNT(*) as count FROM ielts_words', (err, row) => {
      if (err) {
        console.error('❌ 查询失败:', err.message);
      } else {
        console.log('\n🎉 导入完成！');
        console.log('📊 总单词数:', row.count);
        console.log('📚 词库分类:', totalCategories);
        console.log('💾 数据库文件:', DB_PATH);
      }
      db.close();
    });
  }, 3000);
});
