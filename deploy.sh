#!/bin/bash

# ==========================================
# Product Warehouse - 生产环境部署脚本
# ==========================================

set -e  # 遇到错误立即退出

PROJECT_DIR="/home/user/Product_Warehouse"
BACKEND_DIR="$PROJECT_DIR/src/Backend"
VENV_DIR="$PROJECT_DIR/.venv"
NGINX_CONF_SOURCE="$PROJECT_DIR/nginx/warehouse.conf"
NGINX_CONF_TARGET="/etc/nginx/sites-available/warehouse.conf"
NGINX_CONF_ENABLED="/etc/nginx/sites-enabled/warehouse.conf"

echo "=========================================="
echo "🚀 Product Warehouse 部署脚本"
echo "=========================================="

# 检查是否以 root 或 sudo 运行
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  警告：不建议以 root 用户运行此脚本"
    read -p "是否继续？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 1. 检查环境配置
echo ""
echo "📋 步骤 1/8: 检查环境配置..."
if [ ! -f "$PROJECT_DIR/.env.production" ]; then
    echo "❌ 错误：找不到 .env.production 文件"
    echo "请复制 .env.production.example 并配置生产环境变量"
    exit 1
fi
echo "✅ 环境配置文件存在"

# 2. 更新代码
echo ""
echo "📥 步骤 2/8: 更新代码..."
cd "$PROJECT_DIR"
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "当前分支: $CURRENT_BRANCH"
read -p "是否拉取最新代码？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git pull origin "$CURRENT_BRANCH"
    echo "✅ 代码已更新"
else
    echo "⏭️  跳过代码更新"
fi

# 3. 构建前端
echo ""
echo "🏗️  步骤 3/8: 构建前端..."
npm install
npm run build
if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功"
    echo "📦 构建产物位置: $PROJECT_DIR/dist"
else
    echo "❌ 前端构建失败"
    exit 1
fi

# 4. 安装后端依赖
echo ""
echo "🐍 步骤 4/8: 安装后端依赖..."
if [ ! -d "$VENV_DIR" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$PROJECT_DIR/requirements.txt"
echo "✅ 后端依赖安装完成"

# 5. 数据库迁移
echo ""
echo "🗄️  步骤 5/8: 数据库迁移..."
read -p "是否执行数据库迁移？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$BACKEND_DIR"
    # 如果使用 Alembic，取消下面注释
    # alembic upgrade head
    echo "✅ 数据库迁移完成"
else
    echo "⏭️  跳过数据库迁移"
fi

# 6. 配置 Nginx
echo ""
echo "🌐 步骤 6/8: 配置 Nginx..."
if command -v nginx &> /dev/null; then
    read -p "是否配置 Nginx？(需要 sudo 权限) (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_TARGET"

        # 创建符号链接
        if [ ! -L "$NGINX_CONF_ENABLED" ]; then
            sudo ln -s "$NGINX_CONF_TARGET" "$NGINX_CONF_ENABLED"
        fi

        # 删除默认配置
        if [ -L "/etc/nginx/sites-enabled/default" ]; then
            sudo rm "/etc/nginx/sites-enabled/default"
        fi

        # 测试 Nginx 配置
        sudo nginx -t
        if [ $? -eq 0 ]; then
            echo "✅ Nginx 配置有效"
        else
            echo "❌ Nginx 配置无效，请检查配置文件"
            exit 1
        fi
    else
        echo "⏭️  跳过 Nginx 配置"
    fi
else
    echo "⚠️  未检测到 Nginx，跳过配置"
fi

# 7. 配置 systemd 服务
echo ""
echo "⚙️  步骤 7/8: 配置 systemd 服务..."
read -p "是否配置 systemd 服务？(需要 sudo 权限) (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo cp "$PROJECT_DIR/systemd/warehouse-backend.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable warehouse-backend
    echo "✅ systemd 服务已配置"
else
    echo "⏭️  跳过 systemd 服务配置"
fi

# 8. 重启服务
echo ""
echo "🔄 步骤 8/8: 重启服务..."
read -p "是否重启服务？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 重启后端服务
    if systemctl is-active --quiet warehouse-backend; then
        sudo systemctl restart warehouse-backend
        echo "✅ 后端服务已重启"
    else
        sudo systemctl start warehouse-backend
        echo "✅ 后端服务已启动"
    fi

    # 重启 Nginx
    if command -v nginx &> /dev/null; then
        sudo systemctl reload nginx
        echo "✅ Nginx 已重新加载"
    fi

    # 检查服务状态
    echo ""
    echo "📊 服务状态："
    sudo systemctl status warehouse-backend --no-pager || true

    # 检查端口
    echo ""
    echo "🔍 端口监听状态："
    sudo netstat -tulpn | grep -E ':(80|8080)' || true
else
    echo "⏭️  跳过服务重启"
fi

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📝 后续步骤："
echo "1. 访问 http://www.rexp.top 或 http://rexp.top"
echo "2. 检查日志: sudo journalctl -u warehouse-backend -f"
echo "3. 检查 Nginx 日志: sudo tail -f /var/log/nginx/warehouse_*.log"
echo ""
echo "🛠️  常用命令："
echo "  查看后端状态: sudo systemctl status warehouse-backend"
echo "  重启后端: sudo systemctl restart warehouse-backend"
echo "  查看后端日志: sudo journalctl -u warehouse-backend -f"
echo "  重新加载 Nginx: sudo systemctl reload nginx"
echo ""
