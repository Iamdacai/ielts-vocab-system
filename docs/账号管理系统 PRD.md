# 账号管理系统 PRD（v2.0）

_最后更新：2026-03-17_

---

## 1. 项目概述

### 1.1 背景
当前系统基于微信 openid 单点登录，缺乏多账号管理能力。需要支持：
- 微信账号登录（现有能力扩展）
- 多账号切换与管理
- 账号间数据完全隔离
- **管理员账号进行系统管理** ⭐新增
- **学习状态复位功能** ⭐新增

### 1.2 目标
| 目标 | 描述 | 优先级 |
|------|------|--------|
| 微信一键登录 | 基于小程序原生能力 | P0 |
| 账号数据隔离 | 学习进度、配置、记录独立 | P0 |
| 管理员账号 | 系统管理、用户管理、数据查看 | P0 |
| 学习状态复位 | 清零学习记录，重新开始 | P1 |
| 多账号切换 | 支持退出/切换账号 | P1 |
| 账号信息管理 | 昵称、头像、学习天数等 | P1 |

---

## 2. 功能设计

### 2.1 账号体系架构

```
┌─────────────────────────────────────────────────────────┐
│                    小程序前端                            │
├─────────────────────────────────────────────────────────┤
│  登录页  │  个人中心  │  管理员后台  │  账号切换        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┤
│                    API 层                                │
├─────────────────────────────────────────────────────────┤
│  /auth/wechat-login     - 微信登录                      │
│  /auth/logout           - 退出登录                      │
│  /auth/check            - 登录态校验                    │
│  /users/profile         - 用户信息                      │
│  /users/reset-progress  - 学习进度复位 ⭐              │
│  /admin/users           - 用户管理（管理员）⭐         │
│  /admin/stats           - 全局统计（管理员）⭐         │
│  /admin/data-reset      - 数据复位（管理员）⭐         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┤
│                    数据层                                │
├─────────────────────────────────────────────────────────┤
│  users            - 账号基础信息（含角色字段）          │
│  user_profiles    - 用户详细资料                       │
│  user_configs     - 学习配置（按 user_id 隔离）         │
│  user_word_progress - 学习进度（按 user_id 隔离）       │
│  learning_records - 学习记录（按 user_id 隔离）         │
│  system_logs      - 系统日志（管理员操作）⭐          │
└─────────────────────────────────────────────────────────┘
```

---

### 2.2 核心功能模块

#### 2.2.1 账号角色体系（P0）⭐

**角色定义**：
| 角色 | 标识 | 权限 |
|------|------|------|
| 普通用户 | `user` | 学习、查看个人数据、复位个人进度 |
| 管理员 | `admin` | 用户管理、全局统计、数据复位、系统配置 |

**users 表结构变更**：
```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN banned_reason TEXT;
```

**管理员账号初始化**：
- 首个管理员通过环境变量配置（`ADMIN_OPENID`）
- 后续管理员由现有管理员授权

---

#### 2.2.2 微信登录（P0）

**流程**：
```
用户点击登录 → 小程序 wx.login() → 获取 code 
    → 后端调用微信接口换取 openid + session_key 
    → 创建/查询用户 → 返回 JWT token → 登录成功
```

**API 设计**：
```javascript
POST /api/auth/wechat-login
Request: { code: string }
Response: {
  token: string,
  user: {
    id: number,
    openid: string,
    role: 'user' | 'admin',
    nickname: string,
    avatar: string,
    studyDays: number,
    totalWords: number
  }
}
```

---

#### 2.2.3 学习状态复位（P1）⭐

**功能说明**：
用户可将个人学习进度清零，重新开始学习。适用于：
- 学完一轮想重新学习
- 误操作导致进度混乱
- 想挑战更高分数

**复位范围**：
| 数据表 | 是否清零 | 说明 |
|--------|----------|------|
| `user_word_progress` | ✅ | 单词学习状态清零 |
| `learning_records` | ✅ | 学习记录清空 |
| `review_sessions` | ✅ | 复习会话清空 |
| `pronunciation_records` | ✅ | 发音练习记录清空 |
| `user_configs` | ❌ | 保留配置（每日新词数等） |
| `user_profiles` | ❌ | 保留个人资料 |

**API 设计**：
```javascript
POST /api/users/reset-progress
Request: { 
  confirm: true,  // 二次确认
  reason: 'restart' | 'mistake' | 'other' 
}
Response: {
  success: boolean,
  resetCount: {
    words: number,
    records: number,
    sessions: number
  }
}
```

**前端交互**：
```
⚠️ 确认复位学习进度？

此操作将清空：
✓ 所有单词学习状态
✓ 学习记录
✓ 复习会话
✓ 发音练习记录

不会清空：
✓ 个人配置
✓ 账号信息

[输入"确认复位"后按钮变亮]
┌─────────────────┐
│  确认复位        │
└─────────────────┘
```

---

#### 2.2.4 管理员功能（P0）⭐

##### 2.2.4.1 用户管理

**API**：
```javascript
GET /api/admin/users?page=1&pageSize=20
Response: {
  users: [{
    id: number,
    openid: string,
    nickname: string,
    avatar: string,
    role: 'user' | 'admin',
    status: 'active' | 'banned',
    studyDays: number,
    totalWords: number,
    lastLoginAt: string,
    createdAt: string
  }],
  total: number,
  page: number
}

POST /api/admin/users/:id/role
Request: { role: 'user' | 'admin' }

POST /api/admin/users/:id/ban
Request: { reason: string }

POST /api/admin/users/:id/unban
```

