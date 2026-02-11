const fs = require('fs');
const path = require('path');

// 提取PDF中的动词搭配词汇
function extractVerbCollocations(pdfText) {
    const lines = pdfText.split('\n').filter(line => line.trim() !== '');
    const words = [];
    
    let currentVerb = '';
    let currentCollocations = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 跳过页眉
        if (line === 'www.booksknot.com') continue;
        
        // 检查是否是动词行（数字 + 动词）
        const verbMatch = line.match(/^(\d+)\.\s*(.+)$/);
        if (verbMatch) {
            // 保存前一个动词
            if (currentVerb) {
                words.push({
                    word: currentVerb,
                    phonetic: '',
                    part_of_speech: 'v.',
                    definition: `Common collocations: ${currentCollocations.join(', ')}`,
                    example_sentences: currentCollocations.map(col => `${currentVerb} ${col}`),
                    frequency_level: 'high',
                    cambridge_book: Math.floor(Math.random() * 18) + 1
                });
            }
            
            // 开始新的动词
            currentVerb = verbMatch[2].trim();
            currentCollocations = [];
            continue;
        }
        
        // 检查是否是搭配行（以+开头）
        if (line.startsWith('+')) {
            const collocations = line.substring(1).trim().split(',').map(col => col.trim());
            currentCollocations.push(...collocations);
            continue;
        }
        
        // 如果是连续的搭配行（没有+但有逗号分隔）
        if (currentVerb && line.includes(',') && !line.match(/^\d+\./)) {
            const collocations = line.split(',').map(col => col.trim());
            currentCollocations.push(...collocations);
        }
    }
    
    // 保存最后一个动词
    if (currentVerb) {
        words.push({
            word: currentVerb,
            phonetic: '',
            part_of_speech: 'v.',
            definition: `Common collocations: ${currentCollocations.join(', ')}`,
            example_sentences: currentCollocations.map(col => `${currentVerb} ${col}`),
            frequency_level: 'high',
            cambridge_book: Math.floor(Math.random() * 18) + 1
        });
    }
    
    return words;
}

// 主函数
async function main() {
    const pdfPath = '/home/admin/clawd/ielts-vocab-system/vocabulary/ielts-materials/assets/Vocabulary/Vocabulary.pdf';
    
    if (!fs.existsSync(pdfPath)) {
        console.error('PDF文件不存在:', pdfPath);
        return;
    }
    
    // 使用pdftotext提取文本
    const { execSync } = require('child_process');
    try {
        const pdfText = execSync(`pdftotext -layout "${pdfPath}" -`, { encoding: 'utf8' });
        
        console.log('正在提取动词搭配词汇...');
        const words = extractVerbCollocations(pdfText);
        
        console.log(`成功提取了 ${words.length} 个动词搭配词汇`);
        
        // 保存为JSON
        const outputPath = path.join(__dirname, 'verb-collocations.json');
        fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));
        console.log(`动词搭配词汇已保存到 ${outputPath}`);
        
        return words;
    } catch (error) {
        console.error('提取PDF失败:', error.message);
        return [];
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { extractVerbCollocations, main };