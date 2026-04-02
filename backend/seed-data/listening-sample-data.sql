-- AIielts Phase 3: 听力模块示例数据
-- 创建时间：2026-04-02
-- 用途：填充听力测试库和题目，用于测试和演示

-- ============================================
-- 听力测试示例 (5 套)
-- ============================================

-- 测试 1: Section 1 生活场景 - 租房咨询
INSERT INTO listening_tests (title, category, difficulty, section_number, audio_url, audio_duration, transcript, source, tags) VALUES
('IELTS Listening Test 1 - Section 1: Accommodation Enquiry', 'academic', 5, 4, 
 '/api/audio/listening/test1.mp3', 180,
 '[Transcript placeholder - 实际音频文件需要上传]',
 'IELTS Cambridge 15 Test 1',
 '["生活", "租房", "Section1"]');

-- 测试 2: Section 2 学术场景 - 图书馆介绍
INSERT INTO listening_tests (title, category, difficulty, section_number, audio_url, audio_duration, transcript, source, tags) VALUES
('IELTS Listening Test 2 - Section 2: University Library Tour', 'academic', 6, 4,
 '/api/audio/listening/test2.mp3', 240,
 '[Transcript placeholder]',
 'IELTS Cambridge 16 Test 2',
 '["学术", "图书馆", "Section2"]');

-- 测试 3: Section 3 学术讨论 - 课程作业
INSERT INTO listening_tests (title, category, difficulty, section_number, audio_url, audio_duration, transcript, source, tags) VALUES
('IELTS Listening Test 3 - Section 3: Assignment Discussion', 'academic', 7, 4,
 '/api/audio/listening/test3.mp3', 300,
 '[Transcript placeholder]',
 'IELTS Cambridge 17 Test 1',
 '["学术", "讨论", "Section3"]');

-- 测试 4: Section 4 学术讲座 - 气候变化
INSERT INTO listening_tests (title, category, difficulty, section_number, audio_url, audio_duration, transcript, source, tags) VALUES
('IELTS Listening Test 4 - Section 4: Climate Change Lecture', 'academic', 8, 4,
 '/api/audio/listening/test4.mp3', 360,
 '[Transcript placeholder]',
 'IELTS Cambridge 18 Test 1',
 '["学术", "讲座", "环境", "Section4"]');

-- 测试 5: 综合测试 - 完整一套
INSERT INTO listening_tests (title, category, difficulty, section_number, audio_url, audio_duration, transcript, source, tags) VALUES
('IELTS Listening Full Test - Complete Practice', 'academic', 7, 4,
 '/api/audio/listening/full-test1.mp3', 1800,
 '[Transcript placeholder]',
 'IELTS Cambridge 15 Full Test',
 '["综合", "模考", "完整测试"]');

-- ============================================
-- 听力题目示例
-- ============================================

-- 测试 1 题目 - Section 1 租房咨询
INSERT INTO listening_questions (test_id, section_number, question_type, question_number, question_text, options, correct_answer, ai_explanation) VALUES
(1, 1, 'fill_blank', 1, 'What type of accommodation is the student looking for? A _______ flat.', NULL, 'one-bedroom', 'Section 1 开头学生明确说明："I am looking for a one-bedroom flat near the university." 关键词是"one-bedroom"，注意单复数。'),
(1, 1, 'fill_blank', 2, 'What is the maximum rent the student can pay per week? £_______.', NULL, '150', '对话中学生说："My budget is around 150 pounds per week." 注意单位是英镑每周。'),
(1, 1, 'multiple_choice', 3, 'When does the student want to move in?', '["A. Immediately", "B. Next week", "C. Next month"]', 'B', '学生提到："I need to move in next week, preferably on Monday." 所以答案是 Next week。'),
(1, 1, 'fill_blank', 4, 'What is the contact phone number? 07_______', NULL, '8234567', '房产中介留下电话号码："You can call me on 078234567." 注意听数字，英式发音。'),
(1, 1, 'fill_blank', 5, 'What is the postcode of the property? _______', NULL, 'SW1A 1AA', '地址信息："The postcode is SW1A 1AA." 注意字母和数字的组合。');

-- 测试 2 题目 - Section 2 图书馆介绍
INSERT INTO listening_questions (test_id, section_number, question_type, question_number, question_text, options, correct_answer, ai_explanation) VALUES
(2, 2, 'multiple_choice', 1, 'How many floors does the library have?', '["A. Three", "B. Four", "C. Five"]', 'B', '导览员介绍："Our library has four floors in total." 答案是 Four。'),
(2, 2, 'matching', 2, 'Match the facility to the floor: Computer room is on Floor ___.', NULL, '2', '"On the second floor, you will find the computer room with 50 workstations."'),
(2, 2, 'fill_blank', 3, 'The library opens at _______ on weekdays.', NULL, '8am', '"The library opens at 8am from Monday to Friday." 注意是上午 8 点。'),
(2, 2, 'fill_blank', 4, 'Students can borrow up to _______ books at a time.', NULL, '10', '"Undergraduate students can borrow up to 10 books at one time."'),
(2, 2, 'true_false', 5, 'The library is open on Sundays.', NULL, 'FALSE', '"The library is closed on Sundays and public holidays." 所以答案是 FALSE。');

