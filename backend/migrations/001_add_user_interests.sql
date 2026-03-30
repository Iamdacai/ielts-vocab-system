-- ============================================
-- 迁移 001: 添加用户兴趣字段
-- 创建时间：2026-03-30
-- 说明：为 AI 语境生成功能添加用户兴趣配置
-- ============================================

-- 用户兴趣标签（JSON 数组）
-- 例：["科技", "商业", "娱乐", "体育"]
ALTER TABLE users ADD COLUMN interests TEXT DEFAULT '[]';

-- 用户偏好的雅思场景分类（JSON 数组）
-- 例：["科技发明", "社会经济", "娱乐运动"]
ALTER TABLE users ADD COLUMN preferred_topics TEXT DEFAULT '[]';

-- AI 语境生成开关（1=开启，0=关闭）
ALTER TABLE users ADD COLUMN ai_context_enabled INTEGER DEFAULT 1;

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_users_ai_context ON users(ai_context_enabled);

-- 添加更新时间触发器
CREATE TRIGGER IF NOT EXISTS update_users_ai_context 
AFTER UPDATE OF interests, preferred_topics, ai_context_enabled ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
