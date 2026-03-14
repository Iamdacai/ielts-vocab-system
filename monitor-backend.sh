#!/bin/bash
# 雅思智能背单词系统 - 后端服务监控脚本
# 用途：检查服务状态，如果停止则自动启动

BACKEND_DIR="/home/admin/.openclaw/workspace/git-repos/ielts-vocab-system/backend"
LOG_FILE="$BACKEND_DIR/monitor.log"
PORT=3001

# 记录日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查服务是否运行
check_service() {
    if pgrep -f "simple-server-https.js" > /dev/null; then
        return 0  # 服务运行中
    else
        return 1  # 服务已停止
    fi
}

# 检查端口是否监听
check_port() {
    if curl -k -s https://localhost:$PORT/health > /dev/null 2>&1; then
        return 0  # 端口正常
    else
        return 1  # 端口无响应
    fi
}

# 启动服务
start_service() {
    log "🚀 正在启动后端服务..."
    
    cd "$BACKEND_DIR"
    export PORT=$PORT
    
    # 启动服务
    nohup node simple-server-https.js > https-server.log 2>&1 &
    PID=$!
    
    # 等待 3 秒检查是否启动成功
    sleep 3
    
    if check_service; then
        log "✅ 服务启动成功 (PID: $PID)"
        return 0
    else
        log "❌ 服务启动失败"
        return 1
    fi
}

# 停止服务
stop_service() {
    log "🛑 正在停止后端服务..."
    pkill -f "simple-server-https.js"
    sleep 2
    
    if ! check_service; then
        log "✅ 服务已停止"
        return 0
    else
        log "⚠️  服务停止失败，尝试强制停止"
        pkill -9 -f "simple-server-https.js"
        return $?
    fi
}

# 重启服务
restart_service() {
    log "🔄 正在重启后端服务..."
    stop_service
    sleep 2
    start_service
}

# 主逻辑
main() {
    local action="${1:-check}"
    
    case "$action" in
        start)
            if check_service && check_port; then
                log "ℹ️  服务已在运行中"
                exit 0
            else
                start_service
                exit $?
            fi
            ;;
        stop)
            stop_service
            exit $?
            ;;
        restart)
            restart_service
            exit $?
            ;;
        check|monitor)
            if check_service && check_port; then
                log "✅ 服务运行正常 (端口 $PORT)"
                exit 0
            else
                log "⚠️  服务异常，正在自动恢复..."
                start_service
                exit $?
            fi
            ;;
        status)
            echo "=== 后端服务状态 ==="
            if check_service; then
                echo "服务状态：✅ 运行中"
                ps aux | grep "simple-server-https.js" | grep -v grep
            else
                echo "服务状态：❌ 已停止"
            fi
            
            if check_port; then
                echo "端口状态：✅ 正常 ($PORT)"
            else
                echo "端口状态：❌ 无响应"
            fi
            
            echo ""
            echo "最近日志:"
            tail -5 "$LOG_FILE"
            ;;
        *)
            echo "用法：$0 {start|stop|restart|check|status}"
            exit 1
            ;;
    esac
}

main "$@"
