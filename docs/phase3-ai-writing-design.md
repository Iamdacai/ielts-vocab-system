# Phase 3: AI 写作辅助 - 详细设计文档

**版本**: v1.0  
**创建时间**: 2026-03-30  
**状态**: 🚀 开发中

---

## 📋 功能概述

### 核心价值
形成"学 - 练 - 用"完整闭环：
- **学**: 背单词 + AI 例句（Phase 1）
- **练**: 口语陪练（Phase 2）
- **用**: 写作辅助（Phase 3）⭐

### 用户场景
1. **学完词包 → AI 出题**: 学完"科技类"50 词 → AI 生成写作题目
2. **作文智能批改**: 提交作文 → AI 评分 + 标注问题 + 给出建议
3. **语料积累**: AI 从作文中提取好句 → 加入个人语料库
4. **考前冲刺**: 复习个人语料库 + 高频话题

---

## 🗄️ 数据库设计

### 1. 写作练习表
```sql
-- 迁移脚本：migrations/007_create_writing_practice.sql
CREATE TABLE writing_practice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  topic_id INTEGER,
  topic TEXT NOT NULL,
  essay_type TEXT NOT NULL CHECK(essay_type IN ('task1', 'task2', 'general')),
  user_essay TEXT NOT NULL,
  word_count INTEGER,
  ai_score INTEGER, -- 总分 (0-100)
  task_response INTEGER, -- 任务回应
  coherence INTEGER, -- 连贯性
  vocabulary INTEGER, -- 词汇
  grammar INTEGER, -- 语法
  ai_feedback TEXT, -- JSON 格式详细反馈
  improved_version TEXT, -- AI 改写版本
  highlighted_errors TEXT, -- JSON 格式错误标注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_writing_user ON writing_practice(user_id);
CREATE INDEX idx_writing_type ON writing_practice(essay_type);
CREATE INDEX idx_writing_created ON writing_practice(created_at);
```

### 2. 写作题库表
```sql
-- 迁移脚本：migrations/008_create_writing_topics.sql
CREATE TABLE writing_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type TEXT NOT NULL CHECK(task_type IN ('task1_academic', 'task1_general', 'task2')),
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  chart_type TEXT, -- Task 1 图表类型 (bar/line/pie/table/process/map)
  sub_questions TEXT, -- JSON 数组
  sample_answer TEXT, -- 范文
  vocabulary_highlights TEXT, -- JSON 高分词汇
  common_mistakes TEXT, -- JSON 常见错误
  difficulty TEXT DEFAULT 'medium',
  frequency INTEGER DEFAULT 0,
  last_test_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_writing_topics_type ON writing_topics(task_type);
CREATE INDEX idx_writing_topics_topic ON writing_topics(topic);
```

### 3. 个人语料库表
```sql
-- 迁移脚本：migrations/009_create_personal_corpus.sql
CREATE TABLE personal_corpus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_type TEXT CHECK(source_type IN ('writing', 'speaking', 'reading')),
  content TEXT NOT NULL,
  content_type TEXT CHECK(content_type IN ('sentence', 'paragraph', 'phrase', 'word')),
  topic_tags TEXT, -- JSON 数组
  vocabulary_used TEXT, -- JSON 数组
  ai_analysis TEXT, -- JSON AI 分析（亮点/用法等）
  usage_count INTEGER DEFAULT 0, -- 使用次数
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_corpus_user ON personal_corpus(user_id);
CREATE INDEX idx_corpus_topic ON personal_corpus(topic_tags);
```

### 4. 用户写作能力画像
```sql
-- 迁移脚本：migrations/010_add_user_writing_profile.sql
ALTER TABLE users ADD COLUMN writing_level TEXT DEFAULT 'beginner';
ALTER TABLE users ADD COLUMN writing_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN writing_weak_areas TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN writing_strong_areas TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN writing_goal_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN writing_practice_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN writing_total_words INTEGER DEFAULT 0;

-- 创建视图
CREATE VIEW v_user_writing_stats AS
SELECT 
  u.id as user_id,
  u.openid,
  u.writing_level,
  u.writing_score,
  u.writing_goal_score,
  COUNT(p.id) as total_practices,
  SUM(p.word_count) as total_words,
  AVG(p.ai_score) as avg_score,
  AVG(p.task_response) as avg_task_response,
  AVG(p.coherence) as avg_coherence,
  AVG(p.vocabulary) as avg_vocabulary,
  AVG(p.grammar) as avg_grammar,
  MAX(p.created_at) as last_practice_at
FROM users u
LEFT JOIN writing_practice p ON u.id = p.user_id
GROUP BY u.id;
```

---

## 🔌 API 接口设计

