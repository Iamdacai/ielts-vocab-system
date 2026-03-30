# Phase 2: AI 口语陪练 - 详细设计文档

**版本**: v1.0  
**创建时间**: 2026-03-30  
**状态**: 🚀 开发中

---

## 📋 功能概述

### 核心价值
从"背单词"升级为"练口语"，形成学习闭环：
- **Level 1**: 单词发音（现有）
- **Level 2**: 例句跟读（新增）
- **Level 3**: AI 对话（杀手锏）

### 用户场景
1. **单词跟读**: 学习页面 → 点击跟读 → AI 评分 → 改进发音
2. **句子跟读**: 复习页面 → 例句跟读 → 流利度评分
3. **AI 对话**: 口语页面 → 选择话题 → AI 考官对话 → 综合评分
4. **模拟考场**: 全真模拟 → Part 1/2/3 → 考前冲刺

---

## 🗄️ 数据库设计

### 1. 口语练习记录表
```sql
-- 迁移脚本：migrations/004_create_speaking_practice.sql
CREATE TABLE speaking_practice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  practice_type TEXT NOT NULL CHECK(practice_type IN ('word', 'sentence', 'conversation', 'ielts_mock')),
  topic TEXT,
  question TEXT,
  audio_url TEXT,
  audio_duration REAL, -- 录音时长（秒）
  transcript TEXT, -- 语音识别结果
  score INTEGER, -- 总分 (0-100)
  accuracy INTEGER, -- 准确度
  fluency INTEGER, -- 流利度
  pronunciation INTEGER, -- 发音
  grammar INTEGER, -- 语法（对话模式）
  vocabulary INTEGER, -- 词汇（对话模式）
  coherence INTEGER, -- 连贯性（对话模式）
  feedback TEXT, -- JSON 格式详细反馈
  ai_suggestions TEXT, -- JSON 格式改进建议
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_speaking_user ON speaking_practice(user_id);
CREATE INDEX idx_speaking_type ON speaking_practice(practice_type);
CREATE INDEX idx_speaking_created ON speaking_practice(created_at);
```

### 2. 雅思口语题库表
```sql
-- 迁移脚本：migrations/005_create_ielts_speaking_topics.sql
CREATE TABLE ielts_speaking_topics (
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

CREATE INDEX idx_topics_part ON ielts_speaking_topics(part);
CREATE INDEX idx_topics_topic ON ielts_speaking_topics(topic);
```

### 3. 用户口语能力画像
```sql
-- 迁移脚本：migrations/006_add_user_speaking_profile.sql
ALTER TABLE users ADD COLUMN speaking_level TEXT DEFAULT 'beginner';
ALTER TABLE users ADD COLUMN speaking_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN speaking_weak_areas TEXT DEFAULT '[]'; -- JSON
ALTER TABLE users ADD COLUMN speaking_strong_areas TEXT DEFAULT '[]'; -- JSON
ALTER TABLE users ADD COLUMN speaking_goal_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN speaking_practice_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN speaking_total_minutes REAL DEFAULT 0;

-- 创建用户口语统计视图
CREATE VIEW v_user_speaking_stats AS
SELECT 
  u.id as user_id,
  COUNT(p.id) as total_practices,
  SUM(p.audio_duration) / 60 as total_minutes,
  AVG(p.score) as avg_score,
  MAX(p.created_at) as last_practice_at,
  u.speaking_level,
  u.speaking_goal_score
FROM users u
LEFT JOIN speaking_practice p ON u.id = p.user_id
GROUP BY u.id;
```

---

## 🔌 API 接口设计

### 1. 口语练习相关
```javascript
// POST /api/speaking/practice
// 开始一次练习
{
  "type": "word", // 'word' | 'sentence' | 'conversation' | 'ielts_mock'
  "word_id": 123, // word 类型必需
  "sentence": "...", // sentence 类型必需
  "topic_id": 456 // ielts_mock 类型必需
}

// POST /api/speaking/submit
// 提交录音评分
{
  "practice_id": 789,
  "audio_url": "...",
  "audio_duration": 15.5,
  "transcript": "用户说的内容（可选，后端识别）"
}

// GET /api/speaking/history
// 获取练习历史
{
  "type": "all", // 可选过滤
  "limit": 20,
  "offset": 0
}

// GET /api/speaking/stats
// 获取统计数据
```

