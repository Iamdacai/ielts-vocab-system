# 🔑 关键项目信息 - 严禁遗忘！

**更新时间**: 2026-03-16 09:52  
**重要性**: ⭐⭐⭐⭐⭐ 每次任务前必须检查

---

## 📦 项目代码仓库

**位置**: `/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system`

**注意**: 
- ❌ 不是 `/home/admin/.openclaw/workspace/ielts-vocab-system`
- ✅ 是 `/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system`

**Git 远程**:
- GitHub: `git@github.com:Iamdacai/ielts-vocab-system.git`
- 分支：`master`

**项目结构**:
```
ielts-vocab-system/
├── frontend/          # 微信小程序前端
├── backend/           # Node.js 后端 API
├── docs/              # 文档
└── ...
```

---

## 🌐 后端服务配置

**服务状态**: 系统服务运行中  
**端口**: 3001 (HTTPS)  
**域名**: `https://caiyuyang.cn:3001`

**API 基础路径**: `https://caiyuyang.cn:3001/api`

**主要路由**:
- `/health` - 健康检查
- `/sessions` - 学习会话
- `/words` - 单词管理
- `/stats` - 统计数据
- `/audio` - 音频文件
- `/pronunciation` - 发音服务
- `/achievements` - 成就系统
- `/reminders` - 智能提醒
- `/mistakes` - 错题本

**数据库**: SQLite (`backend/ielts_vocab.db`)  
**单词数量**: 4464 个

---

## 📱 小程序配置

**API 地址**: `https://caiyuyang.cn:3001/api`

**配置文件**:
- `frontend/app.js` - 全局配置
- `frontend/pages/learning/learning.js` - 学习页面

**编译工具**: 微信开发者工具

---

## 📁 工作区结构

**主工作区**: `/home/admin/.openclaw/workspace/`

```
workspace/
├── git-repos/
│   └── ielts-vocab-system/    # ⭐ 项目代码仓库
├── reports/
│   ├── daily/                 # 日报
│   ├── weekly/                # 周报
│   └── monthly/               # 月报
├── projects/                  # 项目归档
├── memory/                    # 每日记忆
└── ...
```

---

## 🔧 Git 操作清单

**推送前检查**:
```bash
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system
git status
git pull origin master --rebase
git add .
git commit -m "描述"
git push origin master
```

**自动同步脚本**: `auto-sync.sh`

---

## ⚠️ 易错点提醒

1. **仓库位置**: 在 `git-repos/` 子目录下，不在 workspace 根目录
2. **API 路径**: 是 `/sessions` 不是 `/learning/session`
3. **HTTPS 端口**: 3001（不是 80 或 443）
4. **域名**: `caiyuyang.cn`（不是 `github.com`）

---

## 📋 任务前检查清单

每次处理雅思系统相关任务前，必须确认：

- [ ] 项目仓库位置正确 (`git-repos/ielts-vocab-system`)
- [ ] Git 远程仓库配置正确
- [ ] 后端服务运行正常
- [ ] API 路径正确
- [ ] 本地代码是最新版本

---

---

## ✅ 稳定版本标记（2026-03-16 完工）

**当前稳定版本**: `f477d2a` (2026-03-16 09:52)

**已验证可用的功能**:
- ✅ 单词发音播放（有道 TTS 动态获取 + 本地缓存）
- ✅ 发音练习（录音 + 评分 + 反馈）- 学习页面 + 复习页面
- ✅ 发音历史记录和统计
- ✅ 配置页面（词库选择 + 分类选择 + 每周学习天数）
- ✅ 新词学习（发音 + 跟读）
- ✅ 复习功能（JSON 安全解析 + 发音 + 跟读）
- ✅ 配置页面选中状态显示（修复完成）

**核心保护代码**（后续开发不要随意修改）:
- ⚠️ `backend/simple-server-https.js`: `/api/pronunciation/word-audio/:word` 路由（有道 TTS）
- ⚠️ `backend/simple-server-https.js`: `/api/words/review` 路由（安全 JSON 解析）
- ⚠️ `backend/simple-server-https.js`: `/api/pronunciation/analyze` 路由（发音评分）
- ⚠️ `frontend/pages/learning/learning.js`: `playFallbackAudio()`, `playWordAudio()`, 发音练习方法
- ⚠️ `frontend/pages/review/review.js`: `playWordAudio()`, 发音练习方法
- ⚠️ `frontend/pages/config/config.js`: `daysOfWeek` 数据结构（带 `selected` 属性）
- ⚠️ `backend/audio/` 目录：TTS 音频缓存

**最新 10 次提交**:
```
f477d2a fix: 修复配置页面每周学习天数选中状态（改用 selected 属性）
beccf34 fix: 修复配置页面每周学习天数选中状态显示问题
5e5ba31 fix: 修复设置页面每周学习天数选择无选中状态
2f6b9a0 feat: 首页增加学习数据概览卡片
e0ca603 fix: 修复首页按钮跳转和待复习单词数显示
d81842c feat: 学习完成页面添加继续学习按钮
444f880 fix: 修复学习进度保存 500 错误
0e4e26d feat: 实现学习进度统计和保存功能
c527c54 feat: 复习页面交互优化 + 新词学习页面完善
731b161 feat: 复习页面添加发音按钮 + 修复单词释义显示
```

**回滚方法**（如需恢复到稳定版本）:
```bash
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system
git reset --hard f477d2a
git push origin master --force
```

---

_最后更新：2026-03-16 09:52 | 菜菜 🦞_