### 1. 写作练习相关
```javascript
// POST /api/writing/topic/generate
// AI 生成题目（根据学过的词汇）
{
  "learned_words": [123, 456, ...],
  "essay_type": "task2",
  "difficulty": "medium"
}

// POST /api/writing/submit
// 提交作文批改
{
  "topic_id": 789,
  "essay_type": "task2",
  "content": "用户作文内容",
  "word_count": 250
}

// GET /api/writing/history
// 获取练习历史
{
  "type": "all",
  "limit": 20,
  "offset": 0
}

// GET /api/writing/stats
// 获取统计数据
```

### 2. 语料库相关
```javascript
// GET /api/corpus
// 获取个人语料库
{
  "topic": "Technology",
  "limit": 50
}

// POST /api/corpus/add
// 添加语料
{
  "content": "好句内容",
  "source_type": "writing",
  "topic_tags": ["科技", "教育"],
  "ai_analysis": {...}
}

// DELETE /api/corpus/:id
// 删除语料
```

### 3. 题库相关
```javascript
// GET /api/writing/topics
// 获取题库列表
{
  "task_type": "task2",
  "topic": "Education",
  "count": 10
}
```

---

## 🤖 Bailian API 集成

### 1. 作文评分 Prompt
```javascript
const scoringPrompt = `
你是一名雅思考官，有 10 年写作评分经验。请根据雅思写作评分标准进行批改。

【考生信息】
- 当前水平：${userLevel}
- 目标分数：${targetScore}
- 作文类型：${essayType}

【题目】
${topic}

【考生作文】
${essay}

【雅思写作评分标准】
1. 任务回应 (Task Response) - 0-100
   - 是否完整回应题目要求
   - 论点是否清晰、有说服力
   - 论证是否充分

2. 连贯与衔接 (Coherence & Cohesion) - 0-100
   - 文章结构是否清晰
   - 段落之间是否连贯
   - 是否使用恰当的连接词

3. 词汇资源 (Lexical Resource) - 0-100
   - 词汇是否丰富多样
   - 是否使用高级词汇
   - 用词是否准确

4. 语法多样性与准确性 (Grammatical Range & Accuracy) - 0-100
   - 句型是否多样
   - 语法是否正确
   - 标点使用是否恰当

【要求】
1. 按照雅思 9 分制评分
2. 标注具体错误（语法、用词、逻辑）
3. 给出改进建议
4. 提供改写版本（段落级别）

【输出格式】严格返回 JSON：
{
  "overall_score": 6.5,
  "task_response": 7,
  "coherence": 6,
  "vocabulary": 7,
  "grammar": 6,
  "word_count": 250,
  "feedback": "总体评价（100 字内，中文）",
  "strengths": ["优点 1", "优点 2"],
  "weaknesses": ["需改进 1", "需改进 2"],
  "suggestions": ["建议 1", "建议 2", "建议 3"],
  "error_corrections": [
    {
      "original": "错误句子",
      "corrected": "正确句子",
      "explanation": "错误原因",
      "type": "grammar/vocabulary/logic"
    }
  ],
  "improved_paragraphs": [
    {
      "original": "原段落",
      "improved": "改写后",
      "explanation": "改进说明"
    }
  ],
  "vocabulary_highlights": ["好词 1", "好词 2"],
  "useful_expressions": ["好句 1", "好句 2"]
}
`;
```

### 2. AI 出题 Prompt
```javascript
const topicGenerationPrompt = `
你是一名雅思写作命题专家。请根据用户学过的词汇生成写作题目。

【用户学过的词汇】
${learnedWords.join(', ')}

【要求】
1. 题目要能用到这些词汇
2. 符合雅思写作真题风格
3. 难度适中（${difficulty}）
4. 话题贴近生活

【输出格式】严格返回 JSON：
{
  "task_type": "task2",
  "topic": "Education",
  "question": "Some people think that the best way to improve road safety is to increase the minimum legal age for driving cars or riding motorbikes. To what extent do you agree or disagree?",
  "requirements": [
    "Give reasons for your answer",
    "Include any relevant examples from your knowledge or experience",
    "Write at least 250 words"
  ],
  "related_vocabulary": ["词汇 1", "词汇 2"],
  "tips": "写作提示（50 字内）"
}
`;
```

---

## 🎨 前端设计

### 1. 写作练习页面
```javascript
// pages/writing/writing.js
Page({
  data: {
    essayType: 'task2',
    currentTopic: null,
    isWriting: false,
    essayContent: '',
    wordCount: 0,
    writingResult: null,
    timer: 0,
    timerInterval: null
  },

  // 开始写作
  startWriting() {
    // 加载题目
    // 开始计时
  },

  // 提交作文
  submitEssay() {
    // 上传作文
    // 显示批改结果
  },

  // 添加到语料库
  addToCorpus() {
    // 选择好句
    // 保存到语料库
  }
});
```

