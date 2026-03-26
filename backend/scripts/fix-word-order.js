#!/usr/bin/env node
/**
 * 修复词库中序号和单词颠倒的问题
 * 
 * 问题：部分 Excel 导入时列顺序错误，导致序号被当作单词，单词被当作音标
 * 例如：word='10', phonetic='even' 应该是 word='even', phonetic='[ˈi:vən]'
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ielts_vocab.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🔧 开始修复单词顺序问题...\n');

// 查找所有 word 是纯数字且长度较短的记录（这些是错误数据）
const query = `
  SELECT id, word, phonetic, part_of_speech, definition, category, source
  FROM ielts_words
  WHERE word GLOB '[0-9]*' 
    AND length(word) <= 3
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
    console.log(`  ${i + 1}. [${row.category}] word="${row.word}", phonetic="${row.phonetic}"`);
  });
  console.log();
  
  // 批量更新 - 使用同步方式
  let updated = 0;
  const updateStmt = db.prepare(`UPDATE ielts_words SET word = phonetic, phonetic = NULL WHERE id = ?`);
  
  db.exec('BEGIN');
  
  rows.forEach(row => {
    updateStmt.run(row.id);
    updated++;
  });
  
  updateStmt.finalize();
  db.exec('COMMIT');
  
  console.log(`✅ 成功修复 ${updated} 条记录\n`);
  
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
