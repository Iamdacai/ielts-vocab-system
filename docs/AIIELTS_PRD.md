# AIielts - 雅思备考智能助手升级计划

## 🎯 项目定位升级

**从**: 雅思智能背单词系统  
**到**: 雅思备考智能助手 (AIielts)

**核心目标**: 为雅思考生提供一站式、个性化、AI 驱动的备考解决方案

---

## 📋 功能架构规划

### 一、现有功能保留与优化 ✅

| 模块 | 状态 | 说明 |
|------|------|------|
| 单词学习 | ✅ 保留 | 核心功能，继续优化 |
| 错题本 | ✅ 保留 | 智能推荐复习 |
| 学习统计 | ✅ 保留 | 数据可视化 |
| 成就系统 | ✅ 保留 | 激励用户 |
| 口语陪练 | ✅ 保留 | AI 评分 + 反馈 |
| 智能提醒 | ✅ 保留 | 学习打卡提醒 |

---

### 二、新增核心功能 🆕

#### 1️⃣ **阅读练习模块**

**功能设计**:
- 📖 **题型覆盖**: 判断题、填空题、选择题、匹配题、段落信息题
- 🎯 **难度分级**: 根据用户水平智能推荐文章难度
- ⏱️ **计时训练**: 模拟真实考试节奏 (60 分钟 3 篇文章)
- 📊 **精读分析**: AI 解析长难句、关键词、逻辑结构
- 📈 **能力诊断**: 识别薄弱题型，针对性训练

**AI 能力应用**:
- AI 生成阅读题目 (基于真题风格)
- AI 解析答案和解题思路
- AI 评估用户阅读速度和理解能力
- 智能推荐文章难度和题型

**技术实现**:
```
后端路由:
- GET  /api/reading/articles - 获取文章列表
- GET  /api/reading/articles/:id - 获取文章详情 + 题目
- POST /api/reading/articles/:id/submit - 提交答案
- GET  /api/reading/analysis/:id - AI 解析
- POST /api/reading/practice - 智能推荐练习

数据库表:
- reading_articles (文章库)
- reading_questions (题目)
- reading_user_answers (用户答案)
- reading_skill_analysis (能力诊断)
```

---

#### 2️⃣ **听力练习模块**

**功能设计**:
- 🎧 **题型覆盖**: 选择题、填空题、地图题、匹配题
- 📻 **音频资源**: 真题音频 + AI 生成模拟音频
- 🎯 **场景分类**: 学术场景、生活场景、讲座、对话
- ⏱️ **模拟测试**: 完整听力考试 (30 分钟)
- 📝 **听写训练**: 精听听写，提升细节捕捉能力
- 📊 **错题分析**: AI 分析错误原因 (词汇？语速？口音？)

**AI 能力应用**:
- AI 生成听力题目和音频 (TTS)
- AI 评估听力理解能力
- 智能识别薄弱场景和题型
- 语音转文字辅助学习

**技术实现**:
```
后端路由:
- GET  /api/listening/tests - 获取听力测试列表
- GET  /api/listening/tests/:id - 获取测试详情 + 音频
- POST /api/listening/tests/:id/submit - 提交答案
- GET  /api/listening/analysis/:id - AI 解析
- POST /api/listening/dictation - 听写训练
- GET  /api/listening/recommend - 智能推荐

数据库表:
- listening_tests (测试库)
- listening_audio (音频文件)
- listening_questions (题目)
- listening_user_answers (用户答案)
- listening_skill_analysis (能力诊断)
```

---

#### 3️⃣ **个性化学习计划系统** 🎯

**功能设计**:
- 📅 **目标设定**: 考试日期 + 目标分数 + 当前水平
- 📊 **智能规划**: AI 生成每日/每周学习任务
- 🔄 **动态调整**: 根据学习进度自动调整计划
- 📈 **进度追踪**: 可视化学习进度
- ⚠️ **风险预警**: 进度落后时提醒并调整

**AI 能力应用**:
- AI 分析用户当前水平 (通过诊断测试)
- AI 生成个性化学习路径
- AI 预测达成目标分数的可能性
- AI 推荐每日学习内容和时长

