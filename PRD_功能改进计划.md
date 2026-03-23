# 雅思智能背单词系统 - 功能改进 PRD

**版本**: v1.0  
**创建时间**: 2026-03-23  
**优先级**: P0（高优先级）  
**涉及功能**: 复习算法优化、学习进度可视化、错题本强化

---

## 📋 目录

1. [复习算法优化](#1-复习算法优化)
2. [学习进度可视化](#2-学习进度可视化)
3. [错题本强化](#3-错题本强化)
4. [技术实现方案](#4-技术实现方案)
5. [排期建议](#5-排期建议)

---

## 1. 复习算法优化

### 1.1 背景与问题

**当前状态**:
- 复习间隔固定（1 天、2 天、4 天、7 天、15 天、21 天、30 天）
- 所有单词使用相同的复习计划
- 没有考虑单词难度和用户掌握程度差异

**存在问题**:
- 简单单词复习过于频繁，浪费时间
- 困难单词复习间隔太长，容易遗忘
- 缺乏科学依据，记忆效率不高

### 1.2 目标

实现基于 **SM-2 算法**（Anki 同款）的智能复习调度，根据用户答题表现动态调整下次复习时间。

### 1.3 功能需求

#### 1.3.1 核心算法

**SM-2 算法公式**:
```
// 难度系数 (E-Factor)
EF = EF₀ + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))

// 下次复习间隔
I(1) = 1 天
I(2) = 6 天
I(n) = I(n-1) × EF  (n > 2)

// 评分标准 (q)
5 = 完美回忆（0 错误）
4 = 基本正确（1-2 个小错误）
3 = 勉强回忆（需要提示）
2 = 错误（看答案后理解）
1 = 完全不会（看答案也不理解）
```

**简化版（适配小程序）**:
```
// 用户答题后选择：认识/不认识
- 认识：interval = interval × 2.5（难度系数默认 2.5）
- 不认识：interval = 1（重置为 1 天）

// 难度系数动态调整
- 连续 3 次"认识"：难度系数 +0.2
- 1 次"不认识"：难度系数 -0.3
- 难度系数范围：[1.3, 3.0]
```

#### 1.3.2 数据库变更

**新增字段** - `user_word_progress` 表：
```sql
ALTER TABLE user_word_progress ADD COLUMN ease_factor REAL DEFAULT 2.5;
ALTER TABLE user_word_progress ADD COLUMN last_interval INTEGER DEFAULT 0;
ALTER TABLE user_word_progress ADD COLUMN consecutive_correct INTEGER DEFAULT 0;
ALTER TABLE user_word_progress ADD COLUMN algorithm_version TEXT DEFAULT 'sm2_v1';
```

**修改字段** - `learning_records` 表：
```sql
ALTER TABLE learning_records ADD COLUMN response_time INTEGER;  -- 答题用时（秒）
ALTER TABLE learning_records ADD COLUMN self_rating INTEGER;    -- 用户自评 (1-5)
```

#### 1.3.3 接口变更

**POST /api/words/progress** - 保存学习进度
```json
// 请求体
{
  "wordId": 123,
  "result": "known",      // "known" | "unknown"
  "responseTime": 5,      // 答题用时（秒）
  "selfRating": 4         // 用户自评 (1-5，可选)
}

// 响应
{
  "success": true,
  "nextReviewAt": "2026-03-25T10:00:00Z",
  "interval": 2,          // 下次复习间隔（天）
  "easeFactor": 2.6,      // 当前难度系数
  "stage": 2              // 当前阶段
}
```

**GET /api/words/review** - 获取复习单词
```javascript
// 查询逻辑变更
SELECT * FROM user_word_progress
WHERE user_id = ?
  AND next_review_at <= NOW()
  AND mastery_score < 75
ORDER BY 
  -- 优先复习即将过期的
  next_review_at ASC,
  -- 其次复习难度高的
  ease_factor DESC
LIMIT 20
```

#### 1.3.4 前端变更

**复习页面交互优化**:

```
┌─────────────────────────────────┐
│  这个单词你认识吗？              │
│                                 │
│  📖 单词 /ˈwɜːd/                │
│  n. 单词；话语；消息             │
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │ ✗ 不认识 │  │ ✓ 认识  │      │
│  └─────────┘  └─────────┘      │
│                                 │
│  💡 提示：                       │
│  - 不认识：明天复习              │
│  - 认识：2 天后复习              │
└─────────────────────────────────┘
```

**新增功能**:
- 答题后显示下次复习时间
- 长按按钮可调整难度（可选）
- 显示当前难度系数（可选）

### 1.4 验收标准

- [ ] 新单词首次学习后，默认 1 天后复习
- [ ] 连续答对 3 次，复习间隔明显延长
- [ ] 答错 1 次，复习间隔重置为 1 天
- [ ] 难度系数在 [1.3, 3.0] 范围内浮动
- [ ] 复习队列按到期时间和难度排序

### 1.5 风险与应对

**风险**: 算法复杂，用户不理解

**应对**:
- 前端显示简化文案（不提具体算法）
- 提供"为什么这样安排复习"的说明页面
- 允许用户手动调整复习计划

---

## 2. 学习进度可视化

### 2.1 背景与问题

**当前状态**:
- 只有简单的数字统计（已掌握、待复习、总词汇）
- 看不到学习趋势和历史表现

**存在问题**:
- 用户不知道自己的进步情况
- 缺乏成就感，容易放弃
- 无法发现学习中的问题

### 2.2 目标

通过图表和数据可视化，让用户清晰看到学习进度、趋势和成就，提升学习动力。

### 2.3 功能需求

#### 2.3.1 学习曲线图表

**页面位置**: 个人中心 / 学习报告

**图表类型**: 折线图

**数据维度**:
```javascript
{
  "dates": ["03-17", "03-18", "03-19", "03-20", "03-21", "03-22", "03-23"],
  "newWords": [20, 25, 18, 30, 22, 28, 25],      // 每日新学单词数
  "reviewWords": [0, 20, 25, 43, 52, 60, 68],    // 每日复习单词数
  "masteredWords": [0, 15, 28, 55, 72, 95, 115]  // 累计掌握单词数
}
```

**UI 设计**:
```
┌─────────────────────────────────┐
│  📈 学习趋势                     │
│                                 │
│  [7 天] [30 天] [全部]           │
│                                 │
│   120 ┤              ●──●       │
│   100 ┤         ●──●            │
│    80 ┤    ●──●                 │
│    60 ┤ ●──●                    │
│    40 ┤                         │
│    20 ┤●                        │
│     0 └────────────────────     │
│       17  18  19  20  21  22  23│
│                                 │
│  ● 累计掌握单词数                │
└─────────────────────────────────┘
```

#### 2.3.2 日历热力图

**页面位置**: 个人中心

**设计参考**: GitHub 贡献图

**数据维度**:
```javascript
{
  "2026-03-17": {"newWords": 20, "reviewWords": 0, "duration": 15},
  "2026-03-18": {"newWords": 25, "reviewWords": 20, "duration": 25},
  "2026-03-19": {"newWords": 18, "reviewWords": 25, "duration": 22},
  // ...
}
```

**UI 设计**:
```
┌─────────────────────────────────┐
│  📅 学习日历                     │
│                                 │
│  周一 周二 周三 周四 周五 周六 周日│
│   ■   ■   ■   ■   ■   ■   ■    │
│   ■   ■   ■   ■   ■   ■   ■    │
│   ■   ■   ■   ■   ■   ■   ■    │
│   ■   ■   ■   ■   ■   ■   ■    │
│   ■   ■   ■   ■   ■   ■   ■    │
│                                 │
│  颜色深浅 = 学习时长             │
│  □ 0 分钟  ■ 15 分钟  ■ 30+ 分钟  │
└─────────────────────────────────┘
```

**颜色方案**:
```css
.level-0 { background: #ebedf0; }  /* 未学习 */
.level-1 { background: #9be9a8; }  /* 1-15 分钟 */
.level-2 { background: #40c463; }  /* 15-30 分钟 */
.level-3 { background: #30a14e; }  /* 30-60 分钟 */
.level-4 { background: #216e39; }  /* 60+ 分钟 */
```

#### 2.3.3 学习统计卡片

**页面位置**: 首页 / 个人中心

**统计维度**:
```javascript
{
  // 基础统计
  "totalLearned": 115,        // 累计学习单词数
  "totalMastered": 95,        // 已掌握单词数
  "totalReview": 320,         // 累计复习次数
  "totalTime": 480,           // 总学习时长（分钟）
  
  // 连续性统计
  "currentStreak": 7,         // 当前连续学习天数
  "longestStreak": 15,        // 最长连续学习天数
  "totalDays": 30,            // 总学习天数
  
  // 效率统计
  "avgDailyNewWords": 22,     // 日均新词
  "avgDailyReview": 45,       // 日均复习
  "masterRate": 82.6,         // 掌握率 (%)
  
  // 时间分析
  "preferredTime": "evening", // 偏好学习时段
  "peakEfficiency": "20:00"   // 最佳效率时段
}
```

**UI 设计**:
```
┌─────────────────────────────────┐
│  📊 学习统计                     │
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │ 🔥 7 天  │  │ 📚 115 词│      │
│  │ 连续学习 │  │ 累计学习 │      │
│  └─────────┘  └─────────┘      │
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │ ⏱️ 480 分│  │ ✅ 82.6% │      │
│  │ 总时长  │  │ 掌握率  │      │
│  └─────────┘  └─────────┘      │
│                                 │
│  最长连续：15 天                 │
│  日均新词：22 个                 │
│  偏好时段：晚上 8 点              │
└─────────────────────────────────┘
```

#### 2.3.4 接口设计

**GET /api/stats/progress** - 获取学习进度数据
```javascript
// 请求
GET /api/stats/progress?range=7&userId=1

// 响应
{
  "dates": ["03-17", "03-18", ...],
  "newWords": [20, 25, ...],
  "reviewWords": [0, 20, ...],
  "masteredWords": [0, 15, ...]
}
```

**GET /api/stats/calendar** - 获取日历数据
```javascript
// 请求
GET /api/stats/calendar?month=2026-03

// 响应
{
  "2026-03-17": {"level": 2, "duration": 15, "newWords": 20},
  "2026-03-18": {"level": 3, "duration": 25, "newWords": 25},
  // ...
}
```

**GET /api/stats/summary** - 获取统计摘要
```javascript
// 请求
GET /api/stats/summary

// 响应
{
  "totalLearned": 115,
  "totalMastered": 95,
  "currentStreak": 7,
  "longestStreak": 15,
  // ...
}
```

### 2.4 验收标准

- [ ] 学习曲线图表正确显示 7 天/30 天/全部数据
- [ ] 日历热力图颜色深浅反映学习时长
- [ ] 统计卡片数据准确，实时更新
- [ ] 图表加载时间 < 1 秒
- [ ] 支持横屏查看图表（可选）

### 2.5 技术选型

**图表库**: 
- 方案 1: ECharts for Weixin（功能强大，体积较大）
- 方案 2: F2（蚂蚁金服，轻量级）
- 方案 3: 自研简单图表（体积最小）

**推荐**: 方案 2（F2），平衡功能和体积

---

## 3. 错题本强化

### 3.1 背景与问题

**当前状态**:
- 只有基础的错题记录功能
- 没有分类整理和针对性复习

**存在问题**:
- 错题分散，难以集中突破
- 没有错题分析，不知道薄弱环节
- 缺少导出功能，无法 offline 学习

### 3.2 目标

打造完整的错题管理系统，支持分类、标注、导出和针对性复习。

### 3.3 功能需求

#### 3.3.1 错题自动收集

**触发条件**:
- 复习时选择"不认识"
- 连续 2 次答错同一单词
- 答题时间 > 10 秒（犹豫过长）

**数据结构**:
```javascript
{
  "id": 1,
  "userId": 1,
  "wordId": 123,
  "word": "defy",
  "phonetic": "/dɪˈfaɪ/",
  "translation": "v. 反抗；蔑视",
  
  // 错题信息
  "errorCount": 3,           // 错误次数
  "firstErrorAt": "2026-03-15T10:00:00Z",
  "lastErrorAt": "2026-03-23T14:30:00Z",
  
  // 分类标签
  "errorType": ["meaning", "spelling"],  // 错误类型
  "tags": ["高频", "难词"],               // 用户标签
  
  // 掌握状态
  "status": "pending",       // pending/reviewed/mastered
  "masteredAt": null
}
```

#### 3.3.2 错题分类管理

**分类维度**:

1. **按错误类型**:
   - 释义不清
   - 拼写错误
   - 发音不准
   - 用法混淆

2. **按词库来源**:
   - 剑桥雅思 1-18
   - 雅思词汇真经

3. **按掌握程度**:
   - 待复习
   - 复习中
   - 已掌握

4. **自定义标签**:
   - 用户手动添加标签
   - 支持多标签

**UI 设计**:
```
┌─────────────────────────────────┐
│  ❌ 错题本 (56)                  │
│                                 │
│  [全部] [待复习] [复习中] [已掌握]│
│                                 │
│  筛选：                          │
│  [释义不清] [拼写错误] [发音不准] │
│                                 │
│  标签：                          │
│  [#高频] [#难词] [#同义词混淆]    │
│                                 │
│  ┌─────────────────────────┐   │
│  │ defy /dɪˈfaɪ/          │   │
│  │ v. 反抗；蔑视            │   │
│  │ ❌ 错误 3 次  ⏰ 待复习    │   │
│  │ [#高频] [#难词]          │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ...                     │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

#### 3.3.3 错题复习模式

**复习逻辑**:
```javascript
// 错题优先复习
SELECT * FROM mistake_books
WHERE user_id = ?
  AND status = 'pending'
ORDER BY 
  error_count DESC,        -- 错误次数多的优先
  last_error_at ASC        -- 早犯错的优先
LIMIT 20
```

**复习流程**:
```
1. 显示单词 → 用户思考
2. 显示释义 → 用户判断认识/不认识
3. 选择"认识" → 进入下一题
4. 选择"不认识" → 错误次数 +1，明天再复习
5. 连续 3 次"认识" → 标记为"已掌握"
```

**UI 设计**:
```
┌─────────────────────────────────┐
│  ❌ 错题复习 (15/56)             │
│                                 │
│  ┌─────────────────────────┐   │
│  │      defy               │   │
│  │    /dɪˈfaɪ/            │   │
│  │                         │   │
│  │  已错 3 次                │   │
│  │  上次：3 天前             │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │ ✗ 不认识 │  │ ✓ 认识  │      │
│  └─────────┘  └─────────┘      │
│                                 │
│  💡 提示：连续 3 次认识可移出错题本 │
└─────────────────────────────────┘
```

#### 3.3.4 错题导出功能

**导出格式**:

1. **PDF 格式**（打印友好）
```
雅思词汇 - 错题本
导出时间：2026-03-23
共 56 个单词

1. defy /dɪˈfaɪ/
   v. 反抗；蔑视
   例句：He defied his parents and dropped out of school.
   错误次数：3 次

2. ...
```

2. **Excel 格式**（可编辑）
```csv
单词，音标，词性，释义，错误次数，首次错误，最近错误
defy,/dɪˈfaɪ/,v.,"反抗；蔑视",3,2026-03-15,2026-03-23
```

3. **Anki 卡片格式**（导入 Anki）
```txt
defy /dɪˈfaɪ/;;v. 反抗；蔑视;;He defied his parents...
```

**导出接口**:
```javascript
// POST /api/mistakes/export
{
  "format": "pdf",  // "pdf" | "excel" | "anki"
  "filters": {
    "status": "pending",
    "tags": ["高频", "难词"],
    "errorCount": ">=3"
  }
}

// 响应
{
  "success": true,
  "downloadUrl": "https://caiyuyang.cn:3001/api/downloads/mistakes_20260323.pdf",
  "expireAt": "2026-03-24T00:00:00Z"
}
```

#### 3.3.5 错题统计分析

**统计维度**:
```javascript
{
  "total": 56,              // 总错题数
  "pending": 32,            // 待复习
  "reviewing": 18,          // 复习中
  "mastered": 6,            // 已掌握
  
  // 错误类型分布
  "errorTypes": {
    "meaning": 25,          // 释义不清
    "spelling": 15,         // 拼写错误
    "pronunciation": 10,    // 发音不准
    "usage": 6              // 用法混淆
  },
  
  // 高频错题 TOP10
  "topErrors": [
    {"word": "defy", "count": 5},
    {"word": "ambiguous", "count": 4},
    // ...
  ],
  
  // 错题趋势
  "trend": {
    "newThisWeek": 8,       // 本周新增
    "masteredThisWeek": 5   // 本周掌握
  }
}
```

**UI 设计**:
```
┌─────────────────────────────────┐
│  📊 错题分析                     │
│                                 │
│  总错题：56  待复习：32  已掌握：6  │
│                                 │
│  错误类型：                      │
│  ┌────────────────────────┐    │
│  │ 释义不清 ████████ 25   │    │
│  │ 拼写错误 █████ 15      │    │
│  │ 发音不准 ███ 10        │    │
│  │ 用法混淆 ██ 6           │    │
│  └────────────────────────┘    │
│                                 │
│  高频错题 TOP5:                  │
│  1. defy - 错 5 次               │
│  2. ambiguous - 错 4 次          │
│  3. ...                         │
│                                 │
│  本周：+8 新错题  -5 已掌握       │
└─────────────────────────────────┘
```

#### 3.3.6 接口设计

**GET /api/mistakes** - 获取错题列表
```javascript
// 请求
GET /api/mistakes?status=pending&tag=高频&limit=20

// 响应
{
  "mistakes": [...],
  "total": 56,
  "hasMore": true
}
```

**POST /api/mistakes/tag** - 添加标签
```javascript
// 请求
POST /api/mistakes/tag
{
  "wordId": 123,
  "tags": ["高频", "难词"]
}

// 响应
{
  "success": true
}
```

**POST /api/mistakes/export** - 导出错题
```javascript
// 请求
POST /api/mistakes/export
{
  "format": "pdf",
  "filters": {...}
}

// 响应
{
  "success": true,
  "downloadUrl": "..."
}
```

**GET /api/mistakes/stats** - 获取错题统计
```javascript
// 请求
GET /api/mistakes/stats

// 响应
{
  "total": 56,
  "pending": 32,
  "errorTypes": {...},
  "topErrors": [...]
}
```

### 3.4 验收标准

- [ ] 答错自动加入错题本
- [ ] 支持按错误类型、标签筛选
- [ ] 错题复习模式正常工作
- [ ] 支持导出 PDF/Excel/Anki 格式
- [ ] 错题统计分析准确

### 3.5 风险与应对

**风险**: 导出功能复杂，开发周期长

**应对**:
- 第一期先实现 Excel 导出（最简单）
- PDF 导出使用第三方库（如 pdfmake）
- Anki 导出可以延后到第二期

---

## 4. 技术实现方案

### 4.1 数据库变更汇总

```sql
-- 1. 复习算法优化
ALTER TABLE user_word_progress ADD COLUMN ease_factor REAL DEFAULT 2.5;
ALTER TABLE user_word_progress ADD COLUMN last_interval INTEGER DEFAULT 0;
ALTER TABLE user_word_progress ADD COLUMN consecutive_correct INTEGER DEFAULT 0;
ALTER TABLE user_word_progress ADD COLUMN algorithm_version TEXT DEFAULT 'sm2_v1';

ALTER TABLE learning_records ADD COLUMN response_time INTEGER;
ALTER TABLE learning_records ADD COLUMN self_rating INTEGER;

-- 2. 错题本强化
CREATE TABLE IF NOT EXISTS mistake_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  word_id INTEGER NOT NULL,
  word TEXT NOT NULL,
  phonetic TEXT,
  translation TEXT,
  error_count INTEGER DEFAULT 1,
  first_error_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_error_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  error_type TEXT,  -- JSON array
  tags TEXT,        -- JSON array
  status TEXT DEFAULT 'pending',
  mastered_at DATETIME,
  UNIQUE(user_id, word_id)
);

CREATE INDEX idx_mistakes_user_status ON mistake_books(user_id, status);
CREATE INDEX idx_mistakes_last_error ON mistake_books(user_id, last_error_at);
```

### 4.2 接口开发清单

**复习算法优化**:
- [ ] POST /api/words/progress (修改)
- [ ] GET /api/words/review (修改)

**学习进度可视化**:
- [ ] GET /api/stats/progress (新增)
- [ ] GET /api/stats/calendar (新增)
- [ ] GET /api/stats/summary (新增)

**错题本强化**:
- [ ] GET /api/mistakes (新增)
- [ ] POST /api/mistakes/tag (新增)
- [ ] POST /api/mistakes/export (新增)
- [ ] GET /api/mistakes/stats (新增)
- [ ] POST /api/mistakes/review (新增)

### 4.3 前端页面清单

**复习算法优化**:
- [ ] 复习页面交互优化
- [ ] 算法说明页面

**学习进度可视化**:
- [ ] 学习报告页面（新页面）
- [ ] 个人中心统计卡片

**错题本强化**:
- [ ] 错题本页面（新页面）
- [ ] 错题复习页面（新页面）
- [ ] 错题统计页面

### 4.4 第三方依赖

```json
{
  "dependencies": {
    "@f2js/f2": "^4.0.0",        // 图表库
    "pdfmake": "^0.2.0",         // PDF 生成
    "exceljs": "^4.3.0"          // Excel 生成
  }
}
```

---

## 5. 排期建议

### 5.1 第一阶段（2 周）- 复习算法优化

**Week 1**:
- [ ] 数据库变更
- [ ] SM-2 算法实现
- [ ] 后端接口修改

**Week 2**:
- [ ] 前端交互优化
- [ ] 测试与调优
- [ ] 灰度发布

**预期成果**: 复习效率提升 30%

### 5.2 第二阶段（2 周）- 学习进度可视化

**Week 3**:
- [ ] 图表库集成
- [ ] 数据统计接口
- [ ] 学习曲线图表

**Week 4**:
- [ ] 日历热力图
- [ ] 统计卡片
- [ ] 学习报告页面

**预期成果**: 用户留存率提升 20%

### 5.3 第三阶段（2 周）- 错题本强化

**Week 5**:
- [ ] 错题表设计
- [ ] 自动收集逻辑
- [ ] 错题列表页面

**Week 6**:
- [ ] 错题复习模式
- [ ] 导出功能（Excel 优先）
- [ ] 统计分析

**预期成果**: 薄弱环节掌握率提升 40%

### 5.4 总体时间线

```
2026-03-24 ~ 2026-04-06  复习算法优化
2026-04-07 ~ 2026-04-20  学习进度可视化
2026-04-21 ~ 2026-05-04  错题本强化
2026-05-05 ~ 2026-05-11  集成测试与优化
```

**总周期**: 6-7 周  
**预计完成**: 2026-05-11

---

## 📝 附录

### A. 参考资料

- [SM-2 算法原版论文](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [Anki 算法实现](https://github.com/ankidroid/Anki-Android/wiki/Flashcard-Algorithm)
- [FSRS 算法](https://github.com/open-spaced-repetition/fsrs4anki)
- [F2 图表库文档](https://f2.antv.antgroup.com/)

### B. 竞品分析

**百词斩**:
- ✅ 图片记忆
- ❌ 复习算法不透明

**墨墨背单词**:
- ✅ 艾宾浩斯曲线
- ✅ 记忆持久度分析
- ❌ 收费模式

**不背单词**:
- ✅ 真实语境例句
- ✅ 词根词缀
- ❌ 无错题本

**我们的优势**:
- ✅ 科学复习算法（SM-2）
- ✅ 完整错题管理
- ✅ 免费开源
- ✅ 剑桥 + 真经双词库

---

**PRD 版本**: v1.0  
**最后更新**: 2026-03-23  
**负责人**: 小微 🐍  
**状态**: 待评审
