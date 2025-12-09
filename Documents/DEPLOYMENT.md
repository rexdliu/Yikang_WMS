# Product Warehouse - 生产环境部署指南

本文档详细说明如何将 Product Warehouse 项目部署到生产环境。

## 📋 目录

1. [系统要求](#系统要求)
2. [部署架构](#部署架构)
3. [数据库配置](#数据库配置)
4. [环境配置和切换](#环境配置和切换)
5. [快速部署](#快速部署)
6. [手动部署步骤](#手动部署步骤)
7. [配置说明](#配置说明)
8. [服务管理](#服务管理)
9. [故障排查](#故障排查)
10. [安全建议](#安全建议)

---

## 🖥️ 系统要求

### 硬件要求
- **CPU**: 2核及以上
- **内存**: 4GB 及以上
- **磁盘**: 20GB 及以上

### 软件要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Python**: 3.9+
- **Node.js**: 18+
- **Nginx**: 1.18+
- **MySQL**: 8.0+ (推荐使用阿里云 RDS)

---

## 🏗️ 部署架构

```
用户请求 (80/443)
    ↓
┌─────────────────────┐
│   Nginx (80/443)    │
│  反向代理 + 负载均衡  │
└─────────────────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
┌─────────┐  ┌──────────────┐
│ 前端静态 │  │ 后端 API      │
│ 文件/dev │  │ (uvicorn)    │
│ (8003)  │  │ (127.0.0.1:  │
│         │  │  8001)       │
└─────────┘  └──────────────┘
                    ↓
            ┌──────────────┐
            │ 阿里云 RDS    │
            │ MySQL 8.0    │
            └──────────────┘
```

### 端口分配

| 服务 | 开发端口 | 生产端口 | 说明 |
|------|---------|---------|------|
| Nginx | - | 80/443 | 对外服务 |
| 前端 | 8003 | 8003 (内部) 或静态文件 | 通过 Nginx 代理 |
| 后端 API | 8001 | 8001 (内部) | 通过 Nginx 代理 |
| MySQL | 3306 | 3306 (RDS) | 数据库服务 |

---

## 🗄️ 数据库配置

### 数据库架构（推荐方案）

**使用同一个阿里云 RDS MySQL 实例，创建两个数据库：**

```
阿里云 RDS MySQL (rm-xxxxx.mysql.rds.aliyuncs.com)
│
├── warehouse_test_data  (开发/测试数据库)
│   ├── 用途：开发和测试
│   ├── 数据：测试数据（可随时重置）
│   └── 配置文件：.env
│
└── warehouse_product    (生产数据库)
    ├── 用途：生产环境
    ├── 数据：真实业务数据
    └── 配置文件：.env.production
```

**优势**：
- ✅ 环境一致（都是 MySQL），无兼容性问题
- ✅ 数据完全隔离，测试不会影响生产
- ✅ 使用同一个 RDS 实例，管理方便
- ✅ 可以随时重置测试数据库

### 创建数据库

登录阿里云 RDS 控制台，或使用 MySQL 客户端：

```sql
-- 登录 RDS
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com -u username -p

-- 创建测试数据库
CREATE DATABASE warehouse_test_data
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 创建生产数据库
CREATE DATABASE warehouse_product
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 验证
SHOW DATABASES;
```

---

## 🔄 环境配置和切换

### 开发环境配置

**步骤 1: 复制配置文件**
```bash
cp .env.example .env
```

**步骤 2: 编辑 .env 文件**
```bash
nano .env
```

**配置内容**：
```bash
# 开发环境 - 使用测试数据库
DATABASE_URL=mysql+pymysql://username:password@rm-xxxxx.mysql.rds.aliyuncs.com:3306/warehouse_test_data

# 开发环境可以使用简单密钥
SECRET_KEY=dev-secret-key-for-testing-only

# 允许本地访问
BACKEND_CORS_ORIGINS=["http://localhost:8003", "http://127.0.0.1:8003"]

# 开启调试模式
DEBUG=True
LOG_LEVEL=DEBUG
```

**步骤 3: 启动开发环境**
```bash
# 启动后端
source .venv/bin/activate
./start_backend.sh

# 启动前端（新终端）
npm run dev
```

---

### 生产环境配置

**步骤 1: 复制配置文件**
```bash
cp .env.production.example .env.production
```

**步骤 2: 编辑 .env.production 文件**
```bash
nano .env.production
```

**配置内容**：
```bash
# 生产环境 - 使用生产数据库
DATABASE_URL=mysql+pymysql://username:password@rm-xxxxx.mysql.rds.aliyuncs.com:3306/warehouse_product

# ⚠️ 必须使用强密钥！
# 生成命令: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-super-strong-production-secret-key

# 只允许生产域名
BACKEND_CORS_ORIGINS=["https://www.rexp.top", "https://rexp.top"]

# ⚠️ 关闭调试模式
DEBUG=False
LOG_LEVEL=INFO
```

**步骤 3: 部署到生产环境**
```bash
# 使用自动化脚本
./deploy.sh
```

---

### 环境切换对照表

| 项目 | 开发环境 | 生产环境 |
|------|----------|----------|
| **配置文件** | `.env` | `.env.production` |
| **数据库** | `warehouse_test_data` | `warehouse_product` |
| **SECRET_KEY** | 简单密钥（仅测试） | 强密钥（必须） |
| **DEBUG** | `True` | `False` |
| **LOG_LEVEL** | `DEBUG` | `INFO` |
| **CORS** | 允许 localhost | 只允许生产域名 |
| **数据** | 测试数据（可重置） | 真实数据（谨慎操作） |

---

### 如何切换环境

#### 方法 1: 使用不同的配置文件

```bash
# 开发环境
export ENV_FILE=.env
source .venv/bin/activate
uvicorn app.main:app --reload

# 生产环境
export ENV_FILE=.env.production
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

#### 方法 2: 使用脚本

```bash
# 开发环境
./start_dev.sh

# 生产环境
./deploy.sh
```

#### 方法 3: 直接指定数据库 URL

```bash
# 临时使用测试数据库
export DATABASE_URL="mysql+pymysql://user:pass@rm-xxxxx.mysql.rds.aliyuncs.com:3306/warehouse_test_data"
python your_script.py

# 临时使用生产数据库
export DATABASE_URL="mysql+pymysql://user:pass@rm-xxxxx.mysql.rds.aliyuncs.com:3306/warehouse_product"
python your_script.py
```

---

## 🚀 快速部署

### 使用自动化脚本（推荐）

```bash
# 1. 克隆项目（如果还没有）
git clone https://github.com/yourusername/Product_Warehouse.git
cd Product_Warehouse

# 2. 配置环境变量
cp .env.production.example .env.production
nano .env.production  # 修改数据库连接、密钥等配置

# 3. 运行部署脚本
./deploy.sh
```

---

## 📝 手动部署步骤

### 步骤 1: 准备环境

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要的软件
sudo apt install -y python3 python3-venv python3-pip nodejs npm nginx git

# 验证安装
python3 --version  # 应该是 3.9+
node --version     # 应该是 18+
nginx -v
```

### 步骤 2: 克隆项目

```bash
cd /home/user
git clone https://github.com/yourusername/Product_Warehouse.git
cd Product_Warehouse
```

### 步骤 3: 配置环境变量

```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑环境变量（重要！）
nano .env.production
```

**必须修改的配置：**
- `DATABASE_URL`: 阿里云 RDS MySQL 连接字符串
- `SECRET_KEY`: 随机生成的安全密钥
- `BACKEND_CORS_ORIGINS`: 允许的前端域名

生成安全密钥：
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 步骤 4: 构建前端

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建产物位于 dist/ 目录
```

### 步骤 5: 安装后端依赖

```bash
# 创建 Python 虚拟环境
python3 -m venv .venv

# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt
```

### 步骤 6: 配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp nginx/warehouse.conf /etc/nginx/sites-available/

# 创建符号链接
sudo ln -s /etc/nginx/sites-available/warehouse.conf /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 步骤 7: 配置 systemd 服务

```bash
# 复制服务文件
sudo cp systemd/warehouse-backend.service /etc/systemd/system/

# 重新加载 systemd
sudo systemctl daemon-reload

# 启用开机自启
sudo systemctl enable warehouse-backend

# 启动服务
sudo systemctl start warehouse-backend

# 检查状态
sudo systemctl status warehouse-backend
```

---

## ⚙️ 配置说明

### 环境变量详解

#### 后端环境变量 (.env.production)

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | ✅ |
| `SECRET_KEY` | JWT 签名密钥 | ✅ |
| `BACKEND_CORS_ORIGINS` | 允许的跨域源 | ✅ |

### 数据库连接字符串格式

**阿里云 RDS MySQL:**
```
mysql+pymysql://username:password@rm-xxxxxxx.mysql.rds.aliyuncs.com:3306/database_name
```

---

## 🔧 服务管理

### 后端服务管理

```bash
# 启动服务
sudo systemctl start warehouse-backend

# 停止服务
sudo systemctl stop warehouse-backend

# 重启服务
sudo systemctl restart warehouse-backend

# 查看状态
sudo systemctl status warehouse-backend

# 查看日志
sudo journalctl -u warehouse-backend -f
```

### Nginx 管理

```bash
# 测试配置
sudo nginx -t

# 重新加载配置
sudo systemctl reload nginx

# 查看访问日志
sudo tail -f /var/log/nginx/warehouse_access.log

# 查看错误日志
sudo tail -f /var/log/nginx/warehouse_error.log
```

---

## 🐛 故障排查

### 常见问题

#### 1. 502 Bad Gateway

**解决：**
```bash
# 检查后端服务状态
sudo systemctl status warehouse-backend

# 查看后端日志
sudo journalctl -u warehouse-backend -n 50
```

#### 2. 数据库连接失败

**解决：**
```bash
# 检查环境变量
cat .env.production | grep DATABASE_URL

# 测试数据库连接
mysql -h rm-xxxxxxx.mysql.rds.aliyuncs.com -u username -p
```

---

## 🔒 安全建议

### 1. 使用 HTTPS

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d www.rexp.top -d rexp.top
```

### 2. 修改默认密钥

```bash
# 生成安全的 SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. 防火墙配置

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

**最后更新**: 2025-11-10
