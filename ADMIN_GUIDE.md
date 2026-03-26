# 后台管理系统开发文档

**版本**: v1.0  
**创建时间**: 2026-03-25  
**访问地址**: https://caiyuyang.cn:3001/admin

---

## 📋 功能清单

### Phase 1 - 已完成 ✅

#### 1. 管理员认证系统
- ✅ 管理员登录（支持记住登录 7 天）
- ✅ 管理员登出
- ✅ 获取当前管理员信息
- ✅ JWT Token 认证
- ✅ 登录失败保护（5 次失败锁定 30 分钟）

#### 2. 词库管理
- ✅ 词库列表（分页、搜索）
- ✅ 创建词库
- ✅ 编辑词库
- ✅ 删除词库（**带使用状态检查**）
- ✅ 词库单词列表
- ✅ 批量导入单词（CSV）

#### 3. 用户管理
- ✅ 用户列表（分页、搜索、状态筛选）
- ✅ 用户详情
- ✅ 禁用用户
- ✅ 启用用户
- ✅ 用户学习进度查看

#### 4. 统计分析
- ✅ 数据概览（总用户数、活跃用户、学习人次等）
- ✅ 词库使用统计
- ✅ 高频错题 TOP50
- ✅ 趋势数据（用户增长、学习活跃度）

#### 5. 系统日志
- ✅ 操作日志列表
- ✅ 日志筛选（按操作类型、管理员、时间）

---

## 🔐 默认管理员账号

```
用户名：admin
密码：admin123
```

**⚠️ 重要：请在首次登录后立即修改密码！**

---

## 📁 文件结构

```
ielts-vocab-system/
├── admin/                      # 管理后台前端
│   ├── index.html             # 主页面
│   └── admin.js               # 前端逻辑
├── backend/
│   ├── routes/                # Admin API 路由
│   │   ├── admin-auth.js      # 认证路由
│   │   ├── admin-wordbooks.js # 词库管理路由
│   │   ├── admin-users.js     # 用户管理路由
│   │   ├── admin-stats.js     # 统计分析路由
│   │   └── admin-logs.js      # 日志路由
│   ├── scripts/
│   │   └── init-admin.js      # 管理员初始化脚本
│   ├── migrations/
│   │   └── migrate-admin-table.sql
│   └── simple-server-https.js # 主服务器
└── PRD-ADMIN.md               # 产品需求文档
```

---

## 🔌 API 接口

### 认证接口

```
POST /api/admin/auth/login
Body: { username, password, remember }
Response: { token, admin }

POST /api/admin/auth/logout
Headers: Authorization: Bearer <token>
Response: { success: true }

GET /api/admin/auth/me
Headers: Authorization: Bearer <token>
Response: { admin }
```

### 词库管理

```
GET /api/admin/wordbooks?page=1&pageSize=20&search=xxx
Response: { wordbooks, total, page, pageSize }

GET /api/admin/wordbooks/:id
Response: { wordbook }

POST /api/admin/wordbooks
Body: { name, description, coverImage }
Response: { success, wordbookId }

PUT /api/admin/wordbooks/:id
Body: { name, description, status }
Response: { success }

DELETE /api/admin/wordbooks/:id
Response: { success }
⚠️ 删除前会检查：
  - activeUsers: 正在学习的用户数
  - learningUsers: 有学习记录的用户数
  如果有用户使用中，返回 409 错误

GET /api/admin/wordbooks/:id/words?page=1&pageSize=50
Response: { words, total }

POST /api/admin/wordbooks/:id/import
FormData: { file: CSV 文件 }
Response: { success, stats: { total, success, duplicate, error } }
```

### 用户管理

```
GET /api/admin/users/users?page=1&pageSize=20&search=xxx&status=active
Response: { users, total }

GET /api/admin/users/users/:id
Response: { user, stats, libraries }

POST /api/admin/users/users/:id/disable
Body: { reason }
Response: { success }

POST /api/admin/users/users/:id/enable
Response: { success }

GET /api/admin/users/users/:id/progress
Response: { progress }
```

### 统计分析

