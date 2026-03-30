-- ============================================
-- 迁移 003: 创建 AI 生成日志表
-- 创建时间：2026-03-30
-- 说明：记录 AI 例句生成历史，用于优化和成本统计
-- ============================================

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  word TEXT NOT NULL,
  word_id INTEGER,
  prompt_hash TEXT, -- 用于去重，避免重复生成相同内容
  prompt_text TEXT, -- 完整 Prompt（用于调试）
  generated_examples TEXT, -- JSON 格式的生成结果
  bailian_tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER DEFAULT 0,
  cache_hit INTEGER DEFAULT 0, -- 1=命中缓存，0=重新生成
  user_feedback TEXT, -- 用户反馈（后续更新）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (word_id) REFERENCES ielts_words(id) ON DELETE SET NULL
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_word ON ai_generation_logs(word);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_cache ON ai_generation_logs(cache_hit);

-- 创建视图：统计每日 AI 调用量
CREATE VIEW IF NOT EXISTS v_daily_ai_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_generations,
  SUM(CASE WHEN cache_hit = 0 THEN 1 ELSE 0 END) as new_generations,
  SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
  SUM(bailian_tokens_used) as total_tokens,
  AVG(generation_time_ms) as avg_generation_time
FROM ai_generation_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 创建视图：用户 AI 使用统计
CREATE VIEW IF NOT EXISTS v_user_ai_stats AS
SELECT 
  u.id as user_id,
  u.openid,
  COUNT(l.id) as total_generations,
  COUNT(DISTINCT l.word) as unique_words,
  SUM(l.bailian_tokens_used) as total_tokens,
  MAX(l.created_at) as last_generation_at
FROM users u
LEFT JOIN ai_generation_logs l ON u.id = l.user_id
GROUP BY u.id, u.openid
ORDER BY total_generations DESC;
