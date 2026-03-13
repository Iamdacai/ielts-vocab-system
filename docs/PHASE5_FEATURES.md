# Phase 5 - 核心增强功能设计文档

**创建时间：** 2026-03-12  
**优先级：** ⭐⭐⭐⭐⭐  
**实施周期：** 2-3 周

---

## 📋 功能清单

| 功能 | 优先级 | 预计工时 | 状态 |
|------|--------|----------|------|
| 错题本 2.0 | ⭐⭐⭐⭐⭐ | 3 天 | 🔄 进行中 |
| 记忆保留率可视化 | ⭐⭐⭐⭐⭐ | 4 天 | 🔄 进行中 |
| 词根词缀学习模块 | ⭐⭐⭐⭐ | 5 天 | 🔄 进行中 |

---

## 1️⃣ 错题本 2.0 - 智能错题管理

### 核心功能

**1. 自动收录机制**
- 拼写错误自动收录
- 复习时选择"NO"（不认识）自动收录
- 发音评分低于 60 分自动收录
- 同一单词错误≥3 次标记为"高频错题"

**2. 智能分类**
```javascript
错误类型分类：
- spelling: 拼写错误
- recognition: 识别错误（看到不认识）
- pronunciation: 发音错误
- usage: 用法错误（例句填空错）
- listening: 听力辨音错误
```

**3. 错题复习策略**
- 高频错题优先推送（遗忘曲线×错误频率加权）
- 错题组卷测试（5/10/20 题模式）
- 错题消除机制（连续 3 次正确自动移除）

**4. 错题统计**
- 错题总数/今日新增/本周消除
- 错误类型分布图
- 高频错题 TOP10

### 数据库设计

```sql
-- 错题本表
CREATE TABLE mistake_book (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    word_id INTEGER REFERENCES ielts_words(id) ON DELETE CASCADE,
    error_type VARCHAR(20) CHECK (error_type IN ('spelling', 'recognition', 'pronunciation', 'usage', 'listening')),
    error_count INTEGER DEFAULT 1,
    last_error_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mastery_level INTEGER DEFAULT 1, -- 1-5 级，5 级表示已掌握
    is_high_frequency BOOLEAN DEFAULT FALSE, -- 高频错题标记
    eliminated_at TIMESTAMP, -- 消除时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, word_id)
);

-- 错题练习记录
CREATE TABLE mistake_practice_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mistake_id INTEGER REFERENCES mistake_book(id) ON DELETE CASCADE,
    practice_type VARCHAR(20), -- spelling/recognition/test
    is_correct BOOLEAN,
    response_time INTEGER, -- 响应时间（毫秒）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mistake_book_user ON mistake_book(user_id);
CREATE INDEX idx_mistake_book_priority ON mistake_book(error_count DESC, last_error_at ASC);
CREATE INDEX idx_mistake_book_high_freq ON mistake_book(is_high_frequency) WHERE is_high_frequency = TRUE;
```

### API 设计

```javascript
// 后端 API
POST   /api/mistakes/add          // 添加错题
GET    /api/mistakes/list         // 获取错题列表（支持分页/筛选）
GET    /api/mistakes/stats        // 错题统计
POST   /api/mistakes/practice     // 错题练习
DELETE /api/mistakes/:id          // 移除错题
GET    /api/mistakes/high-freq    // 高频错题 TOP10
POST   /api/mistakes/eliminate    // 标记错题已掌握
```

---

## 2️⃣ 记忆保留率可视化

### 核心算法

**记忆保留率计算公式：**
```javascript
// 基于艾宾浩斯遗忘曲线改进
retentionRate = 100 * Math.exp(-timeElapsed / (decayConstant * masteryLevel))

// 参数说明：
// - timeElapsed: 距离上次学习的时间（小时）
// - decayConstant: 衰减常数（根据用户调整）
// - masteryLevel: 掌握等级（1-5）
```

**记忆强度等级：**
```
Level 1: 0-20%   🔴 急需复习
Level 2: 20-40%  🟠 尽快复习
Level 3: 40-60%  🟡 可以复习
Level 4: 60-80%  🟢 状态良好
Level 5: 80-100% 🔵 牢固掌握
```

### 可视化组件

**1. 九宫格升级**
- 每个扇区显示记忆强度颜色
- 点击扇区查看该阶段单词详情
- 显示当前应复习单词数

**2. 记忆曲线图表**
- 个人记忆保留率趋势（7 天/30 天）
- 预测未来遗忘曲线
- 与理想曲线对比

**3. 单词详情卡片**
- 记忆保留率进度条
- 下次复习倒计时
- 历史复习记录

### 前端组件

```javascript
// utils/memoryRetention.js
/**
 * 计算记忆保留率
 * @param {Date} lastReviewAt - 上次复习时间
 * @param {number} masteryLevel - 掌握等级 1-5
 * @returns {number} 保留率 0-100
 */
function calculateRetentionRate(lastReviewAt, masteryLevel) {
    const hoursElapsed = (Date.now() - new Date(lastReviewAt).getTime()) / (1000 * 60 * 60);
    const decayConstant = 2.5; // 可调参数
    const retention = 100 * Math.exp(-hoursElapsed / (decayConstant * masteryLevel));
    return Math.max(0, Math.min(100, retention));
}

/**
 * 获取记忆强度等级
 * @param {number} retentionRate - 保留率
 * @returns {object} {level, color, label}
 */
function getRetentionLevel(retentionRate) {
    if (retentionRate < 20) return { level: 1, color: '#ef4444', label: '急需复习' };
    if (retentionRate < 40) return { level: 2, color: '#f97316', label: '尽快复习' };
    if (retentionRate < 60) return { level: 3, color: '#eab308', label: '可以复习' };
    if (retentionRate < 80) return { level: 4, color: '#22c55e', label: '状态良好' };
    return { level: 5, color: '#3b82f6', label: '牢固掌握' };
}
```