```
GET /api/admin/stats/overview
Response: { overview: { totalUsers, activeUsers7d, newUsersToday, ... } }

GET /api/admin/stats/trends?days=7
Response: { trends: { userGrowth, studyActivity } }

GET /api/admin/stats/wordbooks
Response: { wordbooks: [...] }

GET /api/admin/stats/mistakes?limit=50
Response: { mistakes: { topMistakes, trend } }

GET /api/admin/stats/users
Response: { users: { studyTimeDistribution, retention } }
```

### 系统日志

```
GET /api/admin/logs/logs?page=1&pageSize=50&action=login&startDate=2026-03-01
Response: { logs, total }

GET /api/admin/logs/actions
Response: { actions: [{ action, count }] }
```

---

## 🎨 前端页面

### 登录页面
- 用户名/密码登录
- 记住我（7 天）
- 登录失败提示

### 数据概览
- 核心指标卡片（总用户数、活跃用户、学习人次、词库数）
- 词库使用排行 TOP10
- 高频错题 TOP5

### 词库管理
- 词库列表（分页、搜索）
- 创建/编辑词库对话框
- 删除确认（带使用状态检查）
- 使用状态显示（正在学习人数、有记录人数）

### 用户管理
- 用户列表（分页、搜索、状态筛选）
- 用户详情（学习统计、词库配置）
- 禁用/启用用户

### 统计分析
- 详细统计图表（开发中）

### 操作日志
- 日志列表
- 日志筛选

---

## 🔒 安全特性

1. **HTTPS 强制** - 所有请求使用 HTTPS
2. **密码加密** - bcrypt 加密存储（salt rounds = 10）
3. **JWT Token** - 会话管理，支持过期时间
4. **登录保护** - 连续 5 次失败锁定 30 分钟
5. **操作日志** - 记录所有管理员操作
6. **权限控制** - 管理员中间件验证
7. **删除保护** - 词库使用前不允许删除

---

## 🚀 部署说明

### 1. 初始化管理员账号

```bash
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend
node scripts/init-admin.js
```

### 2. 启动后端服务

```bash
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend
PORT=3001 node simple-server-https.js > https-server.log 2>&1 &
```

### 3. 访问管理后台

打开浏览器访问：https://caiyuyang.cn:3001/admin

---

## 📝 使用流程

### 创建新词库

1. 登录管理后台
2. 进入「词库管理」
3. 点击「新建词库」
4. 输入词库名称、描述
5. 点击保存
6. 点击「查看单词」→ 批量导入 CSV

### 批量导入单词

CSV 格式示例：

```csv
word,phonetic,definition,example
apple,/ˈæpəl/,n. 苹果,I eat an apple every day.
banana,/bəˈnænə/,n. 香蕉,Bananas are rich in potassium.
```

支持的列名：
- word / 单词 / Word
- phonetic / 音标 / Phonetic
- definition / 释义 / Definition
- example / 例句 / Example

### 删除词库

⚠️ **重要：删除前会检查使用状态**

- 如果有用户正在学习该词库 → ❌ 不允许删除
- 如果有用户有该词库的学习记录 → ❌ 不允许删除
- 提示：「当前有 X 个用户正在学习该词库，请先暂停或转移用户学习进度」

### 禁用用户

1. 进入「用户管理」
2. 找到目标用户
3. 点击「禁用」
4. 用户将被禁止登录和使用系统

---

## 🐛 已知问题

- [ ] 修改密码功能待完善
- [ ] 详细统计图表待开发
- [ ] 词库单词编辑功能待开发
- [ ] 数据导出功能待开发

---

## 📅 后续迭代计划

### Phase 2 - 增强功能
- [ ] 词库单词批量编辑
- [ ] 数据导出（Excel/CSV）
- [ ] 用户学习轨迹查看
- [ ] 成就系统管理
- [ ] 提醒管理

### Phase 3 - 高级功能
- [ ] 多管理员协作
- [ ] 数据看板自定义
- [ ] AI 辅助分析
- [ ] 自动化运营

---

## 📞 技术支持

如有问题，请联系系统管理员。

**最后更新**: 2026-03-25
