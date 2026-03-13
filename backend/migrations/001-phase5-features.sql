-- Phase 5: 错题本 2.0 数据库迁移脚本
-- 执行时间：2026-03-12

-- 1. 创建错题本表
CREATE TABLE IF NOT EXISTS mistake_book (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES ielts_words(id) ON DELETE CASCADE,
    error_type VARCHAR(20) CHECK (error_type IN ('spelling', 'recognition', 'pronunciation', 'usage', 'listening')),
    error_count INTEGER DEFAULT 1,
    last_error_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mastery_level INTEGER DEFAULT 1 CHECK (mastery_level BETWEEN 1 AND 5),
    is_high_frequency BOOLEAN DEFAULT FALSE,
    eliminated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, word_id)
);

-- 2. 创建错题练习记录表
CREATE TABLE IF NOT EXISTS mistake_practice_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mistake_id INTEGER REFERENCES mistake_book(id) ON DELETE CASCADE,
    practice_type VARCHAR(20) CHECK (practice_type IN ('spelling', 'recognition', 'test', 'listening')),
    is_correct BOOLEAN,
    response_time INTEGER, -- 响应时间（毫秒）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_mistake_book_user ON mistake_book(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_book_word ON mistake_book(word_id);
CREATE INDEX IF NOT EXISTS idx_mistake_book_priority ON mistake_book(error_count DESC, last_error_at ASC);
CREATE INDEX IF NOT EXISTS idx_mistake_book_high_freq ON mistake_book(is_high_frequency) WHERE is_high_frequency = TRUE;
CREATE INDEX IF NOT EXISTS idx_mistake_practice_user ON mistake_practice_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_practice_mistake ON mistake_practice_records(mistake_id);

-- 4. 创建视图：用户错题统计
CREATE OR REPLACE VIEW user_mistake_stats AS
SELECT 
    user_id,
    COUNT(*) as total_mistakes,
    COUNT(*) FILTER (WHERE is_high_frequency = TRUE) as high_frequency_count,
    COUNT(*) FILTER (WHERE eliminated_at IS NULL) as active_mistakes,
    COUNT(*) FILTER (WHERE eliminated_at IS NOT NULL) as eliminated_count,
    AVG(error_count) as avg_error_count,
    MAX(error_count) as max_error_count
FROM mistake_book
GROUP BY user_id;

-- 5. 创建视图：待复习错题（优先推送）
CREATE OR REPLACE VIEW mistakes_due_for_review AS
SELECT 
    mb.*,
    iw.word,
    iw.phonetic,
    iw.definition,
    -- 优先级评分 = 错误次数 × (1 / 距上次错误时间)
    (mb.error_count * 100.0 / NULLIF(EXTRACT(EPOCH FROM (NOW() - mb.last_error_at)) / 3600, 0)) as priority_score
FROM mistake_book mb
JOIN ielts_words iw ON mb.word_id = iw.id
WHERE mb.eliminated_at IS NULL
  AND mb.mastery_level < 5
ORDER BY priority_score DESC, mb.error_count DESC;

-- 6. 创建函数：添加错题（智能处理）
CREATE OR REPLACE FUNCTION add_mistake(
    p_user_id INTEGER,
    p_word_id INTEGER,
    p_error_type VARCHAR(20)
) RETURNS INTEGER AS $$
DECLARE
    v_mistake_id INTEGER;
    v_error_count INTEGER;
BEGIN
    -- 尝试更新现有错题
    UPDATE mistake_book
    SET 
        error_count = error_count + 1,
        last_error_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        is_high_frequency = (error_count + 1 >= 3),
        mastery_level = GREATEST(1, mastery_level - 1)
    WHERE user_id = p_user_id AND word_id = p_word_id
    RETURNING id, error_count INTO v_mistake_id, v_error_count;
    
    -- 如果不存在则插入
    IF v_mistake_id IS NULL THEN
        INSERT INTO mistake_book (user_id, word_id, error_type, error_count, is_high_frequency)
        VALUES (p_user_id, p_word_id, p_error_type, 1, FALSE)
        RETURNING id INTO v_mistake_id;
    END IF;
    
    -- 记录练习
    INSERT INTO mistake_practice_records (user_id, mistake_id, practice_type, is_correct)
    VALUES (p_user_id, v_mistake_id, p_error_type, FALSE);
    
    RETURN v_mistake_id;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建函数：消除错题（连续 3 次正确）
CREATE OR REPLACE FUNCTION eliminate_mistake(
    p_user_id INTEGER,
    p_word_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_correct_count INTEGER;
    v_mistake_id INTEGER;
BEGIN
    -- 获取错题 ID
    SELECT id INTO v_mistake_id
    FROM mistake_book
    WHERE user_id = p_user_id AND word_id = p_word_id AND eliminated_at IS NULL;
    
    IF v_mistake_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 检查最近 3 次练习是否都正确
    SELECT COUNT(*) INTO v_correct_count
    FROM (
        SELECT is_correct
        FROM mistake_practice_records
        WHERE mistake_id = v_mistake_id
        ORDER BY created_at DESC
        LIMIT 3
    ) recent
    WHERE is_correct = TRUE;
    
    -- 如果最近 3 次都正确，标记为已消除
    IF v_correct_count >= 3 THEN
        UPDATE mistake_book
        SET 
            eliminated_at = CURRENT_TIMESTAMP,
            mastery_level = 5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_mistake_id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 8. 插入示例词根数据（为词根词缀模块准备）
INSERT INTO word_roots (root, meaning, origin, examples) VALUES
    ('spect', '看，观察', '拉丁语', '[{"word":"inspect","meaning":"检查"},{"word":"respect","meaning":"尊重"},{"word":"prospect","meaning":"前景"}]'),
    ('dict', '说，讲', '拉丁语', '[{"word":"predict","meaning":"预测"},{"word":"contradict","meaning":"反驳"},{"word":"dictionary","meaning":"词典"}]'),
    ('port', '携带，运送', '拉丁语', '[{"word":"import","meaning":"进口"},{"word":"export","meaning":"出口"},{"word":"transport","meaning":"运输"}]'),
    ('form', '形状，形式', '拉丁语', '[{"word":"reform","meaning":"改革"},{"word":"transform","meaning":"转变"},{"word":"inform","meaning":"通知"}]'),
    ('struct', '建造', '拉丁语', '[{"word":"construct","meaning":"建造"},{"word":"destruct","meaning":"破坏"},{"word":"instruct","meaning":"指导"}]')
ON CONFLICT (root) DO NOTHING;

-- 9. 创建词根词缀相关表
CREATE TABLE IF NOT EXISTS word_roots (
    id SERIAL PRIMARY KEY,
    root VARCHAR(50) UNIQUE NOT NULL,
    meaning TEXT NOT NULL,
    origin VARCHAR(50),
    examples JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS word_prefixes (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(20) UNIQUE NOT NULL,
    meaning TEXT NOT NULL,
    examples TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS word_suffixes (
    id SERIAL PRIMARY KEY,
    suffix VARCHAR(20) UNIQUE NOT NULL,
    meaning TEXT NOT NULL,
    examples TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS word_root_relations (
    word_id INTEGER REFERENCES ielts_words(id) ON DELETE CASCADE,
    root_id INTEGER REFERENCES word_roots(id) ON DELETE CASCADE,
    position VARCHAR(20) CHECK (position IN ('root', 'prefix', 'suffix')),
    PRIMARY KEY (word_id, root_id, position)
);

CREATE TABLE IF NOT EXISTS user_root_progress (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    root_id INTEGER REFERENCES word_roots(id) ON DELETE CASCADE,
    mastery_level INTEGER DEFAULT 1 CHECK (mastery_level BETWEEN 1 AND 5),
    learned_at TIMESTAMP,
    PRIMARY KEY (user_id, root_id)
);

-- 10. 创建索引
CREATE INDEX IF NOT EXISTS idx_word_roots_root ON word_roots(root);
CREATE INDEX IF NOT EXISTS idx_word_root_relations_word ON word_root_relations(word_id);
CREATE INDEX IF NOT EXISTS idx_word_root_relations_root ON word_root_relations(root_id);

COMMIT;
