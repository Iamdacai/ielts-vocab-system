#!/bin/bash
# 重启后端服务

cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend

# 停止旧服务
pkill -f "simple-server-https.js" 2>/dev/null
sleep 2

# 启动新服务
export PORT=3001
nohup node simple-server-https.js > https-server.log 2>&1 &
echo "服务已启动，PID: $!"

# 等待服务启动
sleep 3

# 检查服务状态
if curl -k -s https://localhost:3001/health > /dev/null; then
  echo "✅ 服务运行正常"
else
  echo "❌ 服务启动失败，查看日志："
  tail -20 https-server.log
fi
