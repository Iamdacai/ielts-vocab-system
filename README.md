# 雅思智能背单词系统

## 项目概述
- **目标**：基于多词库的雅思智能背单词小程序
- **核心功能**：灵活配置学习计划 + 艾宾浩斯遗忘曲线复习 + 多词库选择
- **技术栈**：Node.js 后端 + 微信小程序前端

---

## ⚠️ 开发规范

### Git 自动推送

**原则**: 每次代码更新后必须自动推送到 GitHub

**自动推送脚本**:
```bash
# 使用自动推送脚本（推荐）
./git-auto-push.sh "feat: 功能描述"
# 或
./git-auto-push.sh "fix: 修复描述"
```

**手动推送**:
```bash
git add -A
git commit -m "feat/fix/docs: 描述"
git push origin master
```

**提交信息规范**:
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

---

---

## 🆕 词库更新 (2026-03-14)

### 新增词库：雅思词汇真经（刘洪波）

| 项目 | 详情 |
|------|------|
| **词汇量** | 3,674 词 |
| **分类数** | 22 个场景主题 |
| **配套音频** | 480MB (章节音频 + 单词音频) |
| **数据来源** | [hefengxian/my-ielts](https://github.com/hefengxian/my-ielts) |

#### 22 个场景分类

自然地理、植物研究、动物保护、太空探索、学校教育、科技发明、文化历史、语言演化、娱乐运动、物品材料、时尚潮流、饮食健康、建筑场所、交通旅行、国家政府、社会经济、法律法规、沙场争锋、社会角色、行为动作、身心健康、时间日期

📖 **详细文档**: [`docs/词库整合说明.md`](docs/词库整合说明.md)

### 词库对比

| 词库 | 词汇量 | 分类方式 | 特点 |
|------|--------|----------|------|
| 剑桥雅思 1-18 | 4,464 词 | 按剑 1-18 分册 | 真题词汇，适合刷题 |
| 雅思词汇真经 | 3,674 词 | 按 22 个场景 | 逻辑词群记忆，适合基础 |

---

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
- ✅ **双词库支持**
  - 剑桥雅思 1-18（4,464 词，按真题分册）
  - 雅思词汇真经（3,674 词，按 22 个场景主题）
- ✅ 词汇分级（高频/中频/低频）
- ✅ 雅思真题例句 + 场景例句
- ✅ 配套音频（单词发音 + 章节音频）

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
├── vocabulary/             # 🆕 词汇资源
│   └── ielts-materials/    # 词库数据
│       ├── ielts-vocab-zhenjing-complete.json
│       ├── [分类名].json   # 22 个分类文件
│       └── audio/          # 480MB 音频资源
├── scripts/                # 🆕 工具脚本
│   └── import-my-ielts-vocab.py  # 词汇导入脚本
├── docs/                   # 项目文档
│   ├── 词库整合说明.md     # 🆕 词库使用指南
│   └── 词汇导入报告.md     # 🆕 导入统计报告
└── README.md              # 项目说明
```

---

## 开发历史
- **创建时间**：2026-03-11
- **最新修复**：2026-03-13（HTTPS 端口配置修复）
- **词库整合**：2026-03-14（导入雅思词汇真经 3,674 词 + 480MB 音频）
- **Git 仓库**：`/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system`

---

_最后更新：2026-03-13 15:45 | 菜菜 🦞_