**学习计划算法**:
```
输入:
- 考试日期: 2026-06-15
- 目标分数: 7.0
- 当前水平: 5.5 (通过诊断测试)
- 每日可用时间: 2 小时
- 薄弱项: 阅读、听力

输出:
- 阶段 1 (第 1-4 周): 基础强化 (词汇 + 语法 + 听力精听)
- 阶段 2 (第 5-8 周): 题型突破 (阅读技巧 + 听力场景)
- 阶段 3 (第 9-12 周): 模拟冲刺 (全套模考 + 错题复盘)

每日任务示例:
- 背单词: 50 个 (根据遗忘曲线)
- 阅读练习: 1 篇文章 + 精读分析
- 听力练习: 1 个场景 + 听写训练
- 口语练习: 1 个话题 (AI 陪练)
- 写作练习: 每周 2 篇 (Task1 + Task2)
```

**技术实现**:
```
后端路由:
- POST /api/study-plan/create - 创建学习计划
- GET  /api/study-plan/:userId - 获取用户计划
- GET  /api/study-plan/:userId/today - 今日任务
- PUT  /api/study-plan/:userId/adjust - 调整计划
- GET  /api/study-plan/:userId/progress - 进度追踪
- POST /api/study-plan/:userId/complete - 完成任务

数据库表:
- study_plans (学习计划)
- study_plan_tasks (每日任务)
- study_plan_progress (进度记录)
- user_goals (用户目标)
- diagnostic_tests (诊断测试)
```

---

#### 4️⃣ **写作智能批改** ✍️

**功能设计**:
- 📝 **Task 1**: 图表描述自动批改
- 📝 **Task 2**: 议论文自动批改
- 📊 **评分维度**: 任务回应、连贯衔接、词汇丰富、语法准确
- 💡 **改进建议**: AI 提供具体修改建议
- 📈 **进步追踪**: 对比历史作文，展示进步曲线

**AI 能力应用**:
- AI 评分 (模拟雅思考官标准)
- AI 批改 (语法、词汇、逻辑)
- AI 生成范文对比
- AI 推荐提升方向

**技术实现**:
```
后端路由:
- POST /api/writing/submit - 提交作文
- GET  /api/writing/feedback/:id - 获取 AI 批改
- GET  /api/writing/history - 历史作文
- GET  /api/writing/progress - 进步曲线

数据库表:
- writing_tasks (写作任务)
- writing_submissions (用户作文)
- writing_feedback (AI 批改)
```

---

### 三、AI 能力整合 🤖

#### 1. **AI 诊断测试**
- 入学水平测试 (听说读写全维度)
- 定期能力评估
- 薄弱项精准识别

#### 2. **AI 智能推荐**
- 每日学习内容推荐
- 薄弱项针对性训练
- 难度自适应调整

#### 3. **AI 学习伴侣**
- 24/7 答疑
- 学习问题解答
- 备考策略建议

#### 4. **AI 内容生成**
- 阅读文章生成
- 听力题目生成
- 写作题目生成
- 口语话题生成

---

## 🗂️ 数据库设计升级

### 新增数据表

```sql
-- 阅读模块
CREATE TABLE reading_articles (
    id INTEGER PRIMARY KEY,
    title TEXT,
    category TEXT,  -- 学术/生活
    difficulty INTEGER,  -- 1-9
    content TEXT,
    word_count INTEGER,
    created_at DATETIME
);

CREATE TABLE reading_questions (
    id INTEGER PRIMARY KEY,
    article_id INTEGER,
    question_type TEXT,  -- 判断/填空/选择/匹配
    question_text TEXT,
    options TEXT,  -- JSON 数组
    correct_answer TEXT,
    ai_explanation TEXT
);

-- 听力模块
CREATE TABLE listening_tests (
    id INTEGER PRIMARY KEY,
    title TEXT,
    category TEXT,  -- 学术/生活
    difficulty INTEGER,
    audio_url TEXT,
    duration INTEGER,  -- 秒
    transcript TEXT
);

-- 学习计划模块
CREATE TABLE study_plans (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    exam_date DATE,
    target_score REAL,
    current_score REAL,
    daily_study_hours REAL,
    plan_json TEXT,  -- AI 生成的计划
    status TEXT,  -- active/completed/paused
    created_at DATETIME
);

CREATE TABLE study_plan_tasks (
    id INTEGER PRIMARY KEY,
    plan_id INTEGER,
    task_date DATE,
    task_type TEXT,  -- 单词/阅读/听力/口语/写作
    task_content TEXT,
    status TEXT,  -- pending/completed/skipped
    completed_at DATETIME
);
```

