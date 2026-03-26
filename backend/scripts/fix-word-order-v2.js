#!/usr/bin/env node
/**
 * 修复词库中序号和单词颠倒的问题 (v2)
 * 
 * 问题：部分 Excel 导入时列顺序错误，导致：
 * - word = 序号 (如 "10")
 * - phonetic = 单词 (如 "even")  
 * - part_of_speech = 音标 (如 "[ˈi:vən]")
 * 
 * 修复：
 * - word = phonetic (原 phonetic 列的单词)
 * - phonetic = part_of_speech (原 part_of_speech 列的音标)
 * - part_of_speech = NULL
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ielts_vocab.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🔧 开始修复单词顺序问题 (v2)...\n');

// 查找所有 word 是纯数字且长度较短的记录
const query = `
  SELECT id, word, phonetic, part_of_speech, category, source
  FROM ielts_words
  WHERE word GLOB '[0-9]*' 
    AND length(word) <= 3
    AND phonetic IS NOT NULL 
    AND phonetic != ''
  ORDER BY id
`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('❌ 查询失败:', err.message);
    db.close();
    return;
  }
  
  console.log(`📊 发现 ${rows.length} 条需要修复的记录\n`);
  
  if (rows.length === 0) {
    console.log('✅ 无需修复，数据正常\n');
    db.close();
    return;
  }
  
  // 显示前 10 条示例
  console.log('📋 前 10 条示例（修复前）:');
  rows.slice(0, 10).forEach((row, i) => {
    console.log(`  ${i + 1}. [${row.category}] word="${row.word}", phonetic="${row.phonetic}", pos="${row.part_of_speech}"`);
  });
  console.log();
  
  // 批量更新
  let updated = 0;
  const updateStmt = db.prepare(`
    UPDATE ielts_words 
    SET word = ?, 
        phonetic = ?,
        part_of_speech = NULL
    WHERE id = ?
  `);
  
  db.exec('BEGIN');
  
  rows.forEach(row => {
    // word = 原 phonetic, phonetic = 原 part_of_speech
    updateStmt.run(row.phonetic, row.part_of_speech, row.id);
    updated++;
  });
  
  updateStmt.finalize();
  db.exec('COMMIT');
  
  console.log(`✅ 成功修复 ${updated} 条记录\n`);
  
  // 显示修复后的示例
  console.log('📋 修复后示例:');
  db.all(`SELECT id, word, phonetic, part_of_speech, category FROM ielts_words WHERE id IN (${rows.slice(0, 10).map(r => r.id).join(',')})`, (err, fixedRows) => {
    if (fixedRows && fixedRows.length > 0) {
      fixedRows.forEach((row, i) => {
        console.log(`  ${i + 1}. [${row.category}] word="${row.word}", phonetic="${row.phonetic}"`);
      });
    }
    console.log();
    
    // 验证修复结果
    db.get(`SELECT COUNT(*) as count FROM ielts_words WHERE word GLOB '[0-9]*' AND length(word) <= 3`, (err, row) => {
      if (row.count > 0) {
        console.log(`⚠️  仍有 ${row.count} 条记录未修复（可能是 phonetic 为空的记录）\n`);
      } else {
        console.log('✅ 所有错误记录已修复完成\n');
      }
      db.close();
    });
  });
});
