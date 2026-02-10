const fs = require('fs');
const { pool } = require('../database');

/**
 * 导入雅思词汇数据到数据库
 */
async function importIELTSWords() {
  try {
    console.log('开始导入雅思词汇数据...');
    
    // 读取词汇数据文件
    const wordsData = JSON.parse(fs.readFileSync('./seed-data/ielts-words-sample.json', 'utf8'));
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      let insertedCount = 0;
      for (const word of wordsData) {
        try {
          await client.query(
            `INSERT INTO ielts_words(
              word, phonetic, part_of_speech, definition, 
              example_sentences, frequency_level, cambridge_book
            ) VALUES($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (word, cambridge_book) DO NOTHING`,
            [
              word.word,
              word.phonetic || null,
              word.part_of_speech || null,
              word.definition,
              word.example_sentences || [],
              word.frequency_level || 'medium',
              word.cambridge_book
            ]
          );
          insertedCount++;
        } catch (error) {
          console.error(`插入单词失败: ${word.word}`, error.message);
        }
      }
      
      await client.query('COMMIT');
      console.log(`成功导入 ${insertedCount} 个雅思单词`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('导入词汇数据失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行导入
if (require.main === module) {
  importIELTSWords().then(() => {
    console.log('词汇数据导入完成！');
    process.exit(0);
  }).catch((error) => {
    console.error('导入过程出错:', error);
    process.exit(1);
  });
}

module.exports = { importIELTSWords };