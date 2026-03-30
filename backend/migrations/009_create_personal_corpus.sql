-- ============================================
-- 迁移 009: 创建个人语料库表
-- 创建时间：2026-03-30
-- 说明：存储用户积累的好词好句
-- ============================================

CREATE TABLE IF NOT EXISTS personal_corpus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_type TEXT CHECK(source_type IN ('writing', 'speaking', 'reading')),
  content TEXT NOT NULL,
  content_type TEXT CHECK(content_type IN ('sentence', 'paragraph', 'phrase', 'word')),
  topic_tags TEXT, -- JSON 数组
  vocabulary_used TEXT, -- JSON 数组
  ai_analysis TEXT, -- JSON AI 分析（亮点/用法等）
  usage_count INTEGER DEFAULT 0, -- 使用次数
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_corpus_user ON personal_corpus(user_id);
CREATE INDEX IF NOT EXISTS idx_corpus_topic ON personal_corpus(topic_tags);
CREATE INDEX IF NOT EXISTS idx_corpus_type ON personal_corpus(content_type);

-- 创建触发器：更新使用次数时自动更新 last_used_at
CREATE TRIGGER IF NOT EXISTS update_corpus_usage
AFTER UPDATE OF usage_count ON personal_corpus
BEGIN
  UPDATE personal_corpus SET last_used_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
