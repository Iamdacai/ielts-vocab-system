-- ============================================
-- 迁移 002: 增强例句表支持 AI 生成
-- 创建时间：2026-03-30
-- 说明：为例句表添加 AI 生成相关字段
-- ============================================

-- 检查表是否存在，不存在则创建
CREATE TABLE IF NOT EXISTS word_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL,
  example_text TEXT NOT NULL,
  translation TEXT,
  source TEXT DEFAULT 'manual', -- 'manual' | 'ai' | 'imported'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (word_id) REFERENCES ielts_words(id) ON DELETE CASCADE
);

-- 添加 AI 生成标记
ALTER TABLE word_examples ADD COLUMN ai_generated INTEGER DEFAULT 0;

-- 兴趣标签（JSON 数组）
ALTER TABLE word_examples ADD COLUMN interest_tags TEXT;

-- 难度级别
ALTER TABLE word_examples ADD COLUMN difficulty_level TEXT DEFAULT 'medium' CHECK(difficulty_level IN ('easy', 'medium', 'hard'));

-- 场景分类（22 个雅思场景）
ALTER TABLE word_examples ADD COLUMN topic_category TEXT;

-- 反馈统计
ALTER TABLE word_examples ADD COLUMN feedback_count INTEGER DEFAULT 0;
ALTER TABLE word_examples ADD COLUMN positive_feedback INTEGER DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_word_examples_word_id ON word_examples(word_id);
CREATE INDEX IF NOT EXISTS idx_word_examples_ai ON word_examples(ai_generated);
CREATE INDEX IF NOT EXISTS idx_word_examples_topic ON word_examples(topic_category);

-- 添加示例数据（如果表是空的）
INSERT INTO word_examples (word_id, example_text, translation, source, ai_generated, difficulty_level)
SELECT id, 
       'This is an example sentence for ' || word,
       '这是 ' || word || ' 的示例句子',
       'system',
       0,
       'medium'
FROM ielts_words
WHERE (SELECT COUNT(*) FROM word_examples) = 0
LIMIT 100;
