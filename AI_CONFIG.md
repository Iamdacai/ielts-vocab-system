# AIielts 项目 - AI 配置关键信息

**文档版本**: v1.0  
**创建时间**: 2026-04-02  
**最后更新**: 2026-04-02  
**用途**: 保存项目 AI 配置，供所有模块复用

---

## 🤖 AI 服务商配置

### MiniMax 大模型（已配置 ✅）

**服务商**: MiniMax（国内）  
**使用场景**: AI 定制例句、写作辅助、口语评分、阅读解析、听力诊断  
**状态**: ✅ 已配置并投入使用

#### 环境变量配置

```bash
# .env 文件添加以下配置
MINIMAX_API_KEY=your-minimax-api-key
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M2.5  # 或 M2-her（免费）
```

#### 可用模型

| 模型 | 类型 | 价格 | 推荐场景 |
|------|------|------|----------|
| `M2-her` | 标准 | 免费 | 日常任务、测试 |
| `MiniMax-M2.5` | 高级 | 付费 | 复杂推理、写作批改 |
| `MiniMax-M2.7` | 旗舰 | 付费 | 高精度任务 |

#### API 调用格式

MiniMax 支持两种格式：

**1. 标准格式（OpenAI 兼容）**
```javascript
const client = new MiniMaxClient({
  model: 'M2-her',
  timeout: 60000
});

const result = await client.generate(prompt, {
  temperature: 0.7,
  maxTokens: 2000,
  jsonMode: true,  // 强制 JSON 输出
  retryCount: 3
});
```

**2. Anthropic 兼容格式**
```javascript
// Base URL 设置为：
MINIMAX_BASE_URL=https://api.minimaxi.com/v1/anthropic
```

---

## 📁 现有 AI 服务模块

### 1. minimax-client.js
**位置**: `backend/services/minimax-client.js`  
**功能**: MiniMax API 客户端封装  
**已实现**:
- ✅ 文本生成
- ✅ JSON 模式
- ✅ 自动重试（指数退避）
- ✅ 超时处理
- ✅ 错误处理
- ✅ 两种格式兼容

**复用方式**:
```javascript
const MiniMaxClient = require('./services/minimax-client');
const minimax = new MiniMaxClient({ model: 'MiniMax-M2.5' });
const result = await minimax.generate(prompt, { jsonMode: true });
```

---

### 2. ai-context-service.js
**位置**: `backend/services/ai-context-service.js`  
**功能**: AI 语境生成（个性化例句）  
**已实现**:
- ✅ 用户兴趣配置
- ✅ 个性化例句生成
- ✅ 缓存机制（24 小时）
- ✅ 降级处理（AI 失败时返回模拟数据）
- ✅ 日志记录

**复用方式**:
```javascript
const aiContextService = require('./services/ai-context-service');
const examples = await aiContextService.generateExamples(word, userId, {
  count: 3,
  difficulty: 'medium'
});
```

---

### 3. writing-scorer.js
**位置**: `backend/services/writing-scorer.js`  
**功能**: 写作 AI 评分  
**已实现**:
- ✅ 雅思写作四项评分
- ✅ 详细反馈生成
- ✅ 错误纠正
- ✅ 改进建议
- ✅ 好句提取

**复用方式**:
```javascript
const writingScorer = require('./services/writing-scorer');
const score = await writingScorer.score({
  topic,
  essay,
  essayType: 'task2',
  userLevel: 'intermediate',
  targetScore: 7
});
```

---

### 4. speaking-scorer.js
**位置**: `backend/services/speaking-scorer.js`  
**功能**: 口语 AI 评分  
**已实现**:
- ✅ 口语四项评分
- ✅ 发音评估（集成 Azure）
- ✅ 流利度分析
- ✅ 词汇多样性

---

## 🔧 AIielts 新增模块 AI 集成指南

### 阅读模块 AI 集成

**文件**: `backend/services/ai-service.js`（新建）

**应复用现有 MiniMax 客户端**:
```javascript
// ❌ 不要重新实现 HTTP 调用
// ✅ 应该复用 minimax-client.js

const MiniMaxClient = require('./minimax-client');

class AIService {
  constructor() {
    this.minimax = new MiniMaxClient({
      model: process.env.MINIMAX_MODEL || 'MiniMax-M2.5',
      timeout: 60000
    });
  }

  async generateReadingExplanation(article, question, userAnswer, correctAnswer) {
    const prompt = `...`;
    const result = await this.minimax.generate(prompt, { jsonMode: false });
    return result.content;
  }
}
```

**已实现功能**:
- ✅ 阅读题目解析生成
- ✅ 阅读能力诊断
- ✅ 学习计划生成
- ✅ 写作批改（复用 writing-scorer）

---

### 听力模块 AI 集成

**建议实现**:
```javascript
const MiniMaxClient = require('./minimax-client');

class ListeningAIService {
  constructor() {
    this.minimax = new MiniMaxClient({ model: 'MiniMax-M2.5' });
  }

  // 听力诊断
  async generateListeningDiagnosis(userAnswers) {
    const prompt = `根据以下答题情况生成诊断报告...`;
    return await this.minimax.generate(prompt, { jsonMode: true });
  }

  // 听写评分
  async scoreDictation(userText, correctText) {
    const prompt = `对比用户听写和原文，给出评分和反馈...`;
    return await this.minimax.generate(prompt, { jsonMode: true });
  }
}
```

