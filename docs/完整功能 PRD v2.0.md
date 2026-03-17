# 雅思智能背单词系统 - 完整功能 PRD v2.0

_文档版本：2.0_  
_最后更新：2026-03-17_  
_开发状态：✅ 已完成_

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [功能模块详解](#3-功能模块详解)
4. [API 接口文档](#4-api 接口文档)
5. [数据库设计](#5-数据库设计)
6. [前端页面](#6-前端页面)
7. [安全与权限](#7-安全与权限)
8. [部署配置](#8-部署配置)
9. [版本历史](#9-版本历史)

---

## 1. 项目概述

### 1.1 项目背景
雅思智能背单词系统是一款基于微信小程序的词汇学习应用，采用科学记忆曲线和 AI 发音评分技术，帮助用户高效掌握雅思核心词汇。

### 1.2 核心特性
| 特性 | 描述 | 状态 |
|------|------|------|
| 微信登录 | 一键微信授权登录 | ✅ |
| 多账号隔离 | 每个账号数据独立 | ✅ |
| 管理员系统 | 用户管理、数据统计 | ✅ |
| 学习进度复位 | 一键清零重新开始 | ✅ |
| 智能记忆曲线 | 艾宾浩斯遗忘曲线 | ✅ |
| 发音练习 | AI 评分 + 跟读 | ✅ |
| 错题本 | 自动收集易错词 | ✅ |
| 成就系统 | 学习成就激励 | ✅ |

### 1.3 技术栈
- **前端**: 微信小程序原生开发
- **后端**: Node.js + Express
- **数据库**: SQLite
- **认证**: JWT
- **部署**: Linux + HTTPS (Let's Encrypt)

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    微信小程序前端                        │
├─────────────────────────────────────────────────────────┤
│  登录页  │  首页  │  学习页  │  复习页  │  个人中心    │
│  配置页  │  错题本 │  成就页  │  管理员后台            │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────┤
│                    API 网关层                             │
├─────────────────────────────────────────────────────────┤
│  JWT 认证中间件  │  管理员权限校验  │  请求日志         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┤
│                    业务逻辑层                            │
├─────────────────────────────────────────────────────────┤
│  认证服务  │  用户服务  │  学习服务  │  发音服务        │
│  统计服务  │  提醒服务  │  成就服务  │  管理员服务      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┤
│                    数据访问层                            │
├─────────────────────────────────────────────────────────┤
│  SQLite 数据库  │  文件存储 (音频/图片)                │
└─────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
ielts-vocab-system/
├── backend/
│   ├── controllers/        # 控制器
│   │   ├── auth-sqlite.js  # 认证控制器
│   │   ├── words.js        # 单词管理
│   │   ├── sessions.js     # 学习会话
│   │   └── ...
│   ├── routes/             # 路由
│   │   ├── index.js        # 路由汇总
│   │   └── ...
│   ├── migrations/         # 数据库迁移
│   │   └── 001-account-system.js
│   ├── scripts/            # 脚本和数据库
│   │   └── ielts_vocab.db
│   ├── admin.js            # 管理员 API
│   ├── users.js            # 用户管理 API
│   ├── auth-wechat.js      # 微信登录服务
│   ├── auth-middleware.js  # JWT 认证中间件
│   ├── simple-server-https.js  # 主服务器
│   └── .env                # 环境配置
├── frontend/
│   ├── pages/              # 页面
│   │   ├── index/          # 首页
│   │   ├── learning/       # 学习页
│   │   ├── review/         # 复习页
│   │   ├── login/          # 登录页 ⭐新增
│   │   ├── profile/        # 个人中心 ⭐新增
│   │   ├── admin/          # 管理员后台 ⭐新增
│   │   └── ...
│   ├── utils/              # 工具模块
│   │   └── auth.js         # 认证工具 ⭐新增
│   └── app.js              # 应用入口
└── docs/                   # 文档
    ├── 完整功能 PRD v2.0.md
    └── ...
```

---

## 3. 功能模块详解

### 3.1 账号管理系统 ⭐

#### 3.1.1 微信登录
**功能描述**: 用户使用微信小程序一键登录

**流程**:
```
用户点击登录 → wx.login() 获取 code → 后端调用微信 API 
→ 换取 openid → 创建/查询用户 → 返回 JWT token → 登录成功
```

**页面**: `pages/login/login.js`

**核心代码**:
```javascript
// 前端调用
const { code } = await wx.login();
const result = await auth.login(code);
// result: { token, user: { id, openid, role, nickname, ... } }
```

---

#### 3.1.2 多账号数据隔离
**隔离机制**: 所有学习相关表都有 `user_id` 字段

**隔离数据**:
- 用户配置 (user_configs)
- 单词学习进度 (user_word_progress)
- 学习记录 (learning_records)
- 复习会话 (review_sessions)
- 发音练习记录 (pronunciation_records)
- 错题本 (mistakes)
- 成就进度 (achievements)

**安全保证**: 所有 API 通过 JWT 解析 user_id，禁止跨用户访问

---

#### 3.1.3 学习进度复位
**功能描述**: 用户可将个人学习进度清零，重新开始

**复位范围**:
| 数据表 | 是否清零 | 说明 |
|--------|----------|------|
| user_word_progress | ✅ | 单词学习状态 |
| learning_records | ✅ | 学习记录 |
| review_sessions | ✅ | 复习会话 |
| pronunciation_records | ✅ | 发音练习记录 |
| user_configs | ❌ | 保留配置 |
| user_profiles | ❌ | 保留个人资料 |

**API**: `POST /api/users/reset-progress`

**前端交互**: 二次确认弹窗，选择复位原因

---

### 3.2 管理员系统 ⭐

#### 3.2.1 角色体系
| 角色 | 标识 | 权限 |
|------|------|------|
| 普通用户 | user | 学习、查看个人数据、复位个人进度 |
| 管理员 | admin | 用户管理、全局统计、数据复位、系统配置 |

#### 3.2.2 管理员功能

**用户管理**:
- 查看用户列表（分页）
- 修改用户角色（普通用户 ↔ 管理员）
- 封禁/解封用户
- 复位指定用户数据

**全局统计**:
- 总用户数、活跃用户数、今日新增
- 总学习记录数、总单词学习数
- 学习排行榜 Top 10

**系统日志**:
- 记录所有管理员操作
- 操作类型、目标、详情、IP、时间

**页面**: `pages/admin/index.js`

---

### 3.3 学习系统（已有功能）

#### 3.3.1 新词学习
- 每日新词推送（可配置数量）
- 单词发音播放（有道 TTS）
- 发音跟读练习（AI 评分）
- 学习结果记录（认识/模糊/陌生）

#### 3.3.2 智能复习
- 基于艾宾浩斯遗忘曲线
- 自动安排复习时间
- 九宫格复习模式
- 发音跟读强化

#### 3.3.3 发音练习
- 录音上传
- AI 评分（准确度、流利度）
- 发音反馈
- 历史记录和统计

#### 3.3.4 错题本
- 自动收集易错词
- 错题专项练习
- 错题移除机制

#### 3.3.5 成就系统
- 学习天数成就
- 单词掌握成就
- 连续学习成就
- 成就展示和激励

#### 3.3.6 智能提醒
- 每日学习提醒
- 复习时间提醒
- 提醒时间配置

---

## 4. API 接口文档

### 4.1 认证接口

#### POST /api/auth/login
微信登录

**请求**:
```json
{
  "code": "微信登录 code"
}
```

**响应**:
```json
{
  "token": "JWT token",
  "user": {
    "id": 1,
    "openid": "xxx",
    "role": "user",
    "nickname": "微信用户",
    "avatar": "",
    "studyDays": 0,
    "totalWords": 0,
    "isFirstLogin": true
  }
}
```

---

### 4.2 用户接口

#### GET /api/users/profile
获取用户个人信息

**响应**:
```json
{
  "user": {
    "id": 1,
    "role": "user",
    "nickname": "xxx",
    "avatar": "xxx",
    "gender": 0,
    "city": "xxx"
  },
  "stats": {
    "studyDays": 10,
    "totalLearned": 500,
    "masteredWords": 200,
    "streakDays": 5
  },
  "config": {
    "weekly_new_words_days": "[1,2,3,4,5,6,7]",
    "daily_new_words_count": 20,
    "review_time": "20:00"
  }
}
```

---

#### POST /api/users/reset-progress
复位学习进度

**请求**:
```json
{
  "confirm": true,
  "reason": "restart|mistake|other"
}
```

**响应**:
```json
{
  "success": true,
  "message": "学习进度已复位",
  "resetCount": {
    "words": 500,
    "records": 1200,
    "sessions": 50
  }
}
```

---

#### GET /api/users/config
获取用户配置

**响应**:
```json
{
  "weekly_new_words_days": "[1,2,3,4,5,6,7]",
  "daily_new_words_count": 20,
  "review_time": "20:00"
}
```

---

#### PUT /api/users/config
更新用户配置

**请求**:
```json
{
  "weeklyNewWordsDays": "[1,3,5]",
  "dailyNewWordsCount": 30,
  "reviewTime": "21:00"
}
```

---

### 4.3 管理员接口

#### GET /api/admin/users
获取用户列表

**参数**: `?page=1&pageSize=20`

**响应**:
```json
{
  "users": [{
    "id": 1,
    "openid": "xxx",
    "nickname": "xxx",
    "avatar": "xxx",
    "role": "user",
    "status": "active",
    "studyDays": 10,
    "totalWords": 500,
    "lastLoginAt": "2026-03-17T10:00:00Z",
    "createdAt": "2026-03-01T10:00:00Z"
  }],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

#### GET /api/admin/stats
获取全局统计

**响应**:
```json
{
  "totalUsers": 100,
  "activeUsers": 50,
  "newUsersToday": 5,
  "totalLearningRecords": 10000,
  "totalWordsLearned": 4464,
  "topUsers": [{
    "nickname": "xxx",
    "studyDays": 30,
    "totalWords": 2000,
    "masteredWords": 1500
  }]
}
```

---

#### POST /api/admin/users/:id/role
修改用户角色

**请求**:
```json
{
  "role": "admin"
}
```

---

#### POST /api/admin/users/:id/ban
封禁用户

**请求**:
```json
{
  "reason": "违规操作"
}
```

---

#### POST /api/admin/users/:id/unban
解封用户

---

#### POST /api/admin/data-reset
管理员数据复位

**请求**:
```json
{
  "userIds": [1, 2, 3],
  "confirm": true,
  "reason": "数据异常"
}
```

---

#### GET /api/admin/logs
获取系统日志

**参数**: `?page=1&pageSize=50`

**响应**:
```json
{
  "logs": [{
    "id": 1,
    "adminId": 1,
    "adminNickname": "管理员",
    "action": "reset_progress",
    "targetType": "user",
    "targetId": 1,
    "details": {"reason": "restart", "resetCount": {...}},
    "ipAddress": "192.168.1.1",
    "createdAt": "2026-03-17T10:00:00Z"
  }],
  "total": 100,
  "page": 1,
  "pageSize": 50
}
```

---

### 4.4 学习接口（已有）

| 接口 | 方法 | 描述 |
|------|------|------|
| /api/sessions | POST | 创建学习会话 |
| /api/sessions/review | GET | 获取复习列表 |
| /api/words/:id | GET | 获取单词详情 |
| /api/words/:id/progress | POST | 更新学习进度 |
| /api/pronunciation/analyze | POST | 发音评分 |
| /api/mistakes | GET | 获取错题列表 |
| /api/achievements | GET | 获取成就列表 |
| /api/stats | GET | 获取学习统计 |

---

## 5. 数据库设计

### 5.1 核心表结构

#### users - 用户表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openid TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',           -- ⭐新增
  status TEXT DEFAULT 'active',       -- ⭐新增
  last_login_at DATETIME,             -- ⭐新增
  banned_reason TEXT,                 -- ⭐新增
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### user_profiles - 用户资料表 ⭐新增
```sql
CREATE TABLE user_profiles (
  user_id INTEGER PRIMARY KEY,
  nickname TEXT,
  avatar_url TEXT,
  gender INTEGER DEFAULT 0,
  city TEXT,
  province TEXT,
  country TEXT,
  language TEXT DEFAULT 'zh_CN',
  first_login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### user_configs - 用户配置表
```sql
CREATE TABLE user_configs (
  user_id INTEGER PRIMARY KEY,
  weekly_new_words_days TEXT DEFAULT '[1,2,3,4,5,6,7]',
  daily_new_words_count INTEGER DEFAULT 20,
  review_time TEXT DEFAULT '20:00',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### ielts_words - 雅思词汇表
```sql
CREATE TABLE ielts_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  phonetic TEXT,
  part_of_speech TEXT,
  definition TEXT NOT NULL,
  example_sentences TEXT,
  frequency_level TEXT CHECK(frequency_level IN ('high', 'medium', 'low')),
  cambridge_book INTEGER CHECK(cambridge_book BETWEEN 1 AND 18),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(word, cambridge_book)
);
```

#### user_word_progress - 单词学习进度表
```sql
CREATE TABLE user_word_progress (
  user_id INTEGER,
  word_id INTEGER,
  status TEXT CHECK(status IN ('new', 'learning', 'mastered', 'forgotten')),
  next_review_at DATETIME,
  review_count INTEGER DEFAULT 0,
  mastery_score REAL DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, word_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES ielts_words(id) ON DELETE CASCADE
);
```

#### learning_records - 学习记录表
```sql
CREATE TABLE learning_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  word_id INTEGER,
  action_type TEXT CHECK(action_type IN ('new_word', 'review', 'test', 'mastered')),
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES ielts_words(id) ON DELETE CASCADE
);
```

#### review_sessions - 复习会话表
```sql
CREATE TABLE review_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scheduled_at DATETIME,
  completed_at DATETIME,
  total_words INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### pronunciation_records - 发音练习记录表
```sql
CREATE TABLE pronunciation_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  word_id INTEGER,
  audio_path TEXT,
  score REAL,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES ielts_words(id) ON DELETE CASCADE
);
```

#### system_logs - 系统日志表 ⭐新增
```sql
CREATE TABLE system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);
```

### 5.2 索引设计
```sql
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_system_logs_admin ON system_logs(admin_id);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_user_word_progress_next_review ON user_word_progress(next_review_at);
CREATE INDEX idx_user_word_progress_status ON user_word_progress(status);
CREATE INDEX idx_ielts_words_frequency ON ielts_words(frequency_level);
CREATE INDEX idx_ielts_words_book ON ielts_words(cambridge_book);
```

---

## 6. 前端页面

### 6.1 页面列表

| 页面 | 路径 | 描述 | 状态 |
|------|------|------|------|
| 登录页 | pages/login/login | 微信登录 ⭐新增 | ✅ |
| 首页 | pages/index/index | 功能入口、统计展示 | ✅ |
| 学习页 | pages/learning/learning | 新词学习 | ✅ |
| 复习页 | pages/review/review | 智能复习 | ✅ |
| 个人中心 | pages/profile/profile | 个人信息、设置 ⭐新增 | ✅ |
| 配置页 | pages/config/config | 学习配置 | ✅ |
| 错题本 | pages/mistakes/index | 错题管理 | ✅ |
| 成就页 | pages/achievements/index | 成就展示 | ✅ |
| 管理员后台 | pages/admin/index | 用户管理 ⭐新增 | ✅ |

### 6.2 登录页 (pages/login)

**功能**:
- 微信一键登录按钮
- 用户协议勾选
- 功能介绍展示

**关键代码**:
```javascript
// 微信登录
const { code } = await wx.login();
const result = await auth.login(code);
```

---

### 6.3 个人中心页 (pages/profile)

**功能**:
- 用户信息展示（头像、昵称、ID）
- 学习统计（天数、累计、掌握、连续）
- 功能菜单（设置、错题本、成就、管理员后台）
- 学习进度复位
- 退出登录

**关键代码**:
```javascript
// 加载用户资料
const profile = await auth.getProfile();

// 复位学习进度
await auth.resetProgress(reason);
```

---

### 6.4 管理员后台 (pages/admin)

**功能**:
- 全局统计面板
- 用户列表（分页、搜索）
- 用户管理（角色、封禁、复位）
- 学习排行榜

**权限控制**:
```javascript
// 检查管理员权限
if (!auth.isAdmin()) {
  wx.navigateBack();
  return;
}
```

---

## 7. 安全与权限

### 7.1 JWT 认证

**Token 生成**:
```javascript
const token = jwt.sign(
  {
    userId: user.id,
    openid: user.openid,
    role: user.role
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

**Token 校验中间件**:
```javascript
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
}
```

### 7.2 权限控制

**管理员中间件**:
```javascript
function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
  });
}
```

### 7.3 数据安全

- 所有用户数据查询强制添加 `user_id` 过滤
- 敏感操作（复位、封禁）需要二次确认
- 管理员操作记录到系统日志
- SQL 注入防护（参数化查询）

---

## 8. 部署配置

### 8.1 环境要求

- Node.js >= 14.x
- SQLite3
- SSL 证书（Let's Encrypt）
- 域名备案（微信小程序要求）

### 8.2 环境配置 (.env)

```bash
# 服务器配置
PORT=3001
NODE_ENV=production

# 微信登录配置
WECHAT_APP_ID=your_appid
WECHAT_APP_SECRET=your_app_secret

# JWT 认证配置
JWT_SECRET=your_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# 管理员配置
ADMIN_OPENID=your_admin_openid

# 有道 TTS 配置
YOUDAO_APP_KEY=your_app_key
YOUDAO_SECRET_KEY=your_secret_key

# SSL 证书配置
SSL_CERT_PATH=/etc/letsencrypt/live/caiyuyang.cn/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/caiyuyang.cn/privkey.pem
```

### 8.3 服务启动

```bash
cd backend
PORT=3001 node simple-server-https.js > https-server.log 2>&1 &
```

### 8.4 小程序配置

**request 合法域名**:
```
https://caiyuyang.cn:3001
```

**配置位置**: 微信公众平台 → 开发管理 → 开发设置 → 服务器域名

---

## 9. 版本历史

### v2.0 (2026-03-17) ⭐当前版本
**新增功能**:
- ✅ 微信登录系统
- ✅ 多账号数据隔离
- ✅ 管理员后台
- ✅ 学习进度复位
- ✅ 个人中心页面
- ✅ 系统日志记录

**数据库变更**:
- users 表添加 role、status、last_login_at、banned_reason 字段
- 新增 user_profiles 表
- 新增 system_logs 表

**API 新增**:
- POST /api/auth/login
- GET /api/users/profile
- POST /api/users/reset-progress
- GET /api/admin/users
- GET /api/admin/stats
- POST /api/admin/data-reset
- GET /api/admin/logs

**前端新增**:
- pages/login/ 登录页
- pages/profile/ 个人中心
- pages/admin/ 管理员后台
- utils/auth.js 认证工具

---

### v1.0.0-baseline (2026-03-17)
**基线版本**: 账号管理系统开发前

**功能**:
- ✅ 单词发音播放（有道 TTS）
- ✅ 发音练习（录音 + 评分）
- ✅ 智能记忆曲线
- ✅ 错题本
- ✅ 成就系统
- ✅ 智能提醒
- ✅ HTTPS 证书

**提交哈希**: `c3cd018`

---

## 附录

### A. 快速开始

1. **安装依赖**:
```bash
cd backend
npm install
```

2. **配置环境**:
```bash
cp .env.example .env
# 编辑 .env 填入配置
```

3. **运行数据库迁移**:
```bash
node migrations/001-account-system.js
```

4. **启动服务**:
```bash
node simple-server-https.js
```

5. **配置小程序**:
- 微信开发者工具 → 详情 → 本地设置
- 勾选"不校验合法域名"（开发环境）
- 或配置正式域名（生产环境）

---

### B. 常见问题

**Q: 如何设置首个管理员？**
A: 首次登录后，从系统日志中获取 openid，配置到 .env 的 ADMIN_OPENID

**Q: 复位后数据能恢复吗？**
A: 不能，复位前会二次确认，请谨慎操作

**Q: 如何查看管理员操作日志？**
A: 调用 GET /api/admin/logs 接口

---

### C. 回滚方案

如需回滚到基线版本：
```bash
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system
git checkout v1.0.0-baseline
```

---

_文档结束_  
_开发完成时间：2026-03-17 23:59_  
_版本标签：v2.0_
