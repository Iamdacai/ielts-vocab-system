#!/usr/bin/env node
/**
 * IELTS 词汇搭配库导入脚本
 * 从 vocabulary-full.txt 导入词汇搭配到数据库
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ielts_vocab.db');
const VOCAB_FILE = path.join(__dirname, 'vocabulary-full.txt');

// 数据库连接
const db = new sqlite3.Database(DB_PATH);

// 解析词汇搭配文件
function parseVocabularyFile() {
  const content = fs.readFileSync(VOCAB_FILE, 'utf-8');
  const lines = content.split('\n');
  
  const categories = [];
  let currentCategory = null;
  let currentWord = null;
  
  lines.forEach(line => {
    // 检测分类标题（Verbs, Nouns, Adjectives 等）
    if (line.trim() === 'Verbs' || line.trim() === 'Nouns' || 
        line.trim() === 'Adjectives' || line.trim() === 'Adverbs') {
      currentCategory = line.trim();
      categories.push({
        name: currentCategory,
        words: []
      });
      return;
    }
    
    // 检测单词行（格式：数字。单词 + 搭配）
    const wordMatch = line.match(/^\s*(\d+)\.\s+(\w+)\s*\+\s*(.+)$/);
    if (wordMatch && currentCategory) {
      const [, num, word, collocations] = wordMatch;
      currentWord = {
        num: parseInt(num),
        word: word,
        partOfSpeech: currentCategory,
        collocations: collocations.split(',').map(c => c.trim()).filter(c => c.length > 0)
      };
      
      const lastCategory = categories[categories.length - 1];
      if (lastCategory && lastCategory.name === currentCategory) {
        lastCategory.words.push(currentWord);
      }
    }
  });
  
  return categories;
}

// 创建搭配表
function createCollocationsTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS word_collocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        part_of_speech TEXT,
        collocation TEXT NOT NULL,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(word, collocation)
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// 导入搭配数据
function importCollocations(categories) {
  return new Promise((resolve, reject) => {
    let total = 0;
    let inserted = 0;
    
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO word_collocations (word, part_of_speech, collocation, category)
      VALUES (?, ?, ?, ?)
    `);
    
    categories.forEach(category => {
      category.words.forEach(wordData => {
        wordData.collocations.forEach(collocation => {
          total++;
          stmt.run(wordData.word, wordData.partOfSpeech, collocation, category.name, (err) => {
            if (err) {
              console.error(`导入失败：${wordData.word} + ${collocation}`);
            } else {
              inserted++;
            }
            
            if (total === inserted || total === categories.reduce((sum, c) => sum + c.words.length, 0) * 10) {
              stmt.finalize((err) => {
                if (err) reject(err);
                else resolve({ total, inserted });
              });
            }
          });
        });
      });
    });
  });
}

// 更新现有单词表，添加搭配信息
function updateWordsWithCollocations() {
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE ielts_words 
      SET example_sentences = COALESCE(example_sentences, '') || 
        (SELECT GROUP_CONCAT(word || ' + ' || collocation, '; ') 
         FROM word_collocations 
         WHERE word = ielts_words.word)
      WHERE EXISTS (
        SELECT 1 FROM word_collocations 
        WHERE word = ielts_words.word
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// 主函数
async function main() {
  console.log('📚 开始导入 IELTS 词汇搭配库...\n');
  
  try {
    // 解析文件
    console.log('1️⃣ 解析词汇搭配文件...');
    const categories = parseVocabularyFile();
    console.log(`   找到 ${categories.length} 个分类`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name}: ${cat.words.length} 个单词`);
    });
    
    // 创建表
    console.log('\n2️⃣ 创建搭配数据表...');
    await createCollocationsTable();
    console.log('   ✅ 表创建成功');
    
    // 导入数据
    console.log('\n3️⃣ 导入搭配数据...');
    const result = await importCollocations(categories);
    console.log(`   ✅ 导入完成：${result.inserted} 条搭配记录`);
    
    // 统计
    console.log('\n4️⃣ 统计数据...');
    await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM word_collocations', (err, row) => {
        if (err) {
          console.log('   统计失败');
        } else {
          console.log(`   📊 搭配库总计：${row.count} 条记录`);
        }
        resolve();
      });
    });
    
    console.log('\n✅ 词汇搭配库导入完成！\n');
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
