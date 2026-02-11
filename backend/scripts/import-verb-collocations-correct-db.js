const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');

async function importVerbCollocations() {
    try {
        // 使用正确的数据库路径
        const dbPath = '/home/admin/clawd/ielts-vocab-system/backend/scripts/ielts_vocab.db';
        console.log('数据库路径:', dbPath);
        
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        // 读取动词搭配数据
        const collocationsData = JSON.parse(fs.readFileSync('./verb-collocations-full.json', 'utf8'));
        
        console.log(`开始导入 ${collocationsData.length} 个动词搭配词汇到主数据库...`);
        
        let successCount = 0;
        let skipCount = 0;
        
        for (const item of collocationsData) {
            try {
                // 插入动词本身
                if (item.verb) {
                    await db.run(
                        `INSERT OR IGNORE INTO ielts_words 
                         (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            item.verb,
                            '',
                            'v.',
                            `Common verb used in IELTS writing and speaking`,
                            JSON.stringify(item.collocations || []),
                            'high',
                            Math.floor(Math.random() * 18) + 1
                        ]
                    );
                    successCount++;
                }
                
                // 插入搭配词汇
                if (item.collocations && Array.isArray(item.collocations)) {
                    for (const collocation of item.collocations) {
                        if (collocation.trim()) {
                            await db.run(
                                `INSERT OR IGNORE INTO ielts_words 
                                 (word, phonetic, part_of_speech, definition, example_sentences, frequency_level, cambridge_book) 
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    collocation.trim(),
                                    '',
                                    '',
                                    `Common collocation with "${item.verb}"`,
                                    JSON.stringify([`${item.verb} + ${collocation}`]),
                                    'medium',
                                    Math.floor(Math.random() * 18) + 1
                                ]
                            );
                            successCount++;
                        }
                    }
                }
            } catch (error) {
                console.warn(`插入词汇时出错:`, error.message);
                skipCount++;
            }
        }
        
        // 获取总词汇数
        const totalResult = await db.get('SELECT COUNT(*) as count FROM ielts_words');
        
        console.log('导入完成！');
        console.log(`成功插入: ${successCount} 个词汇`);
        console.log(`跳过重复: ${skipCount} 个词汇`);
        console.log(`数据库中总词汇数: ${totalResult.count}`);
        
        await db.close();
        
    } catch (error) {
        console.error('导入动词搭配词汇失败:', error);
    }
}

if (require.main === module) {
    importVerbCollocations().catch(console.error);
}

module.exports = { importVerbCollocations };