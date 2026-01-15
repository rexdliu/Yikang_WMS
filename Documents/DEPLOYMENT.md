# Product Warehouse - 混合云部署指南

本文档详细说明如何将 Product Warehouse 项目部署到云服务器。

## 📋 部署架构

```
┌────────────────────────────────────────────────────────────────┐
│                        用户浏览器                               │
└────────────────────────────┬───────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌──────────────────────┐            ┌──────────────────────┐
│     Vercel CDN       │            │   ECS 服务器         │
│  (前端 - app.rexp.top)│ ─────────▶│  (API - api.rexp.top)│
│                      │  API 代理   │                      │
│  • React 静态资源     │            │  • FastAPI :8001    │
│  • 全球边缘节点       │            │  • Nginx :80/443    │
│  • 自动 HTTPS        │            │  • WebSocket        │
└──────────────────────┘            └──────────┬───────────┘
                                               │
                    ┌──────────────────────────┼──────────────┐
                    ▼                          ▼              ▼
         ┌──────────────────┐     ┌────────────────┐  ┌────────────┐
         │ 阿里云 RDS MySQL │     │   Dify Cloud   │  │  AMAP API  │
         │ warehouse_test   │     │  AI 报告服务    │  │  地图服务   │
         └──────────────────┘     └────────────────┘  └────────────┘
```

---

## 🔌 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80/443 | ECS 对外服务入口 |
| FastAPI | 8001 (内部) | 后端 API |
| Vite | 8080 (开发) | 本地开发 |
| MySQL | 3306 (RDS) | 阿里云 RDS |

---

## ✅ 快速部署 Checklist

### 第一部分：ECS 后端部署

```bash
# 1. SSH 登录 ECS
ssh root@your-ecs-ip

# 2. 克隆项目
cd /root
git clone https://github.com/yourusername/Yikang_WMS.git
cd Yikang_WMS

# 3. 复制并配置环境变量
cp .env.production.example .env
nano .env  # 填入实际值

# 4. 安装后端依赖
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 5. 配置 Nginx
cp nginx/warehouse.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/warehouse.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
# 编辑配置启用静态文件或代理模式
nginx -t && systemctl reload nginx

# 6. 配置 systemd 服务
cp systemd/warehouse-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable warehouse-backend
systemctl start warehouse-backend

# 7. 验证
curl http://localhost/api/v1/health
```

### 第二部分：Vercel 前端部署

1. 访问 [Vercel](https://vercel.com)，导入 GitHub 仓库
2. 配置环境变量：

| 变量名 | 值 |
|--------|-----|
| `VITE_API_URL` | `https://api.rexp.top/api/v1` |
| `VITE_WS_URL` | `wss://api.rexp.top/ws` |
| `VITE_NODE_ENV` | `production` |
| `VITE_BYPASS_AUTH` | `false` |

3. 点击 Deploy，获取 Vercel 域名
4. 配置自定义域名（Settings → Domains）

### 第三部分：Dify Cloud 配置

1. 访问 [Dify Cloud](https://cloud.dify.ai) 注册/登录
2. 创建应用，获取 API Key
3. 更新 ECS 上的 `.env`：
```bash
DIFY_API_BASE=https://api.dify.ai/v1
DIFY_API_KEY=app-your-key
```
4. 重启后端服务：`systemctl restart warehouse-backend`

---

## ⚙️ 环境配置

### .env 关键配置项

```bash
# 数据库（当前使用测试数据库）
DATABASE_URL="mysql+pymysql://rex:PASSWORD@rm-xxx.mysql.rds.aliyuncs.com:3306/warehouse_test_data"

# 密钥 - 使用 python3 -c "import secrets; print(secrets.token_urlsafe(32))" 生成
SECRET_KEY=your-generated-secret-key

# CORS - 添加 Vercel 域名
BACKEND_CORS_ORIGINS=["https://api.rexp.top", "https://app.rexp.top", "https://your-project.vercel.app"]

# Dify Cloud
DIFY_API_BASE=https://api.dify.ai/v1
DIFY_API_KEY=app-your-dify-cloud-key

# 高德地图
AMAP_KEY=your-server-key
VITE_AMAP_KEY=your-web-key
```

---

## 🌐 域名配置

### 推荐双域名配置

| 域名 | 指向 | 用途 |
|------|------|------|
| `app.rexp.top` | Vercel CNAME | 前端应用 |
| `api.rexp.top` | ECS IP (A 记录) | 后端 API |

### DNS 配置示例（阿里云）

```
app    CNAME   cname.vercel-dns.com
api    A       1.2.3.4  (你的 ECS IP)
```

### 更新 Nginx server_name

```nginx
server_name api.rexp.top;
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
nginx -t
systemctl reload nginx
tail -f /var/log/nginx/warehouse_*.log
```

---

## 🐛 故障排查

### API 请求 CORS 错误

确保 `.env` 中 `BACKEND_CORS_ORIGINS` 包含 Vercel 域名，然后重启服务。

### 502 Bad Gateway

```bash
systemctl status warehouse-backend
journalctl -u warehouse-backend -n 50
```

### Dify AI 不工作

检查 Dify Cloud API Key 是否正确配置：
```bash
grep DIFY .env
```

---

## 📁 重要路径

| 文件 | 路径 |
|------|------|
| 项目目录 | `/root/Product_Warehouse/` |
| 环境配置 | `/root/Product_Warehouse/.env` |
| Nginx 配置 | `/etc/nginx/sites-available/warehouse.conf` |
| systemd 服务 | `/etc/systemd/system/warehouse-backend.service` |
| 后端日志 | `journalctl -u warehouse-backend` |
| Nginx 日志 | `/var/log/nginx/warehouse_*.log` |

---

**最后更新**: 2026-01-15

**当前配置**:
- 前端: Vercel CDN
- 后端: ECS + Nginx
- 数据库: warehouse_test_data
- AI: Dify Cloud
