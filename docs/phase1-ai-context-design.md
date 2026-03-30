# Phase 1: AI 语境生成 - 详细设计文档

**版本**: v1.0  
**创建时间**: 2026-03-30  
**状态**: 🚀 开发中

---

## 📋 功能概述

### 核心价值
- **传统例句**: "The government announced a new policy."（固定、无趣）
- **AI 例句**: "The AI startup announced a breakthrough in quantum computing."（个性化、相关）

### 用户场景
1. 首次使用 → 选择兴趣标签 → 后续例句自动个性化
2. 学习单词 → 看到 AI 生成的专属例句 → 记忆更深刻
3. 例句不满意 → 点击"换一批" → AI 重新生成

---

## 🗄️ 数据库设计

### 1. 用户表变更
```sql
-- 迁移脚本：migrations/001_add_user_interests.sql
ALTER TABLE users ADD COLUMN interests TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN preferred_topics TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN ai_context_enabled INTEGER DEFAULT 1;

-- 示例数据
-- interests: ["科技", "商业", "娱乐"]
-- preferred_topics: ["科技发明", "社会经济", "娱乐运动"]
```

### 2. 例句表变更
```sql
-- 迁移脚本：migrations/002_add_ai_examples.sql
ALTER TABLE word_examples ADD COLUMN ai_generated INTEGER DEFAULT 0;
ALTER TABLE word_examples ADD COLUMN interest_tags TEXT; -- JSON: ["科技", "商业"]
ALTER TABLE word_examples ADD COLUMN difficulty_level TEXT DEFAULT 'medium';
ALTER TABLE word_examples ADD COLUMN topic_category TEXT; -- 22 个场景分类
ALTER TABLE word_examples ADD COLUMN feedback_count INTEGER DEFAULT 0;
ALTER TABLE word_examples ADD COLUMN positive_feedback INTEGER DEFAULT 0;
```

### 3. 新建 AI 生成记录表
```sql
-- 迁移脚本：migrations/003_create_ai_generation_logs.sql
CREATE TABLE ai_generation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  word TEXT,
  prompt_hash TEXT, -- 用于去重
  generated_examples TEXT, -- JSON
  bailian_tokens_used INTEGER,
  generation_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_logs_user ON ai_generation_logs(user_id);
CREATE INDEX idx_ai_logs_word ON ai_generation_logs(word);
```

---

## 🔌 API 接口设计

### 1. 获取/更新用户兴趣
```javascript
// GET /api/ai/user-interests
// 响应
{
  "success": true,
  "data": {
    "interests": ["科技", "商业", "娱乐"],
    "preferred_topics": ["科技发明", "社会经济"],
    "ai_context_enabled": true
  }
}

// PUT /api/ai/user-interests
// 请求
{
  "interests": ["科技", "商业"],
  "preferred_topics": ["科技发明", "社会经济"],
  "ai_context_enabled": true
}
```

### 2. 生成 AI 例句
```javascript
// POST /api/ai/generate-example
// 请求
{
  "word": "breakthrough",
  "word_id": 1234,
  "count": 3,
  "difficulty": "medium", // 'easy' | 'medium' | 'hard'
  "force_regenerate": false // 是否强制重新生成
}

// 响应
{
  "success": true,
  "data": {
    "word": "breakthrough",
    "examples": [
      {
        "id": 9001,
        "en": "The AI startup announced a breakthrough in quantum computing.",
        "cn": "这家 AI 初创公司宣布在量子计算领域取得突破。",
        "collocations": ["announce a breakthrough", "breakthrough in"],
        "ai_generated": true,
        "difficulty": "medium",
        "topic": "科技发明"
      }
    ],
    "ai_explanation": "这个词常用于描述科技、医学等领域的重大进展",
    "from_cache": false
  }
}
```

### 3. 例句反馈
```javascript
// POST /api/ai/example-feedback
// 请求
{
  "example_id": 9001,
  "feedback": "like", // 'like' | 'dislike'
  "reason": "" // 可选，如果不喜欢可以说明原因
}

// 响应
{
  "success": true,
  "message": "反馈已记录"
}
```

---

## 🤖 Bailian API 集成

