#!/usr/bin/env node
/**
 * 修复音标字段
 * 
 * 上一步修复后，音标数据在 part_of_speech 字段，需要移到 phonetic 字段
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ielts_vocab.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🔧 开始修复音标字段...\n');

// 查找 phonetic 为空但 part_of_speech 包含音标的记录
const query = `
  SELECT id, word, phonetic, part_of_speech, category
  FROM ielts_words
  WHERE (phonetic IS NULL OR phonetic = '')
    AND part_of_speech IS NOT NULL 
    AND part_of_speech != ''
    AND (part_of_speech LIKE '[%' OR part_of_speech LIKE '/%')
  LIMIT 10000
`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('❌ 查询失败:', err.message);
    db.close();
    return;
  }
  
  console.log(`📊 发现 ${rows.length} 条需要修复的记录\n`);
  
  if (rows.length === 0) {
    console.log('✅ 无需修复，音标数据正常\n');
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
    SET phonetic = part_of_speech,
        part_of_speech = NULL
    WHERE id = ?
  `);
  
  db.exec('BEGIN');
  
  rows.forEach(row => {
    updateStmt.run(row.id);
    updated++;
  });
  
  updateStmt.finalize();
  db.exec('COMMIT');
  
  console.log(`✅ 成功修复 ${updated} 条记录\n`);
  
  // 显示修复后的示例
  console.log('📋 修复后示例:');
  db.all(`SELECT id, word, phonetic, part_of_speech FROM ielts_words WHERE id IN (${rows.slice(0, 10).map(r => r.id).join(',')})`, (err, fixedRows) => {
    if (fixedRows && fixedRows.length > 0) {
      fixedRows.forEach((row, i) => {
        console.log(`  ${i + 1}. word="${row.word}", phonetic="${row.phonetic}"`);
      });
    }
    console.log();
    console.log('✅ 音标修复完成\n');
    db.close();
  });
});
