#!/bin/bash
# IELTS 背单词系统 - Git 自动推送脚本
# 用途：代码修改后自动提交并推送到 GitHub

# 配置
REPO_DIR="/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system"
MESSAGE="${1:-auto: 代码更新}"

# 进入仓库目录
cd "$REPO_DIR" || exit 1

# 检查是否有更改
if git status --porcelain | grep -q .; then
  echo "📝 检测到代码变更..."
  
  # 添加所有更改
  git add -A
  
  # 提交更改
  git commit -m "$MESSAGE"
  
  # 推送到 GitHub
  echo "🚀 正在推送到 GitHub..."
  git push origin master
  
  if [ $? -eq 0 ]; then
    echo "✅ 推送成功！"
    git log -1 --oneline
  else
    echo "❌ 推送失败，请检查网络连接"
    exit 1
  fi
else
  echo "ℹ️  没有检测到代码变更"
fi