### 2. WXML 结构
```xml
<!-- 写作练习页面 -->
<view class="writing-container">
  <!-- 题目显示 -->
  <view class="topic-card">
    <text class="topic-type">{{essayType === 'task2' ? 'Task 2' : 'Task 1'}}</text>
    <text class="topic-question">{{currentTopic.question}}</text>
    <text class="topic-requirements">字数要求：至少 250 词</text>
  </view>

  <!-- 计时器和字数统计 -->
  <view class="writing-status">
    <text class="timer">⏱️ {{timer}}分钟</text>
    <text class="word-count">📝 {{wordCount}}词</text>
  </view>

  <!-- 作文输入框 -->
  <textarea 
    class="essay-input"
    placeholder="开始写作..."
    bindinput="onInput"
    maxlength="-1"
  />

  <!-- 提交按钮 -->
  <button class="submit-button" bindtap="submitEssay">
    提交作文
  </button>

  <!-- 批改结果 -->
  <view class="result-section" wx:if="{{writingResult}}">
    <!-- 总分 -->
    <view class="score-overview">
      <text class="score-number">{{writingResult.overall_score}}</text>
      <text class="score-label">总分</text>
    </view>

    <!-- 四维评分 -->
    <view class="score-details">
      <view class="score-item">
        <text>任务回应</text>
        <progress percent="{{writingResult.task_response}}" />
      </view>
      <view class="score-item">
        <text>连贯衔接</text>
        <progress percent="{{writingResult.coherence}}" />
      </view>
      <view class="score-item">
        <text>词汇</text>
        <progress percent="{{writingResult.vocabulary}}" />
      </view>
      <view class="score-item">
        <text>语法</text>
        <progress percent="{{writingResult.grammar}}" />
      </view>
    </view>

    <!-- 错误标注 -->
    <view class="error-section">
      <text class="section-title">📝 错误标注</text>
      <view class="error-item" wx:for="{{writingResult.error_corrections}}" wx:key="*this">
        <text class="error-original">{{item.original}}</text>
        <text class="error-arrow">→</text>
        <text class="error-corrected">{{item.corrected}}</text>
        <text class="error-explanation">{{item.explanation}}</text>
      </view>
    </view>

    <!-- 改进建议 -->
    <view class="suggestions-section">
      <text class="section-title">💡 改进建议</text>
      <view class="suggestion-item" wx:for="{{writingResult.suggestions}}" wx:key="*this">
        <text>• {{item}}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="result-actions">
      <button class="retry-button" bindtap="retryWriting">🔄 重新写作</button>
      <button class="corpus-button" bindtap="addToCorpus">📚 加入语料库</button>
    </view>
  </view>
</view>
```

---

## ✅ 开发任务清单

### 后端（预计 3-4 天）
- [ ] **Day 1**: 数据库迁移
  - [ ] 创建 writing_practice 表
  - [ ] 创建 writing_topics 表
  - [ ] 创建 personal_corpus 表
  - [ ] 添加用户写作能力字段
  - [ ] 导入写作题库

- [ ] **Day 2**: 服务层开发
  - [ ] 实现 writing-service.js
  - [ ] 实现 writing-scorer.js（作文评分）
  - [ ] 实现 corpus-service.js（语料库管理）

- [ ] **Day 3**: API 路由开发
  - [ ] 实现 /api/writing/* 接口
  - [ ] 实现 /api/corpus/* 接口
  - [ ] 集成 Bailian 评分 API

- [ ] **Day 4**: 优化和测试
  - [ ] 性能优化
  - [ ] 错误处理
  - [ ] 单元测试

### 前端（预计 3-4 天）
- [ ] **Day 5**: 写作练习页面
  - [ ] 创建页面结构
  - [ ] 实现作文输入
  - [ ] 实现计时器和字数统计

- [ ] **Day 6**: 批改结果展示
  - [ ] 评分展示 UI
  - [ ] 错误标注展示
  - [ ] 改进建议展示

- [ ] **Day 7**: 语料库页面
  - [ ] 语料库列表
  - [ ] 语料添加
  - [ ] 语料管理

- [ ] **Day 8**: 测试和优化
  - [ ] 端到端测试
  - [ ] UI 细节调整
  - [ ] 性能优化

---

## 📊 成功指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 写作练习参与率 | >30% | 日活用户中使用写作功能比例 |
| 平均作文长度 | >250 词 | 提交作文平均词数 |
| 用户满意度 | >4.5/5 | 评分功能满意度调查 |
| AI 评分准确度 | >85% | 与真人评分对比 |
| 语料库使用率 | >50% | 使用语料库的用户比例 |

---

## 🎯 差异化优势

| 功能 | 百词斩 | 不背单词 | 雅思智能背单词 |
|------|--------|----------|----------------|
| AI 出题 | ❌ | ❌ | ✅ 根据学词 |
| 作文批改 | ❌ | ❌ | ✅ 四维评分 |
| 错误标注 | ❌ | ❌ | ✅ 详细标注 |
| 语料库 | ❌ | ❌ | ✅ 个人语料 |
| 改写建议 | ❌ | ❌ | ✅ 段落改写 |

**核心优势**: 从"输入"到"输出"，完整学习闭环！

---

_下一步：开始 Day 1 开发（数据库迁移 + 题库导入）_
