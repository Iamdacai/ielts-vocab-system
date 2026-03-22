-- 添加词库来源和分类字段
ALTER TABLE ielts_words ADD COLUMN source TEXT DEFAULT '剑桥雅思 1-18';
ALTER TABLE ielts_words ADD COLUMN category TEXT;

-- 为现有数据设置默认值（剑桥词汇）
UPDATE ielts_words SET source = '剑桥雅思 1-18' WHERE source IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ielts_words_source ON ielts_words(source);
CREATE INDEX IF NOT EXISTS idx_ielts_words_category ON ielts_words(category);
