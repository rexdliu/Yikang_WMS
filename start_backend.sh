#!/bin/bash

# 后端服务启动脚本

# 检查虚拟环境是否存在
if [ ! -d ".venv" ]; then
    echo "虚拟环境不存在，请先运行 setup.sh 创建虚拟环境"
    exit 1
fi

# 激活虚拟环境
source .venv/bin/activate

# 设置PYTHONPATH并启动uvicorn服务器
echo "正在启动后端服务..."
echo "访问地址: http://127.0.0.1:8001"
PYTHONPATH=src/Backend uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload