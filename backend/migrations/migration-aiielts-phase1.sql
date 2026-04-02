-- AIielts Phase 1: 核心架构数据库迁移
-- 创建时间：2026-04-02
-- 分支：AIielts

-- ============================================
-- 阅读模块
-- ============================================

-- 阅读文章库
CREATE TABLE reading_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('academic', 'general')),  -- 学术类/培训类
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 9),  -- 难度等级 1-9
    content TEXT NOT NULL,  -- 文章内容
    word_count INTEGER,  -- 文章字数
    source TEXT,  -- 来源 (真题年份/模拟题)
    tags TEXT,  -- 标签 JSON 数组 ["环境", "科技", "教育"]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 阅读题目
CREATE TABLE reading_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    question_type TEXT CHECK (question_type IN ('true_false', 'fill_blank', 'multiple_choice', 'matching', 'heading')),
    question_number INTEGER NOT NULL,  -- 题目编号
    question_text TEXT NOT NULL,
    options TEXT,  -- 选项 JSON 数组 (选择题用)
    correct_answer TEXT NOT NULL,  -- 正确答案
    ai_explanation TEXT,  -- AI 解析
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES reading_articles(id) ON DELETE CASCADE
);

-- 阅读用户答案记录
CREATE TABLE reading_user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    user_answer TEXT,  -- 用户答案
    is_correct BOOLEAN,  -- 是否正确
    time_spent INTEGER,  -- 答题耗时 (秒)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES reading_articles(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES reading_questions(id) ON DELETE CASCADE
);

-- 阅读能力诊断
CREATE TABLE reading_skill_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    analysis_date DATE NOT NULL,
    question_type TEXT,  -- 题型
    accuracy_rate REAL,  -- 正确率
    avg_time_spent REAL,  -- 平均耗时
    weak_points TEXT,  -- 薄弱点 JSON
    improvement_suggestions TEXT,  -- AI 建议
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, analysis_date, question_type)
);

-- ============================================
-- 听力模块
-- ============================================

-- 听力测试库
CREATE TABLE listening_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('academic', 'general')),
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 9),
    section_number INTEGER DEFAULT 4,  -- section 数量
    audio_url TEXT,  -- 音频文件 URL
    audio_duration INTEGER,  -- 音频时长 (秒)
    transcript TEXT,  -- 听力原文
    source TEXT,  -- 来源
    tags TEXT,  -- 标签 JSON 数组
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 听力题目
CREATE TABLE listening_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    section_number INTEGER NOT NULL,  -- Section 1-4
    question_type TEXT CHECK (question_type IN ('multiple_choice', 'fill_blank', 'map', 'matching')),
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options TEXT,  -- 选项 JSON 数组
    correct_answer TEXT NOT NULL,
    ai_explanation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES listening_tests(id) ON DELETE CASCADE
);

-- 听力用户答案记录
CREATE TABLE listening_user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN,
    time_spent INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES listening_tests(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES listening_questions(id) ON DELETE CASCADE
);

-- 听力能力诊断
CREATE TABLE listening_skill_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    analysis_date DATE NOT NULL,
    section_number INTEGER,  -- Section 1-4
    question_type TEXT,
    accuracy_rate REAL,
    weak_points TEXT,  -- 薄弱点 JSON ["语速", "口音", "词汇"]
    improvement_suggestions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, analysis_date, section_number)
);

-- ============================================
-- 学习计划模块
-- ============================================

-- 用户目标
CREATE TABLE user_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    exam_date DATE NOT NULL,  -- 考试日期
    target_score REAL CHECK (target_score BETWEEN 1.0 AND 9.0),  -- 目标分数
    current_score REAL,  -- 当前水平 (诊断测试得出)
    daily_study_hours REAL DEFAULT 2.0,  -- 每日学习时长 (小时)
    weak_skills TEXT,  -- 薄弱项 JSON ["reading", "listening"]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 诊断测试记录
CREATE TABLE diagnostic_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    test_type TEXT CHECK (test_type IN ('full', 'reading', 'listening', 'writing', 'speaking')),
    overall_score REAL,
    reading_score REAL,
    listening_score REAL,
    writing_score REAL,
    speaking_score REAL,
    test_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    test_result TEXT,  -- 详细结果 JSON
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学习计划
CREATE TABLE study_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_name TEXT,  -- 计划名称
    exam_date DATE NOT NULL,
    target_score REAL,
    current_score REAL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_weeks INTEGER,
    plan_json TEXT,  -- AI 生成的完整计划 JSON
    status TEXT CHECK (status IN ('active', 'completed', 'paused', 'abandoned')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学习计划 - 每日任务
CREATE TABLE study_plan_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    task_date DATE NOT NULL,  -- 任务日期
    week_number INTEGER NOT NULL,  -- 第几周
    day_number INTEGER NOT NULL,  -- 第几天
    task_type TEXT CHECK (task_type IN ('vocabulary', 'reading', 'listening', 'writing', 'speaking', 'review', 'mock_test')),
    task_content TEXT NOT NULL,  -- 任务内容描述
    task_detail TEXT,  -- 任务详情 JSON (具体文章/测试 ID 等)
    estimated_duration INTEGER,  -- 预计耗时 (分钟)
    status TEXT CHECK (status IN ('pending', 'completed', 'skipped')) DEFAULT 'pending',
    completed_at DATETIME,
    user_feedback TEXT,  -- 用户反馈
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    UNIQUE(plan_id, task_date, task_type)
);

