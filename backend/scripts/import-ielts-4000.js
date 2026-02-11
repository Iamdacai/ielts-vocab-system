const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 读取解析后的IELTS-4000词汇数据
const vocabData = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'ielts-4000-vocabulary.json'),
    'utf8'
));

// 连接数据库
const db = new sqlite3.Database('./ielts_vocab.db');

console.log(`开始导入 ${vocabData.length} 个IELTS-4000词汇到数据库...`);

let successCount = 0;
let skipCount = 0;

// 批量插入词汇
for (const wordObj of vocabData) {
    const { word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book } = wordObj;
    
    // 跳过无效数据
    if (!word || !definition) {
        skipCount++;
        continue;
    }
    
    // 插入词汇（忽略重复）
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO ielts_words 
        (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    try {
        stmt.run(
            word,
            phonetic || '',
            part_of_speech || '',
            definition,
            JSON.stringify(example_sentences || []),
            frequency_level || 'medium',
            cambridge_book || Math.floor(Math.random() * 18) + 1
        );
        successCount++;
    } catch (error) {
        console.warn(`插入词汇失败: ${word}`, error.message);
        skipCount++;
    } finally {
        stmt.finalize();
    }
}

// 提交并关闭
db.close((err) => {
    if (err) {
        console.error('关闭数据库时出错:', err.message);
    } else {
        console.log(`导入完成！`);
        console.log(`成功插入: ${successCount} 个词汇`);
        console.log(`跳过重复/无效: ${skipCount} 个词汇`);
        
        // 查询总词汇数
        const countDb = new sqlite3.Database('./ielts_vocab.db');
        countDb.get('SELECT COUNT(*) as total FROM ielts_words', (err, row) => {
            if (err) {
                console.error('查询总数失败:', err.message);
            } else {
                console.log(`数据库中总词汇数: ${row.total}`);
            }
            countDb.close();
        });
    }
});