---

## 📁 项目结构升级

```
ielts-vocab-system/
├── backend/
│   ├── routes/
│   │   ├── words.js          # 单词模块 (保留)
│   │   ├── reading.js        # 🆕 阅读模块
│   │   ├── listening.js      # 🆕 听力模块
│   │   ├── writing.js        # 🆕 写作模块
│   │   ├── speaking.js       # 口语模块 (升级)
│   │   ├── study-plan.js     # 🆕 学习计划模块
│   │   ├── ai-service.js     # 🆕 AI 服务集成
│   │   └── stats.js          # 统计模块 (升级)
│   ├── services/
│   │   ├── ai-generator.js   # 🆕 AI 内容生成
│   │   ├── plan-engine.js    # 🆕 学习计划引擎
│   │   └── recommendation.js # 🆕 智能推荐
│   └── models/
│       ├── Reading.js
│       ├── Listening.js
│       ├── StudyPlan.js
│       └── ...
├── frontend/
│   ├── pages/
│   │   ├── learning/         # 学习页面 (升级)
│   │   ├── reading/          # 🆕 阅读练习
│   │   ├── listening/        # 🆕 听力练习
│   │   ├── writing/          # 🆕 写作练习
│   │   ├── plan/             # 🆕 学习计划
│   │   └── dashboard/        # 仪表盘 (升级)
│   └── ...
└── docs/
    ├── API.md                # API 文档 (升级)
    └── AIIELTS_PRD.md        # 🆕 本产品文档
```

---

## 🚀 开发计划

### Phase 1: 核心架构 (第 1-2 周)
- [ ] 数据库表设计 + 迁移
- [ ] 后端路由框架搭建
- [ ] AI 服务集成 (API 对接)
- [ ] 学习计划引擎开发

### Phase 2: 阅读模块 (第 3-4 周)
- [ ] 阅读文章库建设
- [ ] 题目生成 + 提交接口
- [ ] AI 解析功能
- [ ] 前端阅读练习页面

### Phase 3: 听力模块 (第 5-6 周)
- [ ] 听力测试库建设
- [ ] 音频处理 + 播放
- [ ] 听写训练功能
- [ ] 前端听力练习页面

### Phase 4: 学习计划系统 (第 7-8 周)
- [ ] 诊断测试功能
- [ ] 计划生成算法
- [ ] 进度追踪系统
- [ ] 前端计划管理页面

### Phase 5: 整合优化 (第 9-10 周)
- [ ] 全模块联调
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] 测试 + 上线

---

## 📊 成功指标

| 指标 | 目标值 |
|------|--------|
| 日活跃用户 | 1000+ |
| 平均学习时长 | 60 分钟/天 |
| 学习计划完成率 | 70%+ |
| 用户提分效果 | 平均 +1.0 分 |
| 用户满意度 | 4.5/5.0 |

---

## 📝 版本管理

- **分支**: `AIielts` (当前分支)
- **主分支**: `master` (稳定版本)
- **发布策略**: 功能完成后合并到 master，打版本标签

---

## 🎯 下一步行动

1. ✅ 创建 `AIielts` 分支 (已完成)
2. 📋 确认功能架构和 PRD
3. 🗄️ 设计数据库表结构
4. 🔌 对接 AI 服务 API
5. 💻 开始 Phase 1 开发

---

**文档版本**: v1.0  
**创建时间**: 2026-04-02  
**分支**: AIielts  
**状态**: 规划阶段
