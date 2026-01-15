# Product Warehouse - Alibaba Cloud Linux 部署指南

ECS 服务器 (Alibaba Cloud Linux) 后端部署指南。

## 🖥️ 系统要求

- **操作系统**: Alibaba Cloud Linux 3 / 2
- **CPU**: 2核+
- **内存**: 4GB+
- **磁盘**: 20GB+

---

## 🚀 快速部署 (一键脚本)

```bash
# SSH 登录 ECS
ssh root@your-ecs-ip

# 克隆项目
cd /root
git clone https://github.com/rexdliu/Yikang_WMS.git Product_Warehouse
cd Product_Warehouse

# 配置环境变量
cp .env.production.example .env
nano .env  # 填入实际值

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

---

## 📝 手动部署步骤

### 1. 安装系统依赖

```bash
# 更新系统
dnf update -y

# 安装 Python 3.9+
dnf install -y python3 python3-pip python3-devel

# 安装 Node.js 18
dnf install -y nodejs npm
# 或使用 nvm 安装指定版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 安装 Nginx
dnf install -y nginx

# 安装 Git
dnf install -y git

# 安装构建工具 (如需编译依赖)
dnf groupinstall -y "Development Tools"
dnf install -y mysql-devel

# 验证安装
python3 --version  # >= 3.9
node --version     # >= 18
nginx -v
```

### 2. 克隆项目

```bash
cd /root
git clone https://github.com/rexdliu/Yikang_WMS.git Product_Warehouse
cd Product_Warehouse
```

### 3. 配置环境变量

```bash
cp .env.production.example .env
nano .env
```

**必须配置项：**

```bash
# 数据库
DATABASE_URL="mysql+pymysql://rex:PASSWORD@rm-xxx.mysql.rds.aliyuncs.com:3306/warehouse_test_data"

# 密钥 - 生成: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-generated-key

# CORS
BACKEND_CORS_ORIGINS=["https://api.rexp.top", "https://www.rexp.top", "https://app.rexp.top", "https://yikang-wms.vercel.app"]

# 高德地图
AMAP_KEY=your-key
VITE_AMAP_KEY=your-key

# Dify (可选，稍后配置)
# DIFY_API_BASE=https://api.dify.ai/v1
# DIFY_API_KEY=app-your-key
```

### 4. 安装后端依赖

```bash
cd /root/Product_Warehouse

# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 升级 pip
pip install --upgrade pip

# 安装依赖
pip install -r requirements.txt
```

### 5. 配置 Nginx

```bash
# 复制配置
cp nginx/warehouse.conf /etc/nginx/conf.d/warehouse.conf

# 删除默认配置 (如果存在)
rm -f /etc/nginx/conf.d/default.conf

# 测试配置
nginx -t

# 启动 Nginx
systemctl enable nginx
systemctl start nginx
```

> **注意**: Alibaba Cloud Linux 使用 `/etc/nginx/conf.d/` 目录，不是 `sites-available`

### 6. 配置 systemd 服务

```bash
# 复制服务文件
cp systemd/warehouse-backend.service /etc/systemd/system/

# 重新加载
systemctl daemon-reload

# 启用并启动
systemctl enable warehouse-backend
systemctl start warehouse-backend

# 检查状态
systemctl status warehouse-backend
```

### 7. 配置防火墙

```bash
# 检查防火墙状态
systemctl status firewalld

# 如果启用，开放端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# 或直接关闭防火墙 (不推荐生产环境)
# systemctl stop firewalld
# systemctl disable firewalld
```

### 8. 验证部署

```bash
# 测试后端
curl http://localhost:8001/api/v1/health

# 测试 Nginx 代理
curl http://localhost/api/v1/health

# 查看日志
journalctl -u warehouse-backend -f
```

---

## 🔧 服务管理

```bash
# 后端服务
systemctl start warehouse-backend
systemctl stop warehouse-backend
systemctl restart warehouse-backend
systemctl status warehouse-backend
journalctl -u warehouse-backend -f

# Nginx
systemctl start nginx
systemctl reload nginx
tail -f /var/log/nginx/warehouse_access.log
tail -f /var/log/nginx/warehouse_error.log
```

---

## 🐛 常见问题

### Python 版本过低

```bash
# 安装 Python 3.11
dnf install -y python3.11
alternatives --set python3 /usr/bin/python3.11
```

### pip 安装失败

```bash
# 安装编译依赖
dnf install -y gcc python3-devel mysql-devel
```

### Nginx 502 Bad Gateway

```bash
# 检查后端是否运行
systemctl status warehouse-backend
journalctl -u warehouse-backend -n 50

# 检查端口
ss -tlnp | grep 8001
```

### SELinux 阻止连接

```bash
# 检查 SELinux 状态
getenforce

# 临时禁用
setenforce 0

# 永久禁用
sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config

# 或允许 Nginx 网络连接
setsebool -P httpd_can_network_connect 1
```

---

## 📁 重要路径

| 文件 | 路径 |
|------|------|
| 项目目录 | `/root/Product_Warehouse/` |
| 环境配置 | `/root/Product_Warehouse/.env` |
| Nginx 配置 | `/etc/nginx/conf.d/warehouse.conf` |
| systemd 服务 | `/etc/systemd/system/warehouse-backend.service` |
| Nginx 日志 | `/var/log/nginx/` |
| 后端日志 | `journalctl -u warehouse-backend` |

---

## 🔐 安全配置 (可选)

### 配置 HTTPS

```bash
# 安装 Certbot
dnf install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d api.rexp.top

# 自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" >> /etc/crontab
```

---

**最后更新**: 2026-01-15
