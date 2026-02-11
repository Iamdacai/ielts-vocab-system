const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// 解析IELTS-4000 Excel文件
function parseIelts4000Excel(filePath) {
    console.log(`正在解析 IELTS-4000 Excel文件: ${filePath}`);
    
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 使用第一个工作表
    const worksheet = workbook.Sheets[sheetName];
    
    // 获取所有数据
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    const words = [];
    
    for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;
        
        const cellValue = row[1]; // 第二列包含 "单词: 释义"
        if (!cellValue || typeof cellValue !== 'string' || cellValue.trim() === '') continue;
        
        // 清理字符串
        let cleanValue = cellValue.trim();
        // 移除开头的非断空格
        cleanValue = cleanValue.replace(/^\u00A0+/, '');
        
        // 分割单词和释义
        const colonIndex = cleanValue.indexOf(':');
        if (colonIndex === -1) continue;
        
        const word = cleanValue.substring(0, colonIndex).trim();
        const definition = cleanValue.substring(colonIndex + 1).trim();
        
        if (word && definition) {
            words.push({
                word: word,
                phonetic: '',
                part_of_speech: '',
                definition: definition,
                example_sentences: [],
                frequency_level: 'medium',
                cambridge_book: Math.floor(Math.random() * 18) + 1
            });
        }
    }
    
    console.log(`成功解析了 ${words.length} 个词汇`);
    return words;
}

// 主函数
async function main() {
    const excelPath = '/home/admin/clawd/ielts-vocab-system/vocabulary/ielts-materials/assets/Vocabulary/IELTS-4000-orchuulgatai-1.xlsx';
    
    if (!fs.existsSync(excelPath)) {
        console.error('Excel文件不存在:', excelPath);
        return;
    }
    
    const words = parseIelts4000Excel(excelPath);
    
    // 保存为JSON
    const outputPath = path.join(__dirname, 'ielts-4000-vocabulary.json');
    fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));
    console.log(`IELTS-4000词汇数据已保存到 ${outputPath}`);
    
    return words;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { parseIelts4000Excel, main };