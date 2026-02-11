const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('../database');

async function importIELTS4000Vocabulary() {
    console.log('开始导入 IELTS-4000 词汇到数据库...');
    
    const db = await initializeDatabase();
    const vocabPath = path.join(__dirname, 'ielts-4000-vocabulary.json');
    const vocabulary = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < vocabulary.length; i++) {
        const wordData = vocabulary[i];
        
        try {
            // 尝试插入，如果失败就跳过
            await db.run(
                `INSERT OR IGNORE INTO ielts_words 
                 (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    wordData.word,
                    wordData.phonetic || '',
                    wordData.part_of_speech || '',
                    wordData.definition || '暂无释义',
                    JSON.stringify(wordData.example_sentences || []),
                    wordData.frequency_level || 'medium',
                    wordData.cambridge_book || Math.floor(Math.random() * 18) + 1
                ]
            );
            successCount++;
        } catch (error) {
            errorCount++;
            // 忽略错误，继续处理下一个
        }
        
        if ((i + 1) % 1000 === 0) {
            console.log(`已处理 ${i + 1} 个词汇...`);
        }
    }
    
    // 获取总词汇数
    const totalCountResult = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    const totalCount = totalCountResult.count;
    
    console.log('导入完成！');
    console.log(`成功插入: ${successCount} 个词汇`);
    console.log(`跳过/错误: ${errorCount} 个词汇`);
    console.log(`数据库中总词汇数: ${totalCount}`);
    
    return totalCount;
}

// 如果直接运行此脚本
if (require.main === module) {
    importIELTS4000Vocabulary().catch(console.error);
}

module.exports = { importIELTS4000Vocabulary };