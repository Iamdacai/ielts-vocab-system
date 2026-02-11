const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

async function importVerbCollocations() {
    console.log('开始导入动词搭配词汇到数据库...');
    
    // 打开数据库
    const db = await open({
        filename: path.join(__dirname, '..', 'ielts_vocab.db'),
        driver: sqlite3.Database
    });
    
    // 读取动词搭配数据
    const collocationsData = JSON.parse(fs.readFileSync(
        path.join(__dirname, 'verb-collocations.json'), 
        'utf8'
    ));
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const wordObj of collocationsData) {
        try {
            // 检查是否已存在
            const existing = await db.get(
                'SELECT id FROM ielts_words WHERE word = ? AND cambridge_book = ?',
                [wordObj.word, wordObj.cambridge_book]
            );
            
            if (!existing) {
                // 插入新词汇
                await db.run(
                    `INSERT INTO ielts_words 
                     (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        wordObj.word,
                        wordObj.phonetic,
                        wordObj.part_of_speech,
                        wordObj.definition,
                        JSON.stringify(wordObj.example_sentences),
                        wordObj.frequency_level,
                        wordObj.cambridge_book
                    ]
                );
                insertedCount++;
            } else {
                skippedCount++;
            }
        } catch (error) {
            console.warn(`插入词汇 "${wordObj.word}" 时出错:`, error.message);
            skippedCount++;
        }
    }
    
    // 获取总词汇数
    const totalResult = await db.get('SELECT COUNT(*) as count FROM ielts_words');
    
    console.log(`导入完成！`);
    console.log(`成功插入: ${insertedCount} 个词汇`);
    console.log(`跳过重复: ${skippedCount} 个词汇`);
    console.log(`数据库中总词汇数: ${totalResult.count}`);
    
    await db.close();
}

if (require.main === module) {
    importVerbCollocations().catch(console.error);
}

module.exports = { importVerbCollocations };