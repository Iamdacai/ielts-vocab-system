# 🤖 AI 功能开发路线图

**创建时间**: 2026-03-30  
**优先级**: ⭐⭐⭐⭐⭐

---

## 📋 开发顺序（用户确认）

1. ✅ **AI 语境生成**（个性化例句）- 优先级最高
2. ✅ **AI 口语陪练**（对话练习）- 优先级最高
3. ⏳ **AI 写作辅助**（作文批改）
4. ⏳ **AI 个性化学习路径**（诊断 + 动态推荐）
5. ⏳ **知识图谱可视化**（词网关系）

---

## 🎯 Phase 1: AI 语境生成（预计 1-2 周）

### 功能描述
- 根据用户兴趣标签生成个性化例句
- 结合雅思场景动态生成语境
- 支持例句难度分级

### 技术实现

#### 后端接口
```javascript
// routes/ai-context.js
POST /api/ai/generate-example
  - 输入：word, user_interests, ielts_topic, difficulty
  - 输出：{ examples: [], ai_explanation: "" }

GET /api/ai/user-interests
  - 获取用户兴趣标签

PUT /api/ai/user-interests
  - 更新用户兴趣标签
```

#### 数据库变更
```sql
-- 用户表新增字段
ALTER TABLE users ADD COLUMN interests TEXT; -- JSON 数组
ALTER TABLE users ADD COLUMN preferred_topics TEXT; -- JSON 数组

-- 例句表新增字段
ALTER TABLE word_examples ADD COLUMN ai_generated INTEGER DEFAULT 0;
ALTER TABLE word_examples ADD COLUMN interest_tags TEXT; -- JSON 数组
ALTER TABLE word_examples ADD COLUMN difficulty_level TEXT; -- 'easy'/'medium'/'hard'
```

#### 前端页面
- 兴趣标签选择页（首次使用时引导）
- 学习页面例句展示（AI 生成标记）
- 例句反馈（点赞/不喜欢）

### Bailian API 调用
```javascript
// Prompt 示例
const prompt = `
为雅思单词 "${word}" 生成 3 个例句，要求：
1. 结合用户兴趣：${interests.join(', ')}
2. 符合雅思${topic}场景
3. 难度：${difficulty}
4. 包含中文翻译
5. 标注重点搭配

返回 JSON 格式：
{
  "examples": [
    {"en": "...", "cn": "...", "collocations": ["..."]}
  ]
}
`;
```

### 开发任务清单
- [ ] 设计数据库 schema 变更
- [ ] 实现 Bailian API 调用封装
- [ ] 开发 `/api/ai/generate-example` 接口
- [ ] 开发用户兴趣标签管理接口
- [ ] 前端兴趣选择页
- [ ] 学习页面例句展示优化
- [ ] 例句反馈机制
- [ ] 缓存策略（避免重复生成）

---

## 🎯 Phase 2: AI 口语陪练（预计 3-4 周）

### 功能描述
- 单词 → 句子 → 对话三级练习
- 雅思口语模拟（Part 1/2/3）
- 实时评分 + 改进建议

### 技术实现

#### 后端接口
```javascript
// routes/ai-speaking.js
POST /api/ai/speaking/practice
  - 输入：word/sentence, audio_data
  - 输出：{ score, feedback, suggestions: [] }

POST /api/ai/speaking/conversation
  - 输入：topic, user_message, conversation_history
  - 输出：{ ai_response: "", follow_up_question: "" }

POST /api/ai/speaking/ielts-mock
  - 输入：part (1/2/3), topic_card
  - 输出：{ question: "", time_limit: 0 }

GET /api/ai/speaking/topics
  - 获取口语题库

POST /api/ai/speaking/evaluate
  - 输入：transcript, topic
  - 输出：{ overall_score, fluency, vocabulary, grammar, coherence }
```

#### 数据库变更
```sql
-- 口语练习记录表
CREATE TABLE speaking_practice (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  practice_type TEXT, -- 'word'/'sentence'/'conversation'/'ielts_mock'
  topic TEXT,
  audio_url TEXT,
  transcript TEXT,
  score INTEGER,
  feedback TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 口语题库表
CREATE TABLE ielts_speaking_topics (
  id INTEGER PRIMARY KEY,
  part INTEGER, -- 1/2/3
  topic TEXT,
  question TEXT,
  follow_ups TEXT, -- JSON 数组
  sample_answer TEXT,
  vocabulary_highlights TEXT -- JSON 数组
);
```

#### 前端页面
- 口语练习入口（学习页面 + 独立页面）
- 录音界面（波形可视化）
- 评分结果展示（雷达图）
- AI 对话界面（聊天式 UI）
- 口语模拟考场（计时器 + 题库）

### Bailian API 调用
```javascript
// 口语对话 Prompt
const prompt = `
你是一名雅思口语考官，正在进行 Part ${part} 考试。
话题：${topic}
用户水平：${user_level}

要求：
1. 用英语提问，问题自然口语化
2. 根据用户回答追问
3. 每次只问一个问题
4. 保持友好但专业的语气

用户回答：${user_response}
`;
```

### 开发任务清单
- [ ] 口语题库数据导入（2026 年最新题库）
- [ ] 语音识别集成（微信小程序 API）
- [ ] 发音评分接口（现有升级）
- [ ] AI 对话接口
- [ ] 口语模拟接口
- [ ] 综合评分算法
- [ ] 前端录音界面
- [ ] 对话界面 UI
- [ ] 评分结果可视化
- [ ] 练习历史记录

---

## 🎯 Phase 3: AI 写作辅助（预计 2 周）

### 功能描述
- 学完词包 → AI 出题
- 作文智能批改
- 语料积累

### 技术实现