### 1. Prompt 模板
```javascript
// backend/services/ai-context-service.js

const EXAMPLE_PROMPT = `
你是一名雅思英语教学专家。请为单词 "${word}" 生成${count}个例句。

【用户信息】
- 兴趣标签：${interests.join(', ')}
- 偏好场景：${preferredTopics.join(', ')}
- 英语水平：${difficulty}

【要求】
1. 例句要结合用户的兴趣，让用户觉得有用、有趣
2. 符合雅思${topicCategory}场景
3. 难度分级：
   - easy: 简单句，15 词以内，基础词汇
   - medium: 复合句，15-25 词，含雅思高频词
   - hard: 复杂句，25 词+，含学术词汇
4. 每个例句包含：
   - 英文原句
   - 中文翻译
   - 重点搭配（2-3 个）
5. 避免生僻话题（如政治敏感、宗教等）

【输出格式】
严格返回 JSON，不要其他解释：
{
  "examples": [
    {
      "en": "英文句子",
      "cn": "中文翻译",
      "collocations": ["搭配 1", "搭配 2"]
    }
  ],
  "explanation": "这个词的核心用法说明（50 字内）"
}
`;
```

### 2. 服务层实现
```javascript
// backend/services/ai-context-service.js

const BailianClient = require('./bailian-client');

class AIContextService {
  constructor() {
    this.bailian = new BailianClient();
    this.cache = new Map(); // 内存缓存
  }

  async generateExamples(word, userId, options = {}) {
    const { count = 3, difficulty = 'medium', forceRegenerate = false } = options;
    
    // 1. 检查缓存
    const cacheKey = `${word}_${difficulty}_${count}`;
    if (!forceRegenerate && this.cache.has(cacheKey)) {
      return { ...this.cache.get(cacheKey), from_cache: true };
    }

    // 2. 获取用户兴趣
    const userInterests = await this.getUserInterests(userId);

    // 3. 构建 Prompt
    const prompt = this.buildPrompt(word, count, difficulty, userInterests);

    // 4. 调用 Bailian API
    const startTime = Date.now();
    const response = await this.bailian.generate(prompt);
    const generationTime = Date.now() - startTime;

    // 5. 解析结果
    const examples = this.parseResponse(response);

    // 6. 保存到数据库
    const savedExamples = await this.saveExamples(word, examples, userInterests);

    // 7. 记录日志
    await this.logGeneration(userId, word, prompt, response, generationTime);

    // 8. 缓存结果
    const result = {
      word,
      examples: savedExamples,
      ai_explanation: response.explanation,
      from_cache: false
    };
    this.cache.set(cacheKey, result);

    return result;
  }

  getUserInterests(userId) {
    // 从数据库获取用户兴趣
    // 如果用户没有设置，返回默认兴趣
  }

  buildPrompt(word, count, difficulty, userInterests) {
    // 构建 Prompt
  }

  parseResponse(response) {
    // 解析 Bailian 返回的 JSON
  }

  async saveExamples(word, examples, userInterests) {
    // 保存到 word_examples 表
  }

  async logGeneration(userId, word, prompt, response, timeMs) {
    // 记录到 ai_generation_logs 表
  }

  async submitFeedback(exampleId, feedback, reason) {
    // 更新例句反馈统计
    // 用于优化后续生成
  }
}

module.exports = AIContextService;
```

### 3. Bailian 客户端封装
```javascript
// backend/services/bailian-client.js

const https = require('https');

class BailianClient {
  constructor() {
    this.apiKey = process.env.BAILIAN_API_KEY;
    this.endpoint = 'https://dashscope.aliyuncs.com/api/v1';
    this.model = 'qwen-max'; // 或 qwen-plus
  }

  async generate(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      retryCount = 3
    } = options;

    for (let i = 0; i < retryCount; i++) {
      try {
        const response = await this.callAPI(prompt, temperature, maxTokens);
        return JSON.parse(response.content);
      } catch (error) {
        if (i === retryCount - 1) throw error;
        await this.sleep(1000 * (i + 1)); // 指数退避
      }
    }
  }

  callAPI(prompt, temperature, maxTokens) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: this.model,
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: { temperature, max_tokens: maxTokens }
      });

      const req = https.request({
        hostname: 'dashscope.aliyuncs.com',
        path: '/api/v1/services/aigc/text-generation/generation',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': data.length
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const result = JSON.parse(body);
          resolve(result.output.choices[0].message);
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BailianClient;
```