-- 测试 3 题目 - Section 3 学术讨论
INSERT INTO listening_questions (test_id, section_number, question_type, question_number, question_text, options, correct_answer, ai_explanation) VALUES
(3, 3, 'multiple_choice', 1, 'What is the main topic of the assignment?', '["A. Environmental protection", "B. Renewable energy", "C. Climate change"]', 'B', '教授说："Your assignment will focus on renewable energy sources."'),
(3, 3, 'matching', 2, 'Match the student to their task: John will research _______.', NULL, 'solar power', '"John, you will be responsible for researching solar power technologies."'),
(3, 3, 'fill_blank', 3, 'The assignment is worth _______ of the final grade.', NULL, '40%', '"This assignment counts for 40 percent of your final grade."'),
(3, 3, 'fill_blank', 4, 'The deadline for submission is _______.', NULL, 'March 15th', '"You need to submit by March 15th, no extensions."'),
(3, 3, 'multiple_choice', 5, 'How many students are in the group?', '["A. Three", "B. Four", "C. Five"]', 'B', '教授说："I see there are four students in your group."');

-- 测试 4 题目 - Section 4 学术讲座
INSERT INTO listening_questions (test_id, section_number, question_type, question_number, question_text, options, correct_answer, ai_explanation) VALUES
(4, 4, 'fill_blank', 1, 'Global temperatures have risen by _______ since pre-industrial times.', NULL, '1.1 degrees Celsius', '讲座开头："Global average temperatures have increased by approximately 1.1 degrees Celsius since pre-industrial times."'),
(4, 4, 'fill_blank', 2, 'The main cause of climate change is _______ emissions.', NULL, 'greenhouse gas', '"The primary driver is greenhouse gas emissions from human activities."'),
(4, 4, 'multiple_choice', 3, 'Which sector contributes most to emissions?', '["A. Transportation", "B. Energy production", "C. Agriculture"]', 'B', '"Energy production, particularly coal-fired power plants, is the largest contributor."'),
(4, 4, 'fill_blank', 4, 'The Paris Agreement aims to limit warming to below _______.', NULL, '2 degrees', '"The goal of the Paris Agreement is to keep global warming well below 2 degrees Celsius."'),
(4, 4, 'fill_blank', 5, 'Renewable energy sources include solar, wind, and _______ power.', NULL, 'hydro', '"Major renewable sources are solar, wind, and hydroelectric power."');

-- ============================================
-- 听写训练材料
-- ============================================

-- 听写练习 1 - 简单
INSERT INTO listening_tests (title, category, difficulty, section_number, audio_url, audio_duration, transcript, source, tags) VALUES
('Dictation Practice 1 - Daily Conversation', 'general', 4, 1,
 '/api/audio/listening/dictation1.mp3', 60,
 'Hello, my name is Sarah. I am a student at the university. I am studying environmental science. In my free time, I enjoy reading and playing tennis. I hope to become a researcher in the future.',
 'Dictation Practice',
 '["听写", "日常对话", "简单"]');

-- 听写练习 2 - 中等
INSERT INTO listening_tests (title, category, difficulty, section_number, audio_url, audio_duration, transcript, source, tags) VALUES
('Dictation Practice 2 - Academic Lecture', 'academic', 6, 1,
 '/api/audio/listening/dictation2.mp3', 90,
 'Climate change represents one of the most significant challenges facing humanity today. Scientists warn that without immediate action, global temperatures could rise by three to four degrees by the end of this century.',
 'Dictation Practice',
 '["听写", "学术讲座", "中等"]');

-- 听写练习 3 - 困难
INSERT INTO listening_tests (title, category, difficulty, section_number, audio_url, audio_duration, transcript, source, tags) VALUES
('Dictation Practice 3 - Advanced Academic', 'academic', 8, 1,
 '/api/audio/listening/dictation3.mp3', 120,
 'The phenomenon of anthropogenic climate change has precipitated unprecedented shifts in global weather patterns. Mitigation strategies necessitate comprehensive international cooperation and substantial investment in renewable energy infrastructure.',
 'Dictation Practice',
 '["听写", "学术讲座", "困难"]');

-- ============================================
-- 说明
-- ============================================
-- 这是示例数据，实际生产环境需要：
-- 1. 至少 20 套完整听力测试
-- 2. 每套测试 40 道题目（4 个 Section）
-- 3. 真实音频文件需要上传到 /backend/audio/listening/ 目录
-- 4. 音频格式：MP3, 128kbps 或更高
-- 5. 每段音频需要配套的完整 transcript
-- ============================================
