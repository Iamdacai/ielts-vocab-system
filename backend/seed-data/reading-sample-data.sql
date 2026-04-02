-- AIielts Phase 2: 阅读模块示例数据
-- 创建时间：2026-04-02
-- 用途：填充阅读文章库和题目，用于测试和演示

-- ============================================
-- 阅读文章示例 (10 篇)
-- ============================================

-- 文章 1: 环境类 - 气候变化
INSERT INTO reading_articles (title, category, difficulty, content, word_count, source, tags) VALUES
('Climate Change and Global Warming', 'academic', 7, 
'Climate change represents one of the most pressing challenges of the 21st century. The Earth''s average temperature has risen by approximately 1.1°C since pre-industrial times, primarily due to human activities such as burning fossil fuels and deforestation.

The consequences of global warming are already visible worldwide. Rising sea levels threaten coastal communities, extreme weather events are becoming more frequent, and ecosystems are under unprecedented stress. Scientists warn that without immediate action, temperatures could rise by 3-4°C by 2100.

Mitigation strategies include transitioning to renewable energy sources, improving energy efficiency, protecting forests, and developing carbon capture technologies. However, these efforts require unprecedented international cooperation and significant financial investment.

The Paris Agreement of 2015 marked a historic commitment by nations to limit global warming to well below 2°C. Yet current national commitments fall short of this target, highlighting the gap between political promises and necessary action.',
450, 'IELTS Cambridge 15 Test 1', '["环境", "气候", "科技"]');

-- 文章 2: 教育类 - 在线教育
INSERT INTO reading_articles (title, category, difficulty, content, word_count, source, tags) VALUES
('The Rise of Online Education', 'academic', 6,
'Online education has transformed the landscape of learning in the past decade. What began as a niche alternative has become mainstream, accelerated by technological advances and the global pandemic.

Proponents argue that online learning offers flexibility, accessibility, and cost-effectiveness. Students can learn at their own pace, access courses from top universities regardless of location, and balance education with work and family commitments.

However, critics point to challenges including reduced social interaction, the need for self-discipline, and the digital divide that disadvantages students without reliable internet access. Studies show completion rates for online courses remain significantly lower than traditional classroom settings.

The future likely lies in hybrid models that combine the best of both worlds. Universities are increasingly adopting blended approaches, using online platforms for lectures while preserving in-person interaction for discussions and practical work.',
420, 'IELTS Cambridge 16 Test 2', '["教育", "科技", "社会"]');

-- 文章 3: 科技类 - 人工智能
INSERT INTO reading_articles (title, category, difficulty, content, word_count, source, tags) VALUES
('Artificial Intelligence in Healthcare', 'academic', 8,
'Artificial intelligence is revolutionizing healthcare delivery and medical research. Machine learning algorithms can now diagnose diseases with accuracy matching or exceeding human experts in certain domains.

AI applications in healthcare include medical imaging analysis, drug discovery, personalized treatment recommendations, and predictive analytics for patient outcomes. Radiology has seen particularly significant advances, with AI systems detecting cancers and other abnormalities in medical scans.

However, challenges remain. Issues of data privacy, algorithmic bias, and the need for human oversight raise important ethical questions. Healthcare professionals must learn to work alongside AI systems rather than being replaced by them.

The integration of AI into healthcare systems requires substantial investment in infrastructure, training, and regulatory frameworks. Despite these challenges, experts predict AI will become indispensable in delivering efficient, personalized healthcare.',
480, 'IELTS Cambridge 17 Test 1', '["科技", "医疗", "AI"]');

-- 文章 4: 社会类 - 城市化
INSERT INTO reading_articles (title, category, difficulty, content, word_count, source, tags) VALUES
('Urbanization and Its Challenges', 'academic', 6,
'For the first time in human history, more than half of the world''s population lives in cities. This unprecedented urbanization brings both opportunities and challenges.

Cities are engines of economic growth, innovation, and cultural exchange. They offer better access to education, healthcare, and employment opportunities. Concentrated populations also enable more efficient delivery of public services.

However, rapid urbanization strains infrastructure, housing, and transportation systems. Urban sprawl contributes to environmental degradation, while inequality often becomes more visible in cities. Affordable housing shortages plague major metropolitan areas worldwide.

Sustainable urban planning is essential for managing growth. Solutions include developing public transportation, creating green spaces, promoting mixed-use development, and ensuring affordable housing. Smart city technologies offer new tools for urban management.',
440, 'IELTS Cambridge 14 Test 3', '["社会", "城市", "环境"]');

-- 文章 5: 商业类 - 远程办公
INSERT INTO reading_articles (title, category, difficulty, content, word_count, source, tags) VALUES
('Remote Work: The New Normal', 'academic', 5,
'The traditional office workplace has undergone a dramatic transformation. Remote work, once considered a perk for select employees, has become standard practice for millions worldwide.

Companies report benefits including reduced overhead costs, access to global talent pools, and improved employee satisfaction. Workers appreciate eliminated commutes, flexible schedules, and better work-life balance.

Yet remote work presents challenges. Collaboration can suffer without spontaneous interactions. Maintaining company culture requires intentional effort. Some employees struggle with isolation and difficulty separating work from personal life.

Many organizations are adopting hybrid models, requiring employees to work from the office part-time while allowing remote work on other days. This approach aims to balance flexibility with the benefits of in-person collaboration.',
460, 'IELTS Cambridge 18 Test 1', '["商业", "工作", "社会"]');

