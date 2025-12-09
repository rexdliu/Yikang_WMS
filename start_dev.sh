#!/bin/bash

# 开发环境启动脚本 - 同时启动前端和后端服务

echo "正在启动开发环境..."

# 检查虚拟环境是否存在
if [ ! -d ".venv" ]; then
    echo "虚拟环境不存在，请先运行 setup.sh 创建虚拟环境"
    exit 1
fi

# 启动后端服务
echo "正在启动后端服务 (http://127.0.0.1:8001)..."
source .venv/bin/activate
PYTHONPATH=src/Backend uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

# 等待后端服务启动
sleep 3

# 启动前端服务
echo "正在启动前端服务 (http://localhost:8003)..."
npm run dev

# 捕获 Ctrl+C 信号以优雅地关闭后台进程
trap "kill -9 $BACKEND_PID; exit" INT

# 等待后台进程结束
wait $BACKEND_PID