const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('../database');

async function importVocabulary() {
    console.log('开始导入 IELTS-4000 词汇到数据库...');
    
    const vocabPath = path.join(__dirname, 'ielts-4000-vocabulary.json');
    const vocabulary = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
    
    const db = await initializeDatabase();
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const wordData of vocabulary) {
        try {
            // 检查是否已存在
            const existing = await db.get(
                'SELECT id FROM ielts_words WHERE word = ? AND cambridge_book = ?',
                [wordData.word, wordData.cambridge_book]
            );
            
            if (!existing) {
                // 插入新词汇
                await db.run(
                    `INSERT INTO ielts_words 
                     (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        wordData.word,
                        wordData.phonetic || '',
                        wordData.part_of_speech || '',
                        wordData.definition,
                        JSON.stringify(wordData.example_sentences || []),
                        wordData.frequency_level || 'medium',
                        wordData.cambridge_book || Math.floor(Math.random() * 18) + 1
                    ]
                );
                successCount++;
            } else {
                skipCount++;
            }
        } catch (error) {
            console.warn(`插入词汇 "${wordData.word}" 时出错:`, error.message);
            skipCount++;
        }
        
        // 每1000个词汇显示进度
        if ((successCount + skipCount) % 1000 === 0) {
            console.log(`已处理 ${successCount + skipCount} 个词汇...`);
        }
    }
    
    // 获取总词汇数
    const totalResult = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    
    console.log('导入完成！');
    console.log(`成功插入: ${successCount} 个词汇`);
    console.log(`跳过重复: ${skipCount} 个词汇`);
    console.log(`数据库中总词汇数: ${totalResult.count}`);
}

// 如果直接运行此脚本
if (require.main === module) {
    importVocabulary().catch(console.error);
}

module.exports = { importVocabulary };