### 数据库升级

```sql
-- 在 user_word_progress 表中增加字段
ALTER TABLE user_word_progress ADD COLUMN retention_rate DECIMAL(5,2) DEFAULT 100.00;
ALTER TABLE user_word_progress ADD COLUMN memory_strength INTEGER DEFAULT 5 CHECK (memory_strength BETWEEN 1 AND 5);
ALTER TABLE user_word_progress ADD COLUMN last_review_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 创建视图：待复习单词
CREATE VIEW words_due_for_review AS
SELECT uwp.*, iw.word, iw.definition
FROM user_word_progress uwp
JOIN ielts_words iw ON uwp.word_id = iw.id
WHERE uwp.next_review_at <= NOW()
ORDER BY uwp.retention_rate ASC;
```

---

## 3️⃣ 词根词缀学习模块

### 数据结构

```javascript
// 词根词缀数据库
const wordRoots = [
    {
        root: "spect",
        meaning: "看，观察",
        origin: "拉丁语",
        examples: [
            { word: "inspect", meaning: "检查" },
            { word: "respect", meaning: "尊重" },
            { word: "prospect", meaning: "前景" },
            { word: "retrospect", meaning: "回顾" }
        ]
    },
    {
        root: "dict",
        meaning: "说，讲",
        origin: "拉丁语",
        examples: [
            { word: "predict", meaning: "预测" },
            { word: "contradict", meaning: "反驳" },
            { word: "dictionary", meaning: "词典" }
        ]
    }
    // ... 更多词根
];

const prefixes = [
    { prefix: "un-", meaning: "不，非", examples: ["unhappy", "unusual"] },
    { prefix: "re-", meaning: "再次，重新", examples: ["review", "rewrite"] },
    { prefix: "pre-", meaning: "在...之前", examples: ["preview", "predict"] }
];

const suffixes = [
    { suffix: "-tion", meaning: "名词后缀", examples: ["action", "decision"] },
    { suffix: "-able", meaning: "能够...的", examples: ["readable", "comfortable"] }
];
```

### 核心功能

**1. 词根词缀查询**
- 输入单词自动拆解
- 显示词根词缀含义
- 关联同根词列表

**2. 词根专项学习**
- 按词根分组学习
- 词根卡片记忆
- 同根词联想记忆

**3. 构词法测试**
- 词根含义选择题
- 单词拆解填空题
- 同根词匹配题

### 数据库设计

```sql
-- 词根表
CREATE TABLE word_roots (
    id SERIAL PRIMARY KEY,
    root VARCHAR(50) UNIQUE NOT NULL,
    meaning TEXT NOT NULL,
    origin VARCHAR(50), -- 拉丁语/希腊语等
    examples JSONB, -- [{word, meaning}]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 前缀表
CREATE TABLE word_prefixes (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(20) UNIQUE NOT NULL,
    meaning TEXT NOT NULL,
    examples TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 后缀表
CREATE TABLE word_suffixes (
    id SERIAL PRIMARY KEY,
    suffix VARCHAR(20) UNIQUE NOT NULL,
    meaning TEXT NOT NULL,
    examples TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 单词 - 词根关联表
CREATE TABLE word_root_relations (
    word_id INTEGER REFERENCES ielts_words(id) ON DELETE CASCADE,
    root_id INTEGER REFERENCES word_roots(id) ON DELETE CASCADE,
    position VARCHAR(20) CHECK (position IN ('root', 'prefix', 'suffix')),
    PRIMARY KEY (word_id, root_id, position)
);

-- 用户词根学习进度
CREATE TABLE user_root_progress (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    root_id INTEGER REFERENCES word_roots(id) ON DELETE CASCADE,
    mastery_level INTEGER DEFAULT 1 CHECK (mastery_level BETWEEN 1 AND 5),
    learned_at TIMESTAMP,
    PRIMARY KEY (user_id, root_id)
);

CREATE INDEX idx_word_roots_root ON word_roots(root);
CREATE INDEX idx_word_root_relations_word ON word_root_relations(word_id);
```

### API 设计

```javascript
// 后端 API
GET    /api/roots/list              // 获取词根列表
GET    /api/roots/:id               // 获取词根详情
GET    /api/roots/search?q=         // 搜索词根
GET    /api/words/:id/analysis      // 单词词根拆解分析
POST   /api/roots/learn             // 标记词根已学习
GET    /api/roots/quiz              // 获取词根测试题
GET    /api/prefixes/list           // 获取前缀列表
GET    /api/suffixes/list           // 获取后缀列表
```

---

## 📅 实施计划

### 第 1 周：错题本 2.0
- Day 1-2: 数据库设计 + 后端 API
- Day 3-4: 前端组件开发
- Day 5: 测试 + 优化

### 第 2 周：记忆保留率可视化
- Day 1-2: 算法实现 + 数据库升级
- Day 3-4: 九宫格升级 + 图表组件
- Day 5: 测试 + 优化

### 第 3 周：词根词缀模块
- Day 1-2: 词根数据库建设
- Day 3-4: 查询功能 + 学习界面
- Day 5: 测试题系统

---

## 🎯 成功标准

- [ ] 错题本自动收录准确率 > 95%
- [ ] 记忆保留率计算与用户实际感受匹配
- [ ] 词根词缀覆盖雅思高频词 80%+
- [ ] 三个功能用户满意度 > 4.5/5

---

_开始时间：2026-03-12_
_负责人：菜菜 🦞_
