-- ============================================
-- 迁移 010: 添加用户写作能力字段
-- 创建时间：2026-03-30
-- 说明：扩展用户表支持写作能力画像
-- ============================================

-- 用户写作能力字段
ALTER TABLE users ADD COLUMN writing_level TEXT DEFAULT 'beginner' 
  CHECK(writing_level IN ('beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced'));

ALTER TABLE users ADD COLUMN writing_score INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN writing_weak_areas TEXT DEFAULT '[]'; -- JSON 数组

ALTER TABLE users ADD COLUMN writing_strong_areas TEXT DEFAULT '[]'; -- JSON 数组

ALTER TABLE users ADD COLUMN writing_goal_score INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN writing_practice_count INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN writing_total_words INTEGER DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_writing_level ON users(writing_level);

-- 创建用户写作统计视图
CREATE VIEW IF NOT EXISTS v_user_writing_profile AS
SELECT 
  u.id as user_id,
  u.openid,
  u.writing_level,
  u.writing_score,
  u.writing_goal_score,
  u.writing_practice_count,
  u.writing_total_words,
  COUNT(p.id) as total_practices,
  SUM(p.word_count) as total_words_written,
  AVG(p.ai_score) as recent_avg_score,
  AVG(p.task_response) as avg_task_response,
  AVG(p.coherence) as avg_coherence,
  AVG(p.vocabulary) as avg_vocabulary,
  AVG(p.grammar) as avg_grammar,
  MAX(p.created_at) as last_practice_at
FROM users u
LEFT JOIN writing_practice p ON u.id = p.user_id
GROUP BY u.id, u.openid, u.writing_level, u.writing_score, u.writing_goal_score, 
         u.writing_practice_count, u.writing_total_words;

-- 创建触发器：自动更新用户写作统计
CREATE TRIGGER IF NOT EXISTS update_user_writing_stats
AFTER INSERT ON writing_practice
BEGIN
  UPDATE users SET
    writing_practice_count = writing_practice_count + 1,
    writing_total_words = writing_total_words + NEW.word_count
  WHERE id = NEW.user_id;
END;
