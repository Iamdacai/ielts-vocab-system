-- ============================================
-- 迁移 004: 创建口语练习记录表
-- 创建时间：2026-03-30
-- 说明：存储用户口语练习记录和评分结果
-- ============================================

CREATE TABLE IF NOT EXISTS speaking_practice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  practice_type TEXT NOT NULL CHECK(practice_type IN ('word', 'sentence', 'conversation', 'ielts_mock')),
  topic TEXT,
  question TEXT,
  audio_url TEXT,
  audio_duration REAL, -- 录音时长（秒）
  transcript TEXT, -- 语音识别结果
  score INTEGER, -- 总分 (0-100)
  accuracy INTEGER, -- 准确度
  fluency INTEGER, -- 流利度
  pronunciation INTEGER, -- 发音
  grammar INTEGER, -- 语法（对话模式）
  vocabulary INTEGER, -- 词汇（对话模式）
  coherence INTEGER, -- 连贯性（对话模式）
  feedback TEXT, -- JSON 格式详细反馈
  ai_suggestions TEXT, -- JSON 格式改进建议
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_speaking_user ON speaking_practice(user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_type ON speaking_practice(practice_type);
CREATE INDEX IF NOT EXISTS idx_speaking_created ON speaking_practice(created_at);

-- 创建视图：用户口语练习统计
CREATE VIEW IF NOT EXISTS v_user_speaking_stats AS
SELECT 
  u.id as user_id,
  u.openid,
  COUNT(p.id) as total_practices,
  SUM(p.audio_duration) / 60 as total_minutes,
  AVG(p.score) as avg_score,
  MAX(p.created_at) as last_practice_at,
  u.speaking_level,
  u.speaking_goal_score
FROM users u
LEFT JOIN speaking_practice p ON u.id = p.user_id
GROUP BY u.id, u.openid, u.speaking_level, u.speaking_goal_score;
