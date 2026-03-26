const XLSX = require('xlsx');
const path = require('path');

const base = '/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/vocabulary/VOC';
const files = ['GRE 单词表 7496.xlsx', '雅思单词表 441.xlsx'];

files.forEach(f => {
  const wb = XLSX.readFile(path.join(base, f));
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1});
  console.log('\n' + f + ':');
  console.log('总行数:', data.length);
  console.log('第 1 行 (表头):', data[0]);
  console.log('第 2 行 (示例):', data[1]);
  console.log('列结构: 序号=' + (data[1]?data[1][0]:'') + ', 单词=' + (data[1]?data[1][1]:'') + ', 音标=' + (data[1]?data[1][2]:'') + ', 释义=' + (data[1]?data[1][3]:''));
});