-- ============================================
-- 阅读题目示例 (文章 1 的题目)
-- ============================================

-- 文章 1 题目 1: 判断题
INSERT INTO reading_questions (article_id, question_type, question_number, question_text, correct_answer, ai_explanation) VALUES
(1, 'true_false', 1, 
'Global temperatures have increased by more than 1°C since pre-industrial times.',
'TRUE',
'根据文章第一段："The Earth''s average temperature has risen by approximately 1.1°C since pre-industrial times"，明确说明上升了约 1.1°C，超过 1°C，所以答案为 TRUE。');

-- 文章 1 题目 2: 判断题
INSERT INTO reading_questions (article_id, question_type, question_number, question_text, correct_answer, ai_explanation) VALUES
(1, 'true_false', 2,
'The Paris Agreement successfully limited global warming to below 2°C.',
'FALSE',
'文章最后一段提到："Yet current national commitments fall short of this target"，说明当前各国的承诺还不足以实现 2°C 的目标，因此答案为 FALSE。');

-- 文章 1 题目 3: 填空题
INSERT INTO reading_questions (article_id, question_type, question_number, question_text, correct_answer, ai_explanation) VALUES
(1, 'fill_blank', 3,
'Without immediate action, temperatures could rise by ___ by 2100.',
'3-4°C',
'文章第二段明确指出："temperatures could rise by 3-4°C by 2100"，这是科学家警告的内容。');

-- 文章 1 题目 4: 填空题
INSERT INTO reading_questions (article_id, question_type, question_number, question_text, correct_answer, ai_explanation) VALUES
(1, 'fill_blank', 4,
'Mitigation strategies include transitioning to ___ energy sources.',
'renewable',
'文章第三段提到缓解策略包括："transitioning to renewable energy sources"，即可再生能源。');

-- 文章 1 题目 5: 选择题
INSERT INTO reading_questions (article_id, question_type, question_number, question_text, options, correct_answer, ai_explanation) VALUES
(1, 'multiple_choice', 5,
'What is the main purpose of the Paris Agreement?',
'["To promote renewable energy", "To limit global warming", "To protect forests", "To reduce deforestation"]',
'To limit global warming',
'文章最后一段："The Paris Agreement of 2015 marked a historic commitment by nations to limit global warming to well below 2°C"，明确说明巴黎协定的目的是限制全球变暖。');

-- ============================================
-- 文章 2 题目
-- ============================================

INSERT INTO reading_questions (article_id, question_type, question_number, question_text, correct_answer, ai_explanation) VALUES
(2, 'true_false', 1,
'Online education completion rates are higher than traditional classroom settings.',
'FALSE',
'文章第三段："Studies show completion rates for online courses remain significantly lower than traditional classroom settings"，说明在线课程完成率更低。');

INSERT INTO reading_questions (article_id, question_type, question_number, question_text, correct_answer, ai_explanation) VALUES
(2, 'true_false', 2,
'The pandemic accelerated the adoption of online education.',
'TRUE',
'文章第一段提到："accelerated by technological advances and the global pandemic"。');

INSERT INTO reading_questions (article_id, question_type, question_number, question_text, options, correct_answer, ai_explanation) VALUES
(2, 'multiple_choice', 3,
'What is a major disadvantage of online learning mentioned in the passage?',
'["High costs", "Reduced social interaction", "Limited course options", "Poor quality"]',
'Reduced social interaction',
'文章第三段提到批评者指出的挑战包括："reduced social interaction, the need for self-discipline, and the digital divide"。');

-- ============================================
-- 文章 3 题目
-- ============================================

INSERT INTO reading_questions (article_id, question_type, question_number, question_text, correct_answer, ai_explanation) VALUES
(3, 'true_false', 1,
'AI can diagnose diseases more accurately than human doctors in all medical fields.',
'FALSE',
'文章第一段说："in certain domains"（某些领域），不是所有领域，所以答案为 FALSE。');

INSERT INTO reading_questions (article_id, question_type, question_number, question_text, correct_answer, ai_explanation) VALUES
(3, 'fill_blank', 2,
'___ has seen particularly significant advances in AI application.',
'Radiology',
'文章第二段："Radiology has seen particularly significant advances"。');

-- ============================================
-- 说明
-- ============================================
-- 这是示例数据，实际生产环境需要：
-- 1. 至少 50 篇阅读文章
-- 2. 每篇文章 10-15 道题目
-- 3. 覆盖所有题型 (判断/填空/选择/匹配/段落信息)
-- 4. 难度分布均匀 (1-9 级)
-- ============================================