### 2. AI 对话相关
```javascript
// POST /api/speaking/conversation/start
// 开始 AI 对话
{
  "topic": "Technology",
  "part": 1, // 1/2/3
  "user_level": "intermediate"
}

// POST /api/speaking/conversation/message
// 发送消息（用户说完后）
{
  "session_id": "...",
  "user_transcript": "I think technology is...",
  "audio_url": "..."
}

// GET /api/speaking/conversation/:session_id
// 获取对话历史
```

### 3. 模拟考场相关
```javascript
// POST /api/speaking/mock/start
// 开始模拟考场
{
  "full_test": true, // true=Part1+2+3, false=单部分
  "parts": [1, 2, 3]
}

// POST /api/speaking/mock/submit
// 提交模拟考试
{
  "session_id": "...",
  "answers": [
    { "part": 1, "question_id": 1, "audio_url": "...", "transcript": "..." },
    { "part": 2, "question_id": 2, "audio_url": "...", "transcript": "..." },
    ...
  ]
}

// GET /api/speaking/mock/result/:session_id
// 获取模拟考试结果
```

### 4. 题库相关
```javascript
// GET /api/speaking/topics
// 获取题库列表
{
  "part": 1, // 可选过滤
  "topic": "Technology", // 可选过滤
  "difficulty": "medium" // 可选过滤
}

// GET /api/speaking/topics/random
// 随机获取题目
{
  "part": 1,
  "count": 5
}
```

---

## 🤖 Bailian API 集成

### 1. 语音识别（STT）
```javascript
// 使用 Bailian 语音识别 API
const sttResult = await bailian.speechToText(audioBuffer, {
  model: 'paraformer-realtime-v2',
  language: 'en-US',
  enable_intermediate_result: true
});

// 返回：
{
  transcript: "I think technology has changed our lives...",
  confidence: 0.95,
  words: [
    { word: "I", start: 0, end: 100, confidence: 0.98 },
    { word: "think", start: 150, end: 300, confidence: 0.96 },
    ...
  ]
}
```

### 2. 口语评分
```javascript
const scoringPrompt = `
你是一名雅思口语考官。请根据以下标准评分：

【用户回答】
问题：${question}
回答：${transcript}

【评分标准】
1. 流利度与连贯性 (0-100)
   - 语速是否自然
   - 是否有过多停顿
   - 逻辑是否清晰

2. 词汇多样性 (0-100)
   - 词汇是否丰富
   - 是否使用高级词汇
   - 用词是否准确

3. 语法多样性与准确性 (0-100)
   - 句型是否多样
   - 语法是否正确
   - 时态使用是否恰当

4. 发音 (0-100)
   - 发音是否清晰
   - 语调是否自然
   - 重音是否正确

【输出格式】
{
  "overall_score": 75,
  "fluency": 70,
  "vocabulary": 80,
  "grammar": 75,
  "pronunciation": 75,
  "feedback": "总体评价（50 字内）",
  "strengths": ["优点 1", "优点 2"],
  "weaknesses": ["需改进 1", "需改进 2"],
  "suggestions": ["建议 1", "建议 2"]
}
`;
```

### 3. AI 对话
```javascript
const conversationPrompt = `
你是一名雅思口语考官，正在进行 Part ${part} 考试。

【考生信息】
- 当前水平：${user_level}
- 目标分数：${target_score}
- 话题：${topic}

【考试要求】
- Part 1: 简短回答，每个问题 2-3 句话
- Part 2: 根据题卡陈述 1-2 分钟
- Part 3: 深入讨论，每个问题 4-5 句话

