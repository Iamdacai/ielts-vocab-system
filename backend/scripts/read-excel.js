const xlsx = require('xlsx');
const fs = require('fs');

// 读取Excel文件并显示前几行
const filePath = '/home/admin/clawd/ielts-vocab-system/vocabulary/ielts-materials/assets/Vocabulary/IELTS-4000-orchuulgatai-1.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    console.log('工作表名称:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 获取前10行数据
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    console.log(`总行数: ${jsonData.length}`);
    console.log('前5行数据:');
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        console.log(`行 ${i}:`, jsonData[i]);
    }
    
    // 尝试不同的解析方式
    console.log('\n尝试标准JSON解析:');
    const jsonStandard = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    console.log('前3个对象:');
    console.log(jsonStandard.slice(0, 3));
    
} catch (error) {
    console.error('读取Excel文件失败:', error.message);
}