##### 2.2.4.2 全局统计

**API**：
```javascript
GET /api/admin/stats
Response: {
  totalUsers: number,
  activeUsers: number,
  totalWordsLearned: number,
  totalLearningTime: number,
  newUsersToday: number,
  topUsers: [{
    nickname: string,
    studyDays: number,
    masteredWords: number
  }]
}
```

##### 2.2.4.3 管理员数据复位

**与普通用户复位的区别**：
- 可复位指定用户的数据
- 可批量复位多个用户
- 可复位全部用户（危险操作）

**API**：
```javascript
POST /api/admin/data-reset
Request: {
  userIds: number[],  // 指定用户，空表示全部
  confirm: true,
  reason: string
}
```

##### 2.2.4.4 系统日志

**记录管理员操作**：
```sql
CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  action TEXT,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);
```

---

#### 2.2.5 个人中心（P1）

**页面布局**：
```
┌─────────────────────────────┐
│      头像      昵称         │
│   学习天数 | 累计单词       │
├─────────────────────────────┤
│  📊 学习统计                │
│  ⚙️ 学习设置                │
│  📖 错题本                   │
│  🏆 成就系统                │
│  🔄 学习进度复位 ⭐        │
├─────────────────────────────┤
│  [切换账号]  [退出登录]     │
└─────────────────────────────┘
```

---

### 2.3 数据库变更汇总

#### 修改 `users` 表
```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN banned_reason TEXT;
```

#### 新增表：`user_profiles`
```sql
CREATE TABLE IF NOT EXISTS user_profiles (
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

#### 新增表：`system_logs`
```sql
CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  action TEXT,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);
```

---

## 3. 技术实现

### 3.1 后端改动

| 文件 | 改动 |
|------|------|
| `auth-middleware.js` | 增强 JWT 校验，添加 role 注入 |
| `auth-wechat.js` | 微信登录逻辑 |
| `users.js` | 用户信息、profile 管理、进度复位 |
| `admin.js`（新增）| 管理员功能 |
| `database.js` | 新增字段和表 |
| `.env.example` | 添加 `ADMIN_OPENID` 配置 |

### 3.2 前端改动

| 文件 | 改动 |
|------|------|
| `pages/login/login.js`（新增）| 登录页 |
| `pages/profile/profile.js`（新增）| 个人中心 |
| `pages/admin/index.js`（新增）| 管理员后台 |
| `utils/auth.js`（新增）| token 存储、校验 |
| `app.js` | 全局登录态管理、角色判断 |

---

## 4. 开发计划

### Phase 1 - 账号体系（2 天）
- [ ] 数据库变更（role、status 字段）
- [ ] 微信登录 API
- [ ] JWT 鉴权中间件（含角色）
- [ ] 管理员账号初始化

### Phase 2 - 学习复位（1 天）
- [ ] 用户进度复位 API
- [ ] 复位确认前端交互
- [ ] 复位日志记录

### Phase 3 - 管理员功能（2 天）
- [ ] 用户管理 API + 前端
- [ ] 全局统计 API + 前端
- [ ] 管理员数据复位
- [ ] 系统日志记录

### Phase 4 - 个人中心（1 天）
- [ ] 用户 profile 页
- [ ] 学习统计展示
- [ ] 退出/切换账号

### Phase 5 - 测试与优化（1 天）
- [ ] 边界情况处理
- [ ] 安全测试（越权访问）
- [ ] 性能优化

---

## 5. 验收标准

### 基础功能
- [ ] 微信登录成功，获取用户信息
- [ ] 不同账号学习数据完全隔离
- [ ] 退出登录后无法访问学习数据

### 学习复位
- [ ] 用户可复位个人学习进度
- [ ] 复位后数据清零，配置保留
- [ ] 复位操作有二次确认

### 管理员功能
- [ ] 管理员可查看所有用户列表
- [ ] 管理员可查看全局统计
- [ ] 管理员可复位指定用户数据
- [ ] 管理员操作记录到系统日志
- [ ] 普通用户无法访问管理员功能

### 安全
- [ ] 无越权访问漏洞
- [ ] 敏感操作有日志记录
- [ ] JWT token 有效校验

---

## 6. 环境配置

### .env 新增配置
```bash
# 管理员配置
ADMIN_OPENID=your_admin_openid_here

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 系统配置
ENABLE_ADMIN_PANEL=true
ENABLE_USER_RESET=true
```

---

## 7. 风险与依赖

| 风险 | 应对措施 |
|------|----------|
| 微信接口变更 | 关注官方文档，预留适配层 |
| 数据误删除 | 复位前备份，支持恢复窗口期 |
| 管理员权限滥用 | 操作日志记录，敏感操作需二次确认 |
| 并发复位 | 数据库事务锁，防止重复操作 |

---

## 8. 回滚方案

如开发过程中遇到严重问题，可回滚到基线版本：

```bash
# 基线版本：v1.0.0-baseline (commit: c3cd018)
git checkout v1.0.0-baseline
```

详见 `../VERSION.md`
