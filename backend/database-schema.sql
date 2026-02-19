-- 雅思背单词系统数据库设计

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    openid VARCHAR(128) UNIQUE NOT NULL, -- 微信openid
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户学习配置表
CREATE TABLE user_configs (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    weekly_new_words_days JSONB DEFAULT '[1,2,3,4,5,6,7]', -- 学习天数，1=周一
    daily_new_words_count INTEGER DEFAULT 20,
    review_time VARCHAR(10) DEFAULT '20:00', -- 复习时间 HH:MM
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
);

-- 词汇表（剑桥雅思1-18）
CREATE TABLE ielts_words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    phonetic VARCHAR(100),
    part_of_speech VARCHAR(50),
    definition TEXT NOT NULL,
    example_sentences TEXT[],
    frequency_level VARCHAR(20) CHECK (frequency_level IN ('high', 'medium', 'low')),
    cambridge_book INTEGER CHECK (cambridge_book BETWEEN 1 AND 18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(word, cambridge_book)
);

-- 用户学习进度表
CREATE TABLE user_word_progress (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES ielts_words(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('new', 'learning', 'mastered', 'forgotten')),
    next_review_at TIMESTAMP,
    review_count INTEGER DEFAULT 0,
    mastery_score DECIMAL(3,2) DEFAULT 0.00, -- 掌握度评分 0-100
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, word_id)
);

-- 学习记录表
CREATE TABLE learning_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES ielts_words(id) ON DELETE CASCADE,
    action_type VARCHAR(20) CHECK (action_type IN ('new_word', 'review', 'test', 'mastered')),
    result JSONB, -- 记录测试结果等
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 发音练习记录表
CREATE TABLE pronunciation_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES ielts_words(id) ON DELETE CASCADE,
    audio_file_path VARCHAR(255),
    pronunciation_score DECIMAL(3,2) CHECK (pronunciation_score BETWEEN 0.00 AND 100.00),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_user_word_progress_next_review ON user_word_progress(next_review_at);
CREATE INDEX idx_user_word_progress_status ON user_word_progress(status);
CREATE INDEX idx_ielts_words_frequency ON ielts_words(frequency_level);
CREATE INDEX idx_ielts_words_book ON ielts_words(cambridge_book);
CREATE INDEX idx_pronunciation_records_user ON pronunciation_records(user_id);
CREATE INDEX idx_pronunciation_records_word ON pronunciation_records(word_id);
CREATE INDEX idx_pronunciation_records_score ON pronunciation_records(pronunciation_score);