【你的角色】
1. 用英语提问，问题自然口语化
2. 根据用户回答追问（Part 3）
3. 保持友好但专业的语气
4. 每次只问一个问题
5. 适当给予鼓励

【当前对话历史】
${conversation_history}

【用户最新回答】
${user_response}

【输出格式】
{
  "examiner_response": "考官回应（如有）",
  "next_question": "下一个问题",
  "should_continue": true,
  "should_end": false,
  "feedback": "阶段性反馈（可选）"
}
`;
```

---

## 🎨 前端设计

### 1. 口语练习页面
```javascript
// pages/speaking/speaking.js
Page({
  data: {
    practiceType: 'word', // word/sentence/conversation/mock
    currentWord: null,
    currentSentence: null,
    isRecording: false,
    recordingTime: 0,
    practiceResult: null,
    conversationHistory: [],
    mockSession: null
  },

  // 开始录音
  startPractice() {
    // 检查权限
    // 开始录音
    // 显示波形动画
  },

  // 提交评分
  submitPractice() {
    // 上传录音
    // 显示评分结果
    // 展示改进建议
  }
});
```

### 2. WXML 结构
```xml
<!-- 口语练习页面 -->
<view class="speaking-container">
  <!-- 练习类型选择 -->
  <view class="type-selector">
    <view class="type-item {{type==='word'?'active':''}}" bindtap="selectType" data-type="word">
      📖 单词跟读
    </view>
    <view class="type-item {{type==='sentence'?'active':''}}" bindtap="selectType" data-type="sentence">
      💬 句子跟读
    </view>
    <view class="type-item {{type==='conversation'?'active':''}}" bindtap="selectType" data-type="conversation">
      🤖 AI 对话
    </view>
    <view class="type-item {{type==='mock'?'active':''}}" bindtap="selectType" data-type="mock">
      📝 模拟考场
    </view>
  </view>

  <!-- 练习区域 -->
  <view class="practice-area">
    <!-- 单词/句子展示 -->
    <view class="content-display">
      <text class="main-text">{{currentWord || currentSentence}}</text>
    </view>

    <!-- 录音按钮 -->
    <view class="record-section">
      <view class="record-button {{isRecording ? 'recording' : ''}}" bindtap="toggleRecording">
        <view class="mic-icon">🎤</view>
        <text>{{isRecording ? '停止录音' : '点击录音'}}</text>
      </view>
      <text class="recording-time" wx:if="{{isRecording}}">{{recordingTime}}s</text>
    </view>

    <!-- 评分结果 -->
    <view class="result-section" wx:if="{{practiceResult}}">
      <view class="score-circle">
        <text class="score-number">{{practiceResult.overall_score}}</text>
        <text class="score-label">总分</text>
      </view>
      
      <view class="score-details">
        <view class="score-item">
          <text>流利度</text>
          <progress percent="{{practiceResult.fluency}}" />
        </view>
        <view class="score-item">
          <text>词汇</text>
          <progress percent="{{practiceResult.vocabulary}}" />
        </view>
        <view class="score-item">
          <text>语法</text>
          <progress percent="{{practiceResult.grammar}}" />
        </view>
        <view class="score-item">
          <text>发音</text>
          <progress percent="{{practiceResult.pronunciation}}" />
        </view>
      </view>

      <view class="feedback-section">
        <text class="feedback-title">📝 考官点评</text>
        <text class="feedback-text">{{practiceResult.feedback}}</text>
      </view>

      <view class="suggestions-section">
        <text class="suggestions-title">💡 改进建议</text>
        <view class="suggestion-item" wx:for="{{practiceResult.suggestions}}" wx:key="*this">
          <text>• {{item}}</text>
        </view>
      </view>

      <button class="retry-button" bindtap="retryPractice">🔄 重新练习</button>
    </view>
  </view>
</view>
```

---

## 📁 文件结构