#### 后端接口
```javascript
// routes/ai-writing.js
POST /api/ai/writing/generate-topic
  - 输入：learned_words[], ielts_type (A/G)
  - 输出：{ topic: "", requirements: "", related_words: [] }

POST /api/ai/writing/evaluate
  - 输入：essay, topic, user_level
  - 输出：{ overall_score, task_response, coherence, vocabulary, grammar, feedback: [] }

POST /api/ai/writing/suggest-improvement
  - 输入：paragraph, focus (vocabulary/grammar/coherence)
  - 输出：{ original: "", improved: "", explanations: [] }

GET /api/ai/writing/personal-corpus
  - 获取个人语料库
```

#### 数据库变更
```sql
-- 写作练习表
CREATE TABLE writing_practice (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  topic TEXT,
  essay_type TEXT, -- 'task1'/'task2'
  user_essay TEXT,
  ai_score INTEGER,
  ai_feedback TEXT, -- JSON
  improved_version TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 个人语料库表
CREATE TABLE personal_corpus (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  source_type TEXT, -- 'writing'/'speaking'/'reading'
  content TEXT,
  vocabulary_used TEXT, -- JSON 数组
  topic_tags TEXT, -- JSON 数组
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 开发任务清单
- [ ] 写作题库数据准备
- [ ] AI 出题接口
- [ ] 作文批改接口
- [ ] 改进建议接口
- [ ] 个人语料库功能
- [ ] 前端写作编辑器
- [ ] 批改结果展示
- [ ] 语料库管理界面

---

## 🎯 Phase 4: AI 个性化学习路径（预计 2-3 周）

### 功能描述
- 入学诊断测试
- 动态学习路径
- 智能预测

### 技术实现

#### 后端接口
```javascript
// routes/ai-path.js
POST /api/ai/diagnosis/test
  - 输入：answers[]
  - 输出：{ vocabulary_level, weak_areas: [], recommended_plan: {} }

GET /api/ai/path/recommend
  - 输入：user_id, target_score
  - 输出：{ daily_plan: {}, word_priority: [], review_schedule: {} }

POST /api/ai/path/predict
  - 输入：learning_history, target_score
  - 输出：{ predicted_score: "", confidence: "", suggestions: [] }
```

#### 数据库变更
```sql
-- 用户能力画像
ALTER TABLE users ADD COLUMN ability_profile TEXT; -- JSON
ALTER TABLE users ADD COLUMN target_score TEXT; -- '6.5'/'7'/'7.5'
ALTER TABLE users ADD COLUMN learning_plan TEXT; -- JSON

-- 诊断测试记录
CREATE TABLE diagnosis_tests (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  test_date DATETIME,
  results TEXT, -- JSON
  recommendations TEXT -- JSON
);
```

### 开发任务清单
- [ ] 诊断测试题库
- [ ] 能力评估算法
- [ ] 学习路径推荐算法
- [ ] 预测模型
- [ ] 前端诊断测试页
- [ ] 学习计划展示
- [ ] 进度追踪可视化

---

## 🎯 Phase 5: 知识图谱可视化（预计 2 周）

### 功能描述
- 语义网络可视化
- 词根词缀 AI 拆解
- 主题词网

### 技术实现

#### 后端接口
```javascript
// routes/ai-graph.js
GET /api/ai/word-graph/:word
  - 输出：{ word, relations: [{type, target, strength}], visualization_data: {} }

POST /api/ai/word-analyze
  - 输入：word
  - 输出：{ root: "", affixes: [], etymology: "", related_words: [] }

GET /api/ai/topic-network/:topic
  - 输出：{ topic, core_words: [], extended_words: [], connections: [] }
```

#### 数据库变更
```sql
-- 词关系表
CREATE TABLE word_relations (
  id INTEGER PRIMARY KEY,
  word_id INTEGER,
  related_word_id INTEGER,
  relation_type TEXT, -- 'synonym'/'antonym'/'hypernym'/'collocation'/'word_family'
  strength REAL, -- 0-1
  ai_generated INTEGER DEFAULT 0
);
```

### 开发任务清单
- [ ] 词关系 AI 批量生成
- [ ] 词根词缀数据库
- [ ] 图谱查询接口
- [ ] 前端可视化组件（D3.js / Canvas）
- [ ] 交互式词网浏览
- [ ] 词根拆解展示

---

## 📅 总体时间线

| 阶段 | 功能 | 预计时间 | 里程碑 |
|------|------|----------|--------|
| Phase 1 | AI 语境生成 | 1-2 周 | 3 月中旬完成 |
| Phase 2 | AI 口语陪练 | 3-4 周 | 4 月中旬完成 |
| Phase 3 | AI 写作辅助 | 2 周 | 4 月下旬完成 |
| Phase 4 | 个性化路径 | 2-3 周 | 5 月中旬完成 |
| Phase 5 | 知识图谱 | 2 周 | 5 月下旬完成 |

**总计**: 10-13 周（约 2.5-3 个月）

---

## 🔧 技术准备

### Bailian API 配置
- 确认 API Key 权限（文本生成、语音识别）
- 设置调用频率限制
- 实现重试机制

### 性能优化
- AI 生成结果缓存（Redis/内存）
- 异步任务队列（长文本生成）
- CDN 加速（音频/图片资源）

### 成本控制
- 设置每日 AI 调用预算
- 免费用户限制次数
- 会员无限使用

---

## 📊 成功指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| AI 例句使用率 | >60% | 埋点统计 |
| 口语练习时长 | >10 分钟/天 | 使用时长 |
| 作文提交数 | >5 篇/月 | 提交记录 |
| 用户留存率 | >70% (7 日) | 数据分析 |
| NPS 评分 | >50 | 用户调研 |

---

_最后更新：2026-03-30 | 小微 🐍_
