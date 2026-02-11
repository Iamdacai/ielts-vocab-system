const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// 解析Excel词汇文件
function parseExcelVocabulary(filePath) {
    console.log(`正在解析Excel文件: ${filePath}`);
    
    // 读取Excel文件
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 使用第一个工作表
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON数组
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
        console.log('Excel文件为空');
        return [];
    }
    
    // 检测标题行
    let headers = [];
    let startIndex = 0;
    
    // 假设第一行是标题
    if (typeof jsonData[0][0] === 'string' && jsonData[0][0].toLowerCase().includes('word')) {
        headers = jsonData[0].map(h => h.toString().toLowerCase());
        startIndex = 1;
    } else {
        // 自动生成标题
        const firstRow = jsonData[0];
        headers = firstRow.map((_, index) => `column_${index}`);
        startIndex = 0;
    }
    
    console.log(`检测到列: ${headers.join(', ')}`);
    
    const words = [];
    
    for (let i = startIndex; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        // 创建词汇对象
        const wordObj = {};
        for (let j = 0; j < headers.length && j < row.length; j++) {
            const header = headers[j];
            const value = row[j];
            
            if (value !== undefined && value !== null && value !== '') {
                wordObj[header] = value.toString().trim();
            }
        }
        
        // 确保有单词字段
        if (wordObj.word || wordObj.column_0) {
            const word = wordObj.word || wordObj.column_0;
            
            // 构建标准格式的词汇对象
            words.push({
                word: word,
                phonetic: wordObj.phonetic || wordObj['音标'] || '',
                part_of_speech: wordObj['part_of_speech'] || wordObj['词性'] || '',
                definition: wordObj.definition || wordObj['definition'] || wordObj['中文释义'] || wordObj.column_1 || '暂无释义',
                example_sentences: [],
                frequency_level: 'medium',
                cambridge_book: Math.floor(Math.random() * 18) + 1
            });
        }
    }
    
    console.log(`从Excel文件解析了 ${words.length} 个词汇`);
    return words;
}

// 主函数
async function main() {
    const excelPath = path.join(__dirname, '..', '..', 'vocabulary', 'ielts-materials', 'assets', 'Vocabulary', 'IELTS-4000-orchuulgatai-1.xlsx');
    
    if (!fs.existsSync(excelPath)) {
        console.error('Excel文件不存在:', excelPath);
        return;
    }
    
    const words = parseExcelVocabulary(excelPath);
    
    // 保存为JSON
    const outputPath = path.join(__dirname, 'excel-vocabulary.json');
    fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));
    console.log(`Excel词汇数据已保存到 ${outputPath}`);
    
    return words;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { parseExcelVocabulary, main };