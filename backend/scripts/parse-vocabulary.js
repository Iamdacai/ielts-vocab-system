const fs = require('fs');
const path = require('path');

// 读取Markdown文件并解析词汇
function parseVocabularyFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const words = [];
    
    // 按##分割每个词汇条目
    const entries = content.split('## ').filter(entry => entry.trim() !== '');
    
    for (const entry of entries) {
        try {
            // 提取词汇信息
            const lines = entry.split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) continue;
            
            // 第一行包含序号和词汇
            const firstLine = lines[0].trim();
            let word = '';
            let phonetic = '';
            
            // 处理 "1. word (phonetic)" 或 "1. word" 格式
            const match = firstLine.match(/^(\d+)\.\s+(.+?)(?:\s+\((.+?)\))?$/);
            if (match) {
                word = match[2].trim();
                phonetic = match[3] || '';
            } else {
                // 如果没有序号，直接取第一个单词
                word = firstLine.split(' ')[0] || firstLine;
            }
            
            // 查找定义部分
            let definition = '';
            let exampleSentences = [];
            let partOfSpeech = '';
            
            // 查找代码块中的主要定义
            const codeBlockMatch = entry.match(/```([^`]+)```/);
            if (codeBlockMatch) {
                definition = codeBlockMatch[1].trim().replace(/\n/g, ' ');
            }
            
            // 如果没有代码块定义，尝试从其他部分提取
            if (!definition) {
                // 查找数字列表定义
                const numberedDefs = entry.match(/\d+\.\s+([^\n]+)/g);
                if (numberedDefs) {
                    definition = numberedDefs.map(def => def.replace(/^\d+\.\s+/, '')).join('; ');
                }
            }
            
            // 提取例句（查找包含引号的行）
            const quoteMatches = entry.match(/["“][^"”]*["”]/g);
            if (quoteMatches) {
                exampleSentences = quoteMatches.slice(0, 3); // 最多3个例句
            }
            
            // 确保有基本数据
            if (word && definition) {
                words.push({
                    word: word,
                    phonetic: phonetic,
                    part_of_speech: partOfSpeech,
                    definition: definition,
                    example_sentences: exampleSentences,
                    frequency_level: 'medium', // 默认中等频率
                    cambridge_book: Math.floor(Math.random() * 18) + 1 // 随机分配1-18
                });
            }
        } catch (error) {
            console.warn('解析词汇条目时出错:', error.message);
            continue;
        }
    }
    
    return words;
}

// 主函数
async function main() {
    const vocabDir = path.join(__dirname, '..', '..', 'vocabulary', 'ielts-materials', 'assets', 'Vocabulary');
    const outputWords = [];
    
    // 解析所有List文件
    const listFiles = ['List_1.md', 'List_2.md', 'List_3.md'];
    
    for (const file of listFiles) {
        const filePath = path.join(vocabDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`正在解析 ${file}...`);
            const words = parseVocabularyFile(filePath);
            outputWords.push(...words);
            console.log(`从 ${file} 解析了 ${words.length} 个词汇`);
        }
    }
    
    console.log(`总共解析了 ${outputWords.length} 个词汇`);
    
    // 保存为JSON文件
    const outputPath = path.join(__dirname, 'parsed-vocabulary.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputWords, null, 2));
    console.log(`词汇数据已保存到 ${outputPath}`);
    
    return outputWords;
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { parseVocabularyFile, main };