---

## 🎨 前端设计

### 1. 兴趣选择页
```javascript
// frontend/pages/ai-interests/ai-interests.js

Page({
  data: {
    interests: [
      { id: 'tech', name: '科技', selected: false, icon: '💻' },
      { id: 'business', name: '商业', selected: false, icon: '💼' },
      { id: 'entertainment', name: '娱乐', selected: false, icon: '🎬' },
      { id: 'sports', name: '体育', selected: false, icon: '⚽' },
      { id: 'travel', name: '旅行', selected: false, icon: '✈️' },
      { id: 'food', name: '美食', selected: false, icon: '🍳' },
      { id: 'science', name: '科学', selected: false, icon: '🔬' },
      { id: 'art', name: '艺术', selected: false, icon: '🎨' }
    ],
    preferredTopics: [], // 22 个场景分类
    aiEnabled: true
  },

  async onSave() {
    const selectedInterests = this.data.interests
      .filter(i => i.selected)
      .map(i => i.name);

    await wx.request({
      url: 'https://caiyuyang.cn:3001/api/ai/user-interests',
      method: 'PUT',
      data: {
        interests: selectedInterests,
        preferred_topics: this.data.preferredTopics,
        ai_context_enabled: this.data.aiEnabled
      }
    });

    wx.showToast({ title: '保存成功', icon: 'success' });
    wx.navigateBack();
  }
});
```

### 2. 学习页面例句展示
```javascript
// frontend/pages/learning/learning.js

// 在现有 loadWord() 方法中增加 AI 例句加载
async loadWord() {
  // ... 现有代码加载单词 ...

  // 新增：加载 AI 例句
  if (this.data.aiContextEnabled) {
    this.loadAIExamples(this.data.currentWord.word);
  }
},

async loadAIExamples(word) {
  wx.showLoading({ title: 'AI 生成中...' });

  try {
    const res = await wx.request({
      url: 'https://caiyuyang.cn:3001/api/ai/generate-example',
      method: 'POST',
      data: {
        word: word,
        count: 3,
        difficulty: this.data.userLevel
      }
    });

    this.setData({
      aiExamples: res.data.data.examples,
      aiExplanation: res.data.data.ai_explanation,
      fromCache: res.data.data.from_cache
    });
  } catch (error) {
    console.error('AI 例句加载失败', error);
    // 降级：使用传统例句
  } finally {
    wx.hideLoading();
  }
},

// 例句反馈
onExampleFeedback(e) {
  const { exampleId, feedback } = e.currentTarget.dataset;
  
  wx.request({
    url: 'https://caiyuyang.cn:3001/api/ai/example-feedback',
    method: 'POST',
    data: { example_id: exampleId, feedback }
  });

  wx.showToast({ 
    title: feedback === 'like' ? '感谢喜欢！' : '我们会改进',
    icon: 'none'
  });
}
```

### 3. WXML 模板
```xml
<!-- frontend/pages/learning/learning.wxml -->

<!-- AI 例句区域 -->
<view class="ai-examples-section" wx:if="{{aiExamples.length > 0}}">
  <view class="section-header">
    <text class="section-title">🤖 AI 定制例句</text>
    <text class="ai-badge" wx:if="{{!fromCache}}">实时生成</text>
    <text class="ai-badge cache" wx:else>缓存</text>
  </view>

  <view class="ai-explanation" wx:if="{{aiExplanation}}">
    <text>{{aiExplanation}}</text>
  </view>

  <view class="example-list">
    <view class="example-item" wx:for="{{aiExamples}}" wx:key="id">
      <view class="example-en">{{item.en}}</view>
      <view class="example-cn">{{item.cn}}</view>
      
      <view class="collocations">
        <text class="collocation" wx:for="{{item.collocations}}" wx:key="*this">
          📌 {{item}}
        </text>
      </view>

      <view class="feedback-actions">
        <button 
          class="feedback-btn like" 
          bindtap="onExampleFeedback" 
          data-example-id="{{item.id}}" 
          data-feedback="like">
          👍
        </button>
        <button 
          class="feedback-btn dislike" 
          bindtap="onExampleFeedback" 
          data-example-id="{{item.id}}" 
          data-feedback="dislike">
          👎
        </button>
        <button 
          class="regenerate-btn" 
          bindtap="regenerateExamples">
          🔄 换一批
        </button>
      </view>
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
│   │   └── ai-context.js          # 新增：AI 语境路由
│   ├── services/
│   │   ├── ai-context-service.js  # 新增：AI 语境服务
│   │   └── bailian-client.js      # 新增：Bailian 客户端
│   └── migrations/
│       ├── 001_add_user_interests.sql
│       ├── 002_add_ai_examples.sql
│       └── 003_create_ai_generation_logs.sql
├── frontend/
│   ├── pages/
│   │   ├── ai-interests/          # 新增：兴趣选择页
│   │   │   ├── ai-interests.js
│   │   │   ├── ai-interests.json
│   │   │   ├── ai-interests.wxml
│   │   │   └── ai-interests.wxss
│   │   └── learning/              # 修改：学习页面
│   │       ├── learning.js        # 增加 AI 例句加载
│   │       └── learning.wxml      # 增加 AI 例句展示
│   └── app.js                     # 增加兴趣页路由
└── docs/
    └── AI 功能开发路线图.md        # 本文档
```