---

### 学习计划模块 AI 集成

**建议实现**:
```javascript
// 复用 ai-service.js 中的 generateStudyPlan 方法
const aiService = require('./services/ai-service');

const plan = await aiService.generateStudyPlan(userGoal, diagnosticResult);
```

---

## 📊 AI 调用最佳实践

### 1. Prompt 设计原则

```javascript
// ✅ 好的 Prompt 结构
const prompt = `
【角色】你是一名专业的雅思阅读老师

【任务】根据文章内容和题目，为学生答案提供解析

【输入】
- 文章：${articleText.substring(0, 500)}...
- 题目：${questionText}
- 学生答案：${userAnswer}
- 正确答案：${correctAnswer}

【输出要求】
1. 定位依据（文章中的哪句话）
2. 错误原因分析
3. 解题技巧
4. 词汇建议

【格式】返回纯文本，200 字以内
`.trim();
```

### 2. 错误处理

```javascript
try {
  const result = await this.minimax.generate(prompt, { jsonMode: true });
  return result.content;
} catch (error) {
  console.error('[AI] 调用失败:', error.message);
  
  // 降级处理
  return this._getMockResponse();
}
```

### 3. 缓存策略

```javascript
// 使用内存缓存（简单场景）
this.cache = new Map();
this.cacheTimeout = 1000 * 60 * 60 * 24; // 24 小时

// 或使用 Redis（生产环境）
await redis.setex(cacheKey, 86400, JSON.stringify(result));
```

### 4. 日志记录

```javascript
// 记录到 ai_generation_logs 表
await database.run(`
  INSERT INTO ai_generation_logs 
  (user_id, service_type, module, request_content, response_content, tokens_used, cost, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`, [userId, 'explanation', 'reading', prompt, result.content, tokens, cost, 'success']);
```

---

## 🔑 环境变量完整清单

```bash
# .env 文件完整配置

# 服务器配置
PORT=3001
NODE_ENV=production

# MiniMax AI 配置 ⭐
MINIMAX_API_KEY=sk-your-api-key-here
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M2.5

# Azure TTS 配置
TTS_API_KEY=your-azure-key
TTS_REGION=eastasia
TTS_VOICE=en-US-JennyNeural

# Azure 发音评分配置
PRONUNCIATION_API_KEY=your-azure-key
PRONUNCIATION_REGION=eastasia
PRONUNCIATION_LANGUAGE=en-US

# 数据库配置
DB_PATH=./ielts_vocab.db
```

---

## 📝 新增模块开发检查清单

开发新 AI 功能时，请检查：

- [ ] 是否复用了 `minimax-client.js`？
- [ ] 是否添加了环境变量配置？
- [ ] 是否有错误处理和降级方案？
- [ ] 是否有缓存机制（减少 API 调用）？
- [ ] 是否有日志记录（便于调试和统计）？
- [ ] Prompt 是否清晰明确？
- [ ] JSON 输出是否验证了格式？
- [ ] 是否记录了 AI 调用成本？

---

## 🚀 快速开始示例

### 创建新的 AI 服务

```javascript
// backend/services/new-feature-service.js
const MiniMaxClient = require('./minimax-client');

class NewFeatureService {
  constructor() {
    this.minimax = new MiniMaxClient({
      model: process.env.MINIMAX_MODEL || 'MiniMax-M2.5',
      timeout: 60000
    });
  }

  async doSomething(input) {
    const prompt = `请...`;
    const result = await this.minimax.generate(prompt, { jsonMode: true });
    return result;
  }
}

module.exports = new NewFeatureService();
```

### 在路由中使用

```javascript
// backend/routes/new-feature.js
const newFeatureService = require('../services/new-feature-service');

router.post('/do-something', authMiddleware, async (req, res) => {
  try {
    const result = await newFeatureService.doSomething(req.body.input);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[NewFeature] 失败:', error);
    res.status(500).json({ error: '服务失败' });
  }
});
```

---

## 📞 问题排查

### AI 调用失败

1. 检查 `.env` 文件中 `MINIMAX_API_KEY` 是否配置
2. 检查网络连接（`api.minimaxi.com` 是否可访问）
3. 查看日志中的详细错误信息
4. 验证 Prompt 格式是否正确

### JSON 解析失败

1. 检查 `jsonMode: true` 是否设置
2. 查看 AI 返回的原始响应
3. 清理 markdown 标记（```json ... ```）
4. 增加 `retryCount` 重试次数

### 响应超时

1. 增加 `timeout` 参数（默认 60 秒）
2. 减少 `maxTokens`（默认 2000）
3. 简化 Prompt 内容
4. 检查网络延迟

---

## 📚 相关文档

- [MiniMax 官方文档](https://api.minimaxi.com/)
- [backend/services/minimax-client.js](./backend/services/minimax-client.js)
- [backend/services/ai-context-service.js](./backend/services/ai-context-service.js)
- [backend/services/writing-scorer.js](./backend/services/writing-scorer.js)

---

**维护者**: AIielts 开发团队  
**最后审查**: 2026-04-02  
**下次审查**: 每次新增 AI 功能时更新此文档
