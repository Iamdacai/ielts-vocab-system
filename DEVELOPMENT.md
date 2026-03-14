# 开发规范

**创建时间**: 2026-03-14  
**最后更新**: 2026-03-14

---

## 📌 Git 推送规范

### 核心原则

**每次代码更新后必须自动推送到 GitHub**

这是强制要求，确保：
- ✅ 代码版本可追溯
- ✅ 团队协作无障碍
- ✅ 部署有可靠来源
- ✅ 问题可回溯定位

---

## 🔧 自动推送脚本

### 使用方法

```bash
# 方式 1: 使用自动推送脚本（推荐）
cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system
./git-auto-push.sh "feat: 添加新功能"

# 方式 2: 指定提交信息
./git-auto-push.sh "fix: 修复配置页面交互问题"

# 方式 3: 使用默认提交信息
./git-auto-push.sh
```

### 脚本功能

- ✅ 自动检测代码变更
- ✅ 添加所有更改 (`git add -A`)
- ✅ 提交更改（使用提供的提交信息）
- ✅ 推送到 GitHub (`git push origin master`)
- ✅ 显示推送结果和最新提交

---

## 📝 提交信息规范

### 格式

```
<type>: <description>
```

### Type 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加词库选择功能` |
| `fix` | Bug 修复 | `fix: 修复登录页面崩溃` |
| `docs` | 文档更新 | `docs: 更新 README 部署说明` |
| `style` | 代码格式 | `style: 格式化代码` |
| `refactor` | 重构 | `refactor: 优化数据库连接` |
| `test` | 测试 | `test: 添加用户登录测试` |
| `chore` | 构建/工具 | `chore: 更新依赖版本` |

### 示例

```bash
# 新功能
git commit -m "feat: 支持按词库和分类查询单词"

# Bug 修复
git commit -m "fix: 修复配置页面天数选择器无法点击"

# 文档更新
git commit -m "docs: 添加开发规范文档"

# 综合更新
git commit -m "feat: 完成词库选择功能

- 添加词库列表 API
- 更新配置页面 UI
- 修复返回首页按钮
- 添加点击反馈效果"
```

---

## 🚀 完整开发流程

### 1. 开发前

```bash
# 拉取最新代码
git pull origin master
```

### 2. 开发中

```bash
# 定期保存进度（可选）
git add -A
git stash
```

### 3. 开发完成后

```bash
# 测试功能
# ...

# 提交并推送
./git-auto-push.sh "feat: 完成 XX 功能"
```

### 4. 验证推送

```bash
# 查看提交历史
git log --oneline -5

# 查看远程状态
git status
```

---

## ⚠️ 注意事项

### 推送前检查

- [ ] 代码已测试通过
- [ ] 无敏感信息（密码、密钥等）
- [ ] 提交信息清晰准确
- [ ] 无临时文件（.bak, .log 等）

### 禁止行为

- ❌ 推送包含敏感信息
- ❌ 推送未测试的代码
- ❌ 使用模糊的提交信息（如"update"、"fix"）
- ❌ 跳过推送直接部署

### 特殊情况

**推送失败**:
```bash
# 检查网络
ping github.com

# 检查远程仓库
git remote -v

# 手动重试
git push origin master
```

**冲突处理**:
```bash
# 拉取最新代码
git pull origin master

# 解决冲突后重新提交
git add -A
git commit -m "merge: 解决冲突"
git push origin master
```

---

## 📁 相关文件

| 文件 | 用途 |
|------|------|
| `git-auto-push.sh` | 自动推送脚本 |
| `.gitignore` | Git 忽略文件配置 |
| `README.md` | 项目说明（含部署配置） |
| `DEVELOPMENT.md` | 本文件（开发规范） |

---

## 🔗 GitHub 仓库

https://github.com/Iamdacai/ielts-vocab-system

---

_规范创建：2026-03-14 | 菜菜 🦞_
