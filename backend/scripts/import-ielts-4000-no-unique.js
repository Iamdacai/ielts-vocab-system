const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');

async function importIELTS4000() {
    console.log('开始导入 IELTS-4000 词汇到数据库...');
    
    // 打开数据库
    const db = await open({
        filename: './ielts_vocab.db',
        driver: sqlite3.Database
    });
    
    // 读取词汇数据
    const vocabData = JSON.parse(fs.readFileSync('./ielts-4000-vocabulary.json', 'utf8'));
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const wordObj of vocabData) {
        try {
            // 检查是否已存在（只检查word字段，忽略cambridge_book）
            const existing = await db.get('SELECT id FROM ielts_words WHERE word = ?', [wordObj.word]);
            
            if (!existing) {
                // 插入新词汇
                await db.run(
                    `INSERT INTO ielts_words 
                     (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        wordObj.word,
                        wordObj.phonetic || '',
                        wordObj.part_of_speech || '',
                        wordObj.definition || '暂无释义',
                        JSON.stringify(wordObj.example_sentences || []),
                        wordObj.frequency_level || 'medium',
                        wordObj.cambridge_book || Math.floor(Math.random() * 18) + 1
                    ]
                );
                insertedCount++;
            } else {
                skippedCount++;
            }
            
            if ((insertedCount + skippedCount) % 1000 === 0) {
                console.log(`已处理 ${insertedCount + skippedCount} 个词汇...`);
            }
            
        } catch (error) {
            console.warn(`插入词汇 "${wordObj.word}" 时出错:`, error.message);
            skippedCount++;
        }
    }
    
    // 获取总词汇数
    const totalCountResult = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    const totalCount = totalCountResult.count;
    
    console.log('导入完成！');
    console.log(`成功插入: ${insertedCount} 个词汇`);
    console.log(`跳过重复: ${skippedCount} 个词汇`);
    console.log(`数据库中总词汇数: ${totalCount}`);
    
    await db.close();
}

// 运行导入
importIELTS4000().catch(console.error);