-- 学习计划 - 进度记录
CREATE TABLE study_plan_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    completed_tasks INTEGER DEFAULT 0,  -- 完成任务数
    total_tasks INTEGER DEFAULT 0,  -- 总任务数
    completion_rate REAL DEFAULT 0.0,  -- 完成率
    study_duration INTEGER DEFAULT 0,  -- 学习时长 (分钟)
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),  -- 学习状态评分
    notes TEXT,  -- 用户备注
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    UNIQUE(plan_id, record_date)
);

-- ============================================
-- 写作模块
-- ============================================

-- 写作任务
CREATE TABLE writing_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type TEXT CHECK (task_type IN ('task1', 'task2')),
    task_category TEXT,  -- Task1: chart/map/process, Task2: education/technology/environment...
    task_description TEXT NOT NULL,  -- 题目描述
    task_content TEXT,  -- 具体内容 (图表描述等)
    word_limit INTEGER,  -- 字数要求
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户作文提交
CREATE TABLE writing_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    essay_text TEXT NOT NULL,  -- 作文内容
    word_count INTEGER,  -- 实际字数
    submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    time_spent INTEGER,  -- 写作耗时 (分钟)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES writing_tasks(id) ON DELETE CASCADE
);

-- 写作 AI 批改
CREATE TABLE writing_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL UNIQUE,
    overall_score REAL CHECK (overall_score BETWEEN 1.0 AND 9.0),
    task_response_score REAL,  -- 任务回应
    coherence_score REAL,  -- 连贯衔接
    vocabulary_score REAL,  -- 词汇丰富
    grammar_score REAL,  -- 语法准确
    ai_feedback TEXT,  -- AI 总体评价
    ai_suggestions TEXT,  -- AI 改进建议 JSON
    corrected_essay TEXT,  -- 修正后的作文
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES writing_submissions(id) ON DELETE CASCADE
);

-- ============================================
-- AI 服务集成
-- ============================================

-- AI 调用日志
CREATE TABLE ai_service_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_type TEXT CHECK (service_type IN ('diagnosis', 'recommendation', 'explanation', 'grading', 'generation')),
    module TEXT CHECK (module IN ('reading', 'listening', 'writing', 'speaking', 'plan')),
    request_content TEXT,  -- 请求内容
    response_content TEXT,  -- 响应内容
    tokens_used INTEGER,  -- 消耗 token 数
    cost REAL,  -- 成本
    status TEXT CHECK (status IN ('success', 'failed')) DEFAULT 'success',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 索引优化
-- ============================================

-- 阅读模块索引
CREATE INDEX idx_reading_articles_category ON reading_articles(category);
CREATE INDEX idx_reading_articles_difficulty ON reading_articles(difficulty);
CREATE INDEX idx_reading_questions_article ON reading_questions(article_id);
CREATE INDEX idx_reading_user_answers_user ON reading_user_answers(user_id);
CREATE INDEX idx_reading_user_answers_article ON reading_user_answers(article_id);
CREATE INDEX idx_reading_skill_analysis_user ON reading_skill_analysis(user_id);

-- 听力模块索引
CREATE INDEX idx_listening_tests_category ON listening_tests(category);
CREATE INDEX idx_listening_tests_difficulty ON listening_tests(difficulty);
CREATE INDEX idx_listening_questions_test ON listening_questions(test_id);
CREATE INDEX idx_listening_user_answers_user ON listening_user_answers(user_id);
CREATE INDEX idx_listening_user_answers_test ON listening_user_answers(test_id);
CREATE INDEX idx_listening_skill_analysis_user ON listening_skill_analysis(user_id);

-- 学习计划模块索引
CREATE INDEX idx_user_goals_user ON user_goals(user_id);
CREATE INDEX idx_diagnostic_tests_user ON diagnostic_tests(user_id);
CREATE INDEX idx_study_plans_user ON study_plans(user_id);
CREATE INDEX idx_study_plans_status ON study_plans(status);
CREATE INDEX idx_study_plan_tasks_plan ON study_plan_tasks(plan_id);
CREATE INDEX idx_study_plan_tasks_date ON study_plan_tasks(task_date);
CREATE INDEX idx_study_plan_tasks_status ON study_plan_tasks(status);
CREATE INDEX idx_study_plan_progress_plan ON study_plan_progress(plan_id);
CREATE INDEX idx_study_plan_progress_date ON study_plan_progress(record_date);

-- 写作模块索引
CREATE INDEX idx_writing_tasks_type ON writing_tasks(task_type);
CREATE INDEX idx_writing_submissions_user ON writing_submissions(user_id);
CREATE INDEX idx_writing_feedback_submission ON writing_feedback(submission_id);

-- AI 服务索引
CREATE INDEX idx_ai_service_logs_user ON ai_service_logs(user_id);
CREATE INDEX idx_ai_service_logs_type ON ai_service_logs(service_type);
CREATE INDEX idx_ai_service_logs_created ON ai_service_logs(created_at);

-- ============================================
-- 说明
-- ============================================
-- 
-- 本迁移脚本创建 AIielts 核心架构所需的所有数据表
-- 
-- 模块划分:
-- 1. 阅读模块 - 文章库、题目、用户答案、能力诊断
-- 2. 听力模块 - 测试库、题目、用户答案、能力诊断
-- 3. 学习计划模块 - 用户目标、诊断测试、计划、任务、进度
-- 4. 写作模块 - 任务、提交、AI 批改
-- 5. AI 服务 - 调用日志
--
-- 执行方式:
-- sqlite3 ielts_vocab.db < migration-aiielts-phase1.sql
--
-- ============================================
