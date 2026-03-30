-- ============================================
-- 迁移 008: 创建写作题库表
-- 创建时间：2026-03-30
-- 说明：存储雅思写作真题和预测题
-- ============================================

CREATE TABLE IF NOT EXISTS writing_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type TEXT NOT NULL CHECK(task_type IN ('task1_academic', 'task1_general', 'task2')),
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  chart_type TEXT, -- Task 1 图表类型
  sub_questions TEXT, -- JSON 数组
  sample_answer TEXT, -- 范文
  vocabulary_highlights TEXT, -- JSON 高分词汇
  common_mistakes TEXT, -- JSON 常见错误
  difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
  frequency INTEGER DEFAULT 0, -- 出现频率
  last_test_date TEXT, -- 最近考试日期
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_writing_topics_type ON writing_topics(task_type);
CREATE INDEX IF NOT EXISTS idx_writing_topics_topic ON writing_topics(topic);
CREATE INDEX IF NOT EXISTS idx_writing_topics_difficulty ON writing_topics(difficulty);

-- 添加示例数据（2026 年雅思写作题库精选）
-- Task 2 题目（大作文）
INSERT INTO writing_topics (task_type, topic, question, difficulty, frequency) VALUES
('task2', 'Education', 'Some people believe that universities should only offer places to young students with high marks. Others believe they should accept people of all ages, even if they did not do well at school. Discuss both views and give your own opinion.', 'medium', 95),

('task2', 'Technology', 'The use of social media is replacing face-to-face interaction among many people in society. Do you think the advantages outweigh the disadvantages?', 'medium', 92),

('task2', 'Environment', 'Governments should make people responsible for looking after their own local environment. To what extent do you agree or disagree?', 'medium', 90),

('task2', 'Work', 'Some people think that job satisfaction is more important than job security. Others think that having a permanent job is more important. Discuss both views and give your own opinion.', 'medium', 88),

('task2', 'Health', 'The best way to improve health is to increase the number of sports facilities. Others think that this has little effect and other measures are required. Discuss both views and give your own opinion.', 'medium', 85),

('task2', 'Crime', 'Some people think that punishment is the best way to control crime. Others believe that rehabilitation is more effective. Discuss both views and give your own opinion.', 'hard', 82),

('task2', 'Culture', 'Some people think that traditional culture will be lost as countries develop. Others think that traditional culture can be preserved. Discuss both views and give your own opinion.', 'medium', 80),

('task2', 'Media', 'News media has become more influential in people''s lives. Some people think this is a negative development. To what extent do you agree or disagree?', 'hard', 78),

('task2', 'Transport', 'Some people think that the government should invest more in public transport. Others think that individuals should pay for their own transport. Discuss both views and give your own opinion.', 'medium', 75),

('task2', 'Family', 'Some people think that parents should teach children how to be good members of society. Others think that school is the best place to learn this. Discuss both views and give your own opinion.', 'medium', 72),

('task2', 'Globalization', 'Some people think that globalization is destroying traditional cultures. Others think it is a positive development. Discuss both views and give your own opinion.', 'hard', 70),

('task2', 'Science', 'Some people think that space exploration is a waste of money. Others think it is important for human development. Discuss both views and give your own opinion.', 'medium', 68),

('task2', 'Tourism', 'International tourism has become a huge industry. Do the benefits of international tourism outweigh the drawbacks?', 'medium', 65),

('task2', 'Food', 'Some people think that fast food is having a negative effect on society. Others think it has some benefits. Discuss both views and give your own opinion.', 'easy', 62),

('task2', 'Housing', 'In many cities, the problem of housing shortage is becoming worse. What are the causes of this problem? What solutions can you suggest?', 'medium', 60);

-- Task 1 题目（小作文 - 图表题）
INSERT INTO writing_topics (task_type, topic, question, chart_type, difficulty, frequency) VALUES
('task1_academic', 'Economy', 'The graph below shows the unemployment rates in two countries from 2000 to 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.', 'line', 'medium', 85),

('task1_academic', 'Demographics', 'The chart below shows the population distribution by age group in three countries in 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.', 'bar', 'medium', 82),

('task1_academic', 'Energy', 'The pie charts below show the energy production in a country in 1990 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.', 'pie', 'medium', 80),

('task1_academic', 'Manufacturing', 'The table below shows the production of three types of cars in a factory from 2015 to 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.', 'table', 'easy', 78),

('task1_academic', 'Process', 'The diagram below shows the process of recycling plastic bottles. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.', 'process', 'hard', 75),

('task1_academic', 'Geography', 'The maps below show the changes in a coastal town from 1990 to the present. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.', 'map', 'hard', 72);

-- Task 1 G 类题目（书信）
INSERT INTO writing_topics (task_type, topic, question, difficulty, frequency) VALUES
('task1_general', 'Complaint', 'You recently bought a product from an online store, but it arrived damaged. Write a letter to the store. In your letter: describe the problem, explain what you want them to do, say what action you will take if they do not respond.', 'medium', 80),

('task1_general', 'Request', 'You are planning to study at a university abroad. Write a letter to the university. In your letter: introduce yourself, explain why you want to study there, ask about accommodation options.', 'medium', 75),

('task1_general', 'Invitation', 'You are organizing a family celebration. Write a letter to invite your friend. In your letter: explain the occasion, describe the plans, say why you would like them to come.', 'easy', 70),

('task1_general', 'Apology', 'You cannot attend an important meeting. Write a letter to your manager. In your letter: apologize for not attending, explain why you cannot come, suggest how the meeting could proceed without you.', 'medium', 68),

('task1_general', 'Advice', 'A friend is planning to visit your country. Write a letter giving advice. In your letter: recommend places to visit, suggest the best time to come, give tips on local customs.', 'easy', 65);
