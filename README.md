# 雅思智能背单词系统

## 项目概述
- **目标**：基于剑桥雅思 1-18 词汇的智能背单词小程序
- **核心功能**：灵活配置学习计划 + 艾宾浩斯遗忘曲线复习
- **技术栈**：Node.js 后端 + 微信小程序前端

---

## 🚨 部署配置（关键信息）

### 服务器配置
| 配置项 | 值 | 说明 |
|--------|-----|------|
| **域名** | `caiyuyang.cn` | 正式环境域名 |
| **端口** | `3001` | HTTPS 服务端口 |
| **协议** | `https://` | 微信小程序强制要求 HTTPS |
| **API 地址** | `https://caiyuyang.cn:3001/api` | 小程序请求地址 |

### SSL 证书
| 配置项 | 值 | 说明 |
|--------|-----|------|
| **证书路径** | `/etc/letsencrypt/live/caiyuyang.cn/ielts.crt` | Let's Encrypt 证书 |
| **私钥路径** | `/etc/letsencrypt/live/caiyuyang.cn/ielts.key` | Let's Encrypt 私钥 |
| **后端软链接** | `backend/ssl/cert.pem` → 证书 | 后端服务引用 |
| **后端软链接** | `backend/ssl/key.pem` → 私钥 | 后端服务引用 |

### 服务启动
```bash
# 生产环境启动（HTTPS）
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend
PORT=3001 node simple-server-https.js > https-server.log 2>&1 &

# 验证服务
curl -k https://localhost:3001/health
```

### 小程序配置
文件：`frontend/app.js`
```javascript
const serverDomain = 'caiyuyang.cn';
const serverPort = '3001';
const apiUrl = `https://${serverDomain}:${serverPort}/api`;
```

### ⚠️ 常见错误排查
| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `ERR_CONNECTION_REFUSED` | 端口不匹配或服务未启动 | 确认服务运行在 3001 端口 |
| `ERR_CONNECTION_TIMED_OUT` | 防火墙/安全组限制 | 检查服务器防火墙规则 |
| 证书错误 | SSL 证书路径错误或过期 | 检查 `/etc/letsencrypt/live/caiyuyang.cn/` |
| 协议不匹配 | 小程序用 HTTPS 访问 HTTP 服务 | 必须使用 `simple-server-https.js` |

---

## 功能需求
### 学习配置
- ✅ 每周新词学习频率（1-7 天/周）
- ✅ 每次学习新词数量（可配置）
- ✅ 复习提醒时间（可配置）

### 智能复习
- ✅ 基于艾宾浩斯遗忘曲线的抗遗忘复习
- ✅ 自动安排每日复习课程
- ✅ 错题重点强化

### 词汇范围
- ✅ 剑桥雅思 1-18 完整词汇库
- ✅ 词汇分级（高频/中频/低频）
- ✅ 雅思真题例句

### 数据管理
- ✅ 学习进度自动保存
- ✅ 词汇书签/收藏功能
- ✅ 学习统计报表

---

## 项目结构
```
ielts-vocab-system/
├── backend/                 # Node.js 后端服务
│   ├── server.js           # 主服务（HTTP）
│   ├── simple-server-https.js  # HTTPS 服务（生产环境）
│   ├── database.js         # 数据库配置
│   ├── routes/             # API 路由
│   ├── controllers/        # 业务逻辑
│   └── ssl/                # SSL 证书（软链接）
├── frontend/               # 微信小程序前端
│   ├── app.js             # 小程序入口（配置 API 地址）
│   ├── pages/             # 页面组件
│   └── components/        # 公共组件
├── docs/                   # 项目文档
└── README.md              # 项目说明
```

---

## 开发历史
- **创建时间**：2026-03-11
- **最新修复**：2026-03-13（HTTPS 端口配置修复）
- **Git 仓库**：`/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system`

---

_最后更新：2026-03-13 15:45 | 菜菜 🦞_