```
ielts-vocab-system/
├── backend/
│   ├── routes/
│   │   └── speaking.js              # 新增：口语练习路由
│   ├── services/
│   │   ├── speaking-service.js      # 新增：口语练习服务
│   │   ├── bailian-stt-service.js   # 新增：语音识别服务
│   │   └── speaking-scorer.js       # 新增：口语评分服务
│   └── migrations/
│       ├── 004_create_speaking_practice.sql
│       ├── 005_create_ielts_speaking_topics.sql
│       └── 006_add_user_speaking_profile.sql
├── frontend/
│   ├── pages/
│   │   └── speaking/                # 新增：口语练习页
│   │       ├── speaking.js
│   │       ├── speaking.json
│   │       ├── speaking.wxml
│   │       └── speaking.wxss
│   └── app.json                     # 修改：添加页面路由
└── docs/
    └── phase2-ai-speaking-design.md # 本文档
```

---

## ✅ 开发任务清单

### 后端（预计 4-5 天）
- [ ] **Day 1**: 数据库迁移
  - [ ] 创建 speaking_practice 表
  - [ ] 创建 ielts_speaking_topics 表
  - [ ] 添加用户口语能力字段
  - [ ] 导入雅思口语题库（2026 年最新版）

- [ ] **Day 2**: 服务层开发
  - [ ] 实现 speaking-service.js
  - [ ] 实现 bailian-stt-service.js（语音识别）
  - [ ] 实现 speaking-scorer.js（评分算法）

- [ ] **Day 3**: API 路由开发
  - [ ] 实现 /api/speaking/practice
  - [ ] 实现 /api/speaking/submit
  - [ ] 实现 /api/speaking/history
  - [ ] 实现 /api/speaking/stats

- [ ] **Day 4**: AI 对话功能
  - [ ] 实现 /api/speaking/conversation/*
  - [ ] 对话状态管理
  - [ ] 集成 Bailian 对话 API

- [ ] **Day 5**: 模拟考场功能
  - [ ] 实现 /api/speaking/mock/*
  - [ ] 完整评分逻辑
  - [ ] 生成详细报告

### 前端（预计 4-5 天）
- [ ] **Day 6**: 口语练习页面
  - [ ] 创建页面结构
  - [ ] 实现录音功能
  - [ ] 实现评分展示

- [ ] **Day 7**: AI 对话界面
  - [ ] 聊天式 UI
  - [ ] 实时对话流
  - [ ] 对话历史展示

- [ ] **Day 8**: 模拟考场界面
  - [ ] 考试流程控制
  - [ ] 计时器
  - [ ] 题卡展示（Part 2）

- [ ] **Day 9**: 统计和历史
  - [ ] 练习历史列表
  - [ ] 数据可视化（图表）
  - [ ] 能力雷达图

- [ ] **Day 10**: 测试和优化
  - [ ] 端到端测试
  - [ ] 性能优化
  - [ ] UI 细节调整

---

## 📊 成功指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 口语练习参与率 | >40% | 日活用户中使用口语功能比例 |
| 平均练习时长 | >8 分钟/天 | 录音总时长 |
| 用户满意度 | >4.5/5 | 评分功能满意度调查 |
| AI 评分准确度 | >85% | 与真人评分对比 |
| 复练率 | >60% | 用户重复练习比例 |

---

## 🎯 差异化优势

| 功能 | 百词斩 | 不背单词 | 雅思智能背单词 |
|------|--------|----------|----------------|
| 单词发音 | ✅ | ✅ | ✅ |
| 句子跟读 | ❌ | ⚠️ 部分 | ✅ 完整 |
| AI 对话 | ❌ | ❌ | ✅ 杀手锏 |
| 模拟考场 | ❌ | ❌ | ✅ 全真模拟 |
| 能力画像 | ❌ | ❌ | ✅ 个性化 |
| 详细评分 | ⚠️ 基础 | ⚠️ 基础 | ✅ 四维评分 |

**核心优势**: 从"背单词"升级为"练口语"，一站式解决雅思口语备考！

---

_下一步：开始 Day 1 开发（数据库迁移 + 题库导入）_
