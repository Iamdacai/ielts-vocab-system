#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 my-ielts 项目的词汇数据导入到背单词系统
数据源：/home/admin/.openclaw/workspace/my-ielts/src/pages/vocabulary/vocabulary.txt
目标：/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/vocabulary/ielts-materials/
"""

import json
import sqlite3
from pathlib import Path
from datetime import datetime

# 路径配置
MY_IELTS_DIR = Path('/home/admin/.openclaw/workspace/my-ielts/src/pages/vocabulary')
VOCAB_SYSTEM_DIR = Path('/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system')
OUTPUT_DIR = VOCAB_SYSTEM_DIR / 'vocabulary' / 'ielts-materials'
DB_PATH = VOCAB_SYSTEM_DIR / 'backend' / 'scripts' / 'ielts_vocab.db'

# 确保输出目录存在
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def parse_vocabulary_txt():
    """解析 vocabulary.txt 文件"""
    vocab_path = MY_IELTS_DIR / 'vocabulary.txt'
    content = vocab_path.read_text(encoding='utf-8')
    
    # 按章节分割
    categories = content.strip().split('===\n')
    
    all_words = []
    word_id = 0
    
    for category in categories:
        if not category.strip():
            continue
            
        parts = category.split('+++\n')
        if len(parts) < 2:
            continue
            
        category_name = parts[0].strip()
        category_body = parts[1]
        
        # 按词组分割
        word_groups = category_body.split('---\n')
        
        for group in word_groups:
            words = group.strip().split('\n')
            for word_line in words:
                if not word_line.strip():
                    continue
                    
                word_id += 1
                parts = word_line.split('|')
                
                # 解析字段：word|pos|meaning|example|extra
                word_data = {
                    'id': word_id,
                    'category': category_name,
                    'word': parts[0] if len(parts) > 0 else '',
                    'pos': parts[1] if len(parts) > 1 else '',
                    'meaning': parts[2] if len(parts) > 2 else '',
                    'example': parts[3] if len(parts) > 3 else '',
                    'extra': parts[4] if len(parts) > 4 else '',
                    'source': '雅思词汇真经（刘洪波）',
                    'frequency_level': 'high'  # 核心词汇默认为高频
                }
                
                # 处理多个单词变体（如 jeopardise/jeopardize）
                if '/' in word_data['word'] and not word_data['pos']:
                    # 这是单词的两种拼写形式
                    pass
                    
                all_words.append(word_data)
    
    return all_words


def export_to_json(words, output_file):
    """导出为 JSON 格式"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
    print(f"✅ 已导出 JSON: {output_file} ({len(words)} 个单词)")


def export_to_sqlite(words, db_path):
    """导入到 SQLite 数据库"""
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # 检查表结构，添加新字段
    try:
        # 添加 category 字段（如果不存在）
        cursor.execute("ALTER TABLE ielts_words ADD COLUMN category TEXT")
    except sqlite3.OperationalError as e:
        if "duplicate column" not in str(e).lower():
            print(f"字段已存在：{e}")
    
    try:
        # 添加 source 字段
        cursor.execute("ALTER TABLE ielts_words ADD COLUMN source TEXT")
    except sqlite3.OperationalError as e:
        if "duplicate column" not in str(e).lower():
            print(f"字段已存在：{e}")
    
    # 导入数据
    imported = 0
    for word in words:
        # 处理多个单词变体
        word_variants = word['word'].split('/')
        main_word = word_variants[0].strip()
        
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO ielts_words 
                (word, phonetic, part_of_speech, definition, example_sentences, 
                 frequency_level, category, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                main_word,
                '',  # phonetic - 需要从词典 API 获取
                word['pos'],
                word['meaning'],
                word['example'],
                word['frequency_level'],
                word['category'],
                word['source']
            ))
            if cursor.rowcount > 0:
                imported += 1
        except Exception as e:
            print(f"导入失败 {main_word}: {e}")
    
    conn.commit()
    conn.close()
    print(f"✅ 已导入数据库：{imported}/{len(words)} 个单词")
    
    return imported


def export_by_category(words, output_dir):
    """按类别导出为单独的 JSON 文件"""
    categories = {}
    for word in words:
        cat = word['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(word)
    
    for cat_name, cat_words in categories.items():
        # 生成安全的文件名
        safe_name = cat_name.replace('/', '_').replace('\\', '_')
        output_file = output_dir / f"{safe_name}.json"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(cat_words, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已按类别导出：{len(categories)} 个文件到 {output_dir}")


def generate_import_report(words, imported_count):
    """生成导入报告"""
    report = f"""# 词汇数据导入报告

**导入时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**数据源**: my-ielts 项目 - 雅思词汇真经（刘洪波）  
**原始文件**: `vocabulary.txt` (4698 行)

---

## 📊 数据统计

| 项目 | 数量 |
|------|------|
| 总词汇量 | {len(words)} |
| 成功导入 | {imported_count} |
| 分类数量 | {len(set(w['category'] for w in words))} |

---

## 📚 词汇分类

"""
    
    # 统计每个分类的词汇数量
    cat_stats = {}
    for word in words:
        cat = word['category']
        cat_stats[cat] = cat_stats.get(cat, 0) + 1
    
    for cat, count in sorted(cat_stats.items()):
        report += f"- {cat}: {count} 词\n"
    
    report += f"""

---

## 📁 导出文件

1. **完整 JSON**: `vocabulary/ielts-materials/ielts-vocab-zhenjing-complete.json`
2. **分类 JSON**: `vocabulary/ielts-materials/[分类名].json`
3. **数据库**: `backend/scripts/ielts_vocab.db`

---

## 🔧 使用方法

### 在小程序中使用新词库

1. **选择词库**：在学习配置页面选择"雅思词汇真经"词库
2. **按类别学习**：可选择特定主题（如自然地理、科技发明等）
3. **配套音频**：音频文件位于 `my-ielts/src/pages/vocabulary/audio/`

### API 新增字段

- `category`: 词汇分类（如"01_自然地理"）
- `source`: 词汇来源（如"雅思词汇真经（刘洪波）"）

---

## 🎯 后续优化

- [ ] 补充音标数据（可调用词典 API）
- [ ] 整合音频文件到背单词系统
- [ ] 添加词汇难度分级
- [ ] 生成记忆卡片

---

_生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_
"""
    
    report_file = VOCAB_SYSTEM_DIR / 'docs' / '词汇导入报告.md'
    report_file.write_text(report, encoding='utf-8')
    print(f"✅ 已生成报告：{report_file}")


def main():
    print("🚀 开始导入 my-ielts 词汇数据...")
    print(f"数据源：{MY_IELTS_DIR}")
    print(f"目标：{VOCAB_SYSTEM_DIR}")
    print()
    
    # 解析词汇
    print("📖 正在解析 vocabulary.txt...")
    words = parse_vocabulary_txt()
    print(f"✅ 解析完成：{len(words)} 个单词")
    print()
    
    # 导出 JSON
    json_file = OUTPUT_DIR / 'ielts-vocab-zhenjing-complete.json'
    export_to_json(words, json_file)
    
    # 按类别导出
    export_by_category(words, OUTPUT_DIR)
    
    # 导入数据库
    print()
    print("💾 正在导入到 SQLite 数据库...")
    imported = export_to_sqlite(words, DB_PATH)
    print()
    
    # 生成报告
    generate_import_report(words, imported)
    
    print()
    print("🎉 导入完成！")


if __name__ == '__main__':
    main()
