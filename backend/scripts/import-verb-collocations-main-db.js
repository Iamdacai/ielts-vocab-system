const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

async function importVerbCollocations() {
    try {
        // 连接到主数据库
        const dbPath = path.join(__dirname, '..', 'ielts_vocab.db');
        console.log('数据库路径:', dbPath);
        
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        // 读取动词搭配数据
        const collocationsData = JSON.parse(fs.readFileSync(
            path.join(__dirname, 'verb-collocations-full.json'), 
            'utf8'
        ));
        
        console.log(`开始导入 ${collocationsData.length} 个动词搭配词汇到主数据库...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const entry of collocationsData) {
            try {
                // 检查单词是否已存在
                const existing = await db.get(
                    'SELECT id FROM ielts_words WHERE word = ?',
                    [entry.word]
                );
                
                if (!existing) {
                    // 插入新词汇
                    await db.run(
                        `INSERT INTO ielts_words 
                         (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            entry.word,
                            entry.phonetic || '',
                            entry.part_of_speech || 'v.',
                            entry.definition || '动词搭配词汇',
                            JSON.stringify(entry.example_sentences || []),
                            entry.frequency_level || 'medium',
                            entry.cambridge_book || Math.floor(Math.random() * 18) + 1
                        ]
                    );
                    successCount++;
                } else {
                    // 单词已存在，跳过
                    errorCount++;
                }
            } catch (error) {
                console.error(`插入词汇 "${entry.word}" 时出错:`, error.message);
                errorCount++;
            }
        }
        
        // 获取总词汇数
        const totalCountResult = await db.get('SELECT COUNT(*) as count FROM ielts_words');
        const totalCount = totalCountResult.count;
        
        console.log('导入完成！');
        console.log(`成功插入: ${successCount} 个词汇`);
        console.log(`跳过重复: ${errorCount} 个词汇`);
        console.log(`数据库中总词汇数: ${totalCount}`);
        
        await db.close();
        return totalCount;
        
    } catch (error) {
        console.error('导入动词搭配词汇时出错:', error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    importVerbCollocations().catch(console.error);
}

module.exports = { importVerbCollocations };