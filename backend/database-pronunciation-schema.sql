-- 发音练习记录表
CREATE TABLE pronunciation_practice_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES ielts_words(id) ON DELETE CASCADE,
    audio_file_path VARCHAR(500), -- 用户录音文件路径
    pronunciation_score DECIMAL(3,2) DEFAULT 0.00, -- 发音评分 0-100
    feedback TEXT, -- 发音反馈建议
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_pronunciation_records_user ON pronunciation_practice_records(user_id);
CREATE INDEX idx_pronunciation_records_word ON pronunciation_practice_records(word_id);
CREATE INDEX idx_pronunciation_records_created ON pronunciation_practice_records(created_at);