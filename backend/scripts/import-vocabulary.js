const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

async function importVocabulary() {
    const dbPath = path.join(__dirname, '..', 'ielts_vocab.db');
    const db = new sqlite3.Database(dbPath);
    
    // 读取解析后的词汇数据
    const vocabDataPath = path.join(__dirname, 'parsed-vocabulary.json');
    const vocabulary = JSON.parse(fs.readFileSync(vocabDataPath, 'utf8'));
    
    console.log(`开始导入 ${vocabulary.length} 个词汇到数据库...`);
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const word of vocabulary) {
        try {
            // 确保例句是字符串格式
            const exampleSentences = Array.isArray(word.example_sentences) 
                ? JSON.stringify(word.example_sentences)
                : word.example_sentences || '[]';
            
            // 插入词汇数据
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT OR IGNORE INTO ielts_words 
                     (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        word.word,
                        word.phonetic || '',
                        word.part_of_speech || '',
                        word.definition,
                        exampleSentences,
                        word.frequency_level || 'medium',
                        word.cambridge_book || Math.floor(Math.random() * 18) + 1
                    ],
                    function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            if (this.changes > 0) {
                                insertedCount++;
                            } else {
                                skippedCount++;
                            }
                            resolve();
                        }
                    }
                );
            });
        } catch (error) {
            console.error(`插入词汇 "${word.word}" 时出错:`, error.message);
        }
    }
    
    // 查询总词汇数
    const totalCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM ielts_words', (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
        });
    });
    
    console.log(`导入完成！`);
    console.log(`成功插入: ${insertedCount} 个词汇`);
    console.log(`跳过重复: ${skippedCount} 个词汇`);
    console.log(`数据库中总词汇数: ${totalCount}`);
    
    db.close();
}

// 如果直接运行此脚本
if (require.main === module) {
    importVocabulary().catch(console.error);
}

module.exports = { importVocabulary };