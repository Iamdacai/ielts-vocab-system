-- ============================================
-- 迁移 005: 创建雅思口语题库表
-- 创建时间：2026-03-30
-- 说明：存储 2026 年最新雅思口语题库
-- ============================================

CREATE TABLE IF NOT EXISTS ielts_speaking_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part INTEGER NOT NULL CHECK(part IN (1, 2, 3)),
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  sub_questions TEXT, -- JSON 数组（Part 1）
  cue_card TEXT, -- 题卡内容（Part 2）
  follow_ups TEXT, -- JSON 数组（Part 3）
  sample_answer TEXT, -- 范文答案
  vocabulary_highlights TEXT, -- JSON 高分词汇
  common_mistakes TEXT, -- JSON 常见错误
  difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
  frequency INTEGER DEFAULT 0, -- 出现频率
  last_test_date TEXT, -- 最近考试日期
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_topics_part ON ielts_speaking_topics(part);
CREATE INDEX IF NOT EXISTS idx_topics_topic ON ielts_speaking_topics(topic);
CREATE INDEX IF NOT EXISTS idx_topics_difficulty ON ielts_speaking_topics(difficulty);

-- 添加示例数据（2026 年 1-4 月题库精选）
-- Part 1 题目
INSERT INTO ielts_speaking_topics (part, topic, question, sub_questions, difficulty, frequency) VALUES
(1, 'Work & Study', 'Do you work or are you a student?', 
 '["What do you like most about your job?", "Why did you choose this profession?", "Do you plan to continue in this field?"]',
 'easy', 95),

(1, 'Work & Study', 'What subject are you studying?', 
 '["Why did you choose this subject?", "Is it interesting to you?", "What do you find most challenging?"]',
 'easy', 90),

(1, 'Hometown', 'Where is your hometown?', 
 '["What do you like about it?", "Is it a good place to live?", "Has it changed much since you were a child?"]',
 'easy', 88),

(1, 'Accommodation', 'Do you live in a house or a flat?', 
 '["Which room do you like most?", "What would you like to change about your home?", "Do you plan to move?"]',
 'easy', 85),

(1, 'Technology', 'How often do you use the internet?', 
 '["What do you mainly use it for?", "Has it changed your life?", "Could you live without it?"]',
 'medium', 82),

(1, 'Social Media', 'Do you use social media?', 
 '["Which platforms do you use?", "How much time do you spend on it?", "What are the benefits?"]',
 'medium', 80),

(1, 'Reading', 'Do you like reading books?', 
 '["What kind of books do you read?", "Do you prefer e-books or paper books?", "Did you read more as a child?"]',
 'medium', 78),

(1, 'Music', 'Do you like listening to music?', 
 '["What kind of music do you like?", "Do you play any instruments?", "Has your taste in music changed?"]',
 'medium', 75),

(1, 'Sports', 'Do you play any sports?', 
 '["What sports are popular in your country?", "Did you play sports at school?", "Are you a fan of any sports team?"]',
 'medium', 72),

(1, 'Travel', 'Do you like travelling?', 
 '["Where have you been?", "Where would you like to go?", "Do you prefer travelling alone or with others?"]',
 'medium', 70);

-- Part 2 题目（题卡）
INSERT INTO ielts_speaking_topics (part, topic, question, cue_card, difficulty, frequency) VALUES
(2, 'People', 'Describe a person who has influenced you', 
 'You should say:
- Who this person is
- How you know them
- What qualities they have
And explain why they have influenced you so much',
 'medium', 85),

(2, 'Places', 'Describe a place you have visited', 
 'You should say:
- Where it is
- When you went there
- What you did there
And explain why you liked or disliked it',
 'medium', 82),

(2, 'Objects', 'Describe something you own that is important to you', 
 'You should say:
- What it is
- How long you have had it
- What you use it for
And explain why it is important to you',
 'medium', 80),

(2, 'Events', 'Describe a memorable event in your life', 
 'You should say:
- What the event was
- When it happened
- Who was there
And explain why it was memorable',
 'medium', 78),

(2, 'Activities', 'Describe a hobby you enjoy', 
 'You should say:
- What the hobby is
- How long you have done it
- How often you do it
And explain why you enjoy it',
 'medium', 75),

(2, 'Media', 'Describe a film or TV program you like', 
 'You should say:
- What it is
- What it is about
- When you watched it
And explain why you like it',
 'medium', 72),

(2, 'Nature', 'Describe a beautiful natural scene', 
 'You should say:
- Where it is
- What you can see there
- When you visited it
And explain why you think it is beautiful',
 'hard', 68),

(2, 'Technology', 'Describe a useful app or website', 
 'You should say:
- What it is
- How you found it
- How often you use it
And explain why you find it useful',
 'medium', 65);

-- Part 3 题目（深入讨论）
INSERT INTO ielts_speaking_topics (part, topic, question, follow_ups, difficulty, frequency) VALUES
(3, 'Education', 'How has education changed in your country?', 
 '["What impact does technology have on education?", "Should education be free for everyone?", "How will education change in the future?"]',
 'hard', 85),

(3, 'Environment', 'What environmental problems does the world face?', 
 '["Who should be responsible for protecting the environment?", "What can individuals do?", "Are governments doing enough?"]',
 'hard', 82),

(3, 'Technology', 'How has technology changed the way we communicate?', 
 '["Is this change positive or negative?", "What about face-to-face communication?", "How will AI affect communication?"]',
 'hard', 80),

(3, 'Work', 'What makes a job satisfying?', 
 '["Is salary the most important factor?", "How important is work-life balance?", "Will remote work become more common?"]',
 'hard', 78),

(3, 'Culture', 'Why is it important to preserve cultural traditions?', 
 '["How does globalization affect culture?", "Should governments fund cultural activities?", "What traditions are disappearing?"]',
 'hard', 75),

(3, 'Health', 'How can people maintain a healthy lifestyle?', 
 '["Who should be responsible for health?", "Is healthcare accessible in your country?", "What about mental health?"]',
 'hard', 72),

(3, 'Society', 'What are the challenges of urbanization?', 
 '["How does city life differ from rural life?", "What solutions exist?", "Will cities continue to grow?"]',
 'hard', 70),

(3, 'Media', 'How reliable is news media today?', 
 '["What is fake news?", "How can people identify reliable sources?", "Should social media be regulated?"]',
 'hard', 68);