---

## ✅ 开发任务清单

### 后端（预计 3-4 天）
- [ ] **Day 1**: 数据库迁移脚本
  - [ ] 创建 001_add_user_interests.sql
  - [ ] 创建 002_add_ai_examples.sql
  - [ ] 创建 003_create_ai_generation_logs.sql
  - [ ] 运行迁移

- [ ] **Day 2**: Bailian 客户端封装
  - [ ] 实现 bailian-client.js
  - [ ] 测试 API 调用
  - [ ] 添加错误处理和重试

- [ ] **Day 3**: AI 语境服务层
  - [ ] 实现 ai-context-service.js
  - [ ] 实现 Prompt 模板
  - [ ] 实现缓存逻辑

- [ ] **Day 4**: API 路由
  - [ ] 实现 /api/ai/user-interests (GET/PUT)
  - [ ] 实现 /api/ai/generate-example (POST)
  - [ ] 实现 /api/ai/example-feedback (POST)
  - [ ] 集成到 routes/index.js

### 前端（预计 3-4 天）
- [ ] **Day 5**: 兴趣选择页
  - [ ] 创建页面结构
  - [ ] 实现兴趣多选 UI
  - [ ] 实现场景分类选择
  - [ ] 对接保存接口

- [ ] **Day 6**: 学习页面改造
  - [ ] 增加 AI 例句加载逻辑
  - [ ] 增加 AI 例句展示区域
  - [ ] 实现"换一批"功能

- [ ] **Day 7**: 反馈功能
  - [ ] 实现点赞/点踩 UI
  - [ ] 对接反馈接口
  - [ ] 优化加载状态

- [ ] **Day 8**: 测试和优化
  - [ ] 端到端测试
  - [ ] 性能优化（缓存）
  - [ ] UI 细节调整

### 测试和部署（预计 1-2 天）
- [ ] **Day 9**: 测试
  - [ ] 单元测试
  - [ ] 集成测试
  - [ ] 用户测试

- [ ] **Day 10**: 部署
  - [ ] 代码审查
  - [ ] 生产环境部署
  - [ ] 监控和日志

---

## 🔒 安全注意事项

1. **API Key 保护**
   - 不要将 Bailian API Key 提交到 Git
   - 使用环境变量：`process.env.BAILIAN_API_KEY`
   - 在 `.env` 文件中配置（加入 `.gitignore`）

2. **输入验证**
   - 验证用户提交的兴趣标签
   - 限制 Prompt 长度
   - 过滤敏感词

3. **频率限制**
   - 单用户每日 AI 生成次数限制（如 50 次）
   - 防止恶意调用

4. **成本控制**
   - 监控 Bailian API 调用量
   - 设置预算告警

---

## 📊 成功指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| AI 例句点击率 | >70% | 埋点统计 |
| 例句点赞率 | >60% | 反馈统计 |
| 平均停留时长 | +20% | 学习页面时长 |
| Bailian 调用成本 | <¥100/月 | API 账单 |

---

_下一步：开始 Day 1 开发（数据库迁移）_
