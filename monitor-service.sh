#!/bin/bash

# 后端服务监控脚本
# 功能：检查服务是否运行，如果停止则自动重启

SERVICE_NAME="simple-server-https.js"
PORT=3001
LOG_FILE="/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend/https-server.log"
PID_FILE="/tmp/ielts-backend.pid"

check_service() {
    if pgrep -f "$SERVICE_NAME" > /dev/null; then
        return 0
    else
        return 1
    fi
}

start_service() {
    echo "$(date): 启动后端服务..." >> "$LOG_FILE"
    cd /home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend
    export PORT=3001
    nohup node simple-server-https.js >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 3
    
    if check_service; then
        echo "$(date): 服务启动成功" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): 服务启动失败" >> "$LOG_FILE"
        return 1
    fi
}

# 主循环
echo "========================================"
echo "后端服务监控启动"
echo "监控对象：$SERVICE_NAME"
echo "端口：$PORT"
echo "========================================"

while true; do
    if check_service; then
        # 服务运行中，每分钟检查一次
        sleep 60
    else
        # 服务停止，尝试重启
        echo "$(date): ⚠️  检测到服务停止，尝试重启..." >> "$LOG_FILE"
        start_service
        
        if [ $? -ne 0 ]; then
            echo "$(date): ❌ 重启失败，5 秒后重试..." >> "$LOG_FILE"
            sleep 5
        fi
    fi
done
