-- ============================================
-- 迁移 007: 创建写作练习记录表
-- 创建时间：2026-03-30
-- 说明：存储用户写作练习和 AI 批改结果
-- ============================================

CREATE TABLE IF NOT EXISTS writing_practice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  topic_id INTEGER,
  topic TEXT NOT NULL,
  essay_type TEXT NOT NULL CHECK(essay_type IN ('task1', 'task2', 'general')),
  user_essay TEXT NOT NULL,
  word_count INTEGER,
  ai_score INTEGER, -- 总分 (0-100)
  task_response INTEGER, -- 任务回应
  coherence INTEGER, -- 连贯性
  vocabulary INTEGER, -- 词汇
  grammar INTEGER, -- 语法
  ai_feedback TEXT, -- JSON 格式详细反馈
  improved_version TEXT, -- AI 改写版本
  highlighted_errors TEXT, -- JSON 格式错误标注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_writing_user ON writing_practice(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_type ON writing_practice(essay_type);
CREATE INDEX IF NOT EXISTS idx_writing_created ON writing_practice(created_at);

-- 创建视图：用户写作练习统计
CREATE VIEW IF NOT EXISTS v_user_writing_summary AS
SELECT 
  u.id as user_id,
  u.openid,
  COUNT(p.id) as total_practices,
  SUM(p.word_count) as total_words,
  AVG(p.ai_score) as avg_score,
  AVG(p.task_response) as avg_task_response,
  AVG(p.coherence) as avg_coherence,
  AVG(p.vocabulary) as avg_vocabulary,
  AVG(p.grammar) as avg_grammar,
  MAX(p.created_at) as last_practice_at
FROM users u
LEFT JOIN writing_practice p ON u.id = p.user_id
GROUP BY u.id, u.openid;
