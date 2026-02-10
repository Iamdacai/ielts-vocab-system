# 后端需求规格

## 核心功能模块

### 1. 用户管理
- 用户注册/登录（微信小程序授权）
- 学习配置存储
- 学习进度跟踪

### 2. 词汇数据库
- 剑桥雅思1-18词汇（约8000-10000词）
- 词汇结构：
  - 单词 (word)
  - 音标 (phonetic)
  - 词性 (part_of_speech)
  - 中文释义 (definition)
  - 雅思真题例句 (example_sentences)
  - 词汇频次等级 (frequency_level: high/medium/low)
  - 所属剑桥雅思册数 (cambridge_book: 1-18)

### 3. 智能学习引擎
- 学习计划配置：
  - weekly_new_words_days: [1,2,3,4,5,6,7] (周一到周日)
  - daily_new_words_count: 20 (默认值，可配置)
  - review_time: "20:00" (复习提醒时间，可配置)

- 艾宾浩斯遗忘曲线算法：
  - 复习间隔：5分钟、30分钟、12小时、1天、2天、4天、7天、15天
  - 根据用户掌握程度动态调整间隔

### 4. API 接口
- POST /api/auth/login - 微信登录
- GET /api/config - 获取用户学习配置
- POST /api/config - 更新学习配置
- GET /api/words/new - 获取今日新词
- GET /api/words/review - 获取今日复习词
- POST /api/words/progress - 记录学习进度
- GET /api/stats - 获取学习统计

### 5. 数据存储
- PostgreSQL/MySQL 数据库
- Redis 缓存（可选，用于高频访问）