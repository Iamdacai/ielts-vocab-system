-- ============================================
-- 迁移 006: 添加用户口语能力字段
-- 创建时间：2026-03-30
-- 说明：扩展用户表支持口语能力画像
-- ============================================

-- 用户口语能力字段
ALTER TABLE users ADD COLUMN speaking_level TEXT DEFAULT 'beginner' 
  CHECK(speaking_level IN ('beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced'));

ALTER TABLE users ADD COLUMN speaking_score INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN speaking_weak_areas TEXT DEFAULT '[]'; -- JSON 数组

ALTER TABLE users ADD COLUMN speaking_strong_areas TEXT DEFAULT '[]'; -- JSON 数组

ALTER TABLE users ADD COLUMN speaking_goal_score INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN speaking_practice_count INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN speaking_total_minutes REAL DEFAULT 0;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_speaking_level ON users(speaking_level);

-- 创建用户口语统计视图
CREATE VIEW IF NOT EXISTS v_user_speaking_profile AS
SELECT 
  u.id as user_id,
  u.openid,
  u.speaking_level,
  u.speaking_score,
  u.speaking_goal_score,
  u.speaking_practice_count,
  u.speaking_total_minutes,
  COUNT(p.id) as total_practices,
  AVG(p.score) as recent_avg_score,
  AVG(p.fluency) as avg_fluency,
  AVG(p.vocabulary) as avg_vocabulary,
  AVG(p.grammar) as avg_grammar,
  AVG(p.pronunciation) as avg_pronunciation,
  MAX(p.created_at) as last_practice_at
FROM users u
LEFT JOIN speaking_practice p ON u.id = p.user_id
GROUP BY u.id, u.openid, u.speaking_level, u.speaking_score, u.speaking_goal_score, 
         u.speaking_practice_count, u.speaking_total_minutes;

-- 创建触发器：自动更新用户练习统计
CREATE TRIGGER IF NOT EXISTS update_user_speaking_stats
AFTER INSERT ON speaking_practice
BEGIN
  UPDATE users SET
    speaking_practice_count = speaking_practice_count + 1,
    speaking_total_minutes = speaking_total_minutes + NEW.audio_duration / 60
  WHERE id = NEW.user_id;
END;
