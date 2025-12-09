# WarehouseAI - 智能仓库管理系统

<p align="center">
  <img src="src/assets/chatBot.svg" width="100" alt="WarehouseAI Logo" />
</p>

WarehouseAI 是一个现代化的仓库管理系统，集成了人工智能助手，帮助仓库经理和操作员更高效地管理库存、处理订单和获取数据洞察。

## 🌟 核心功能

### 1. 仪表板 (Dashboard)
- 实时库存指标监控
- 库存状态可视化图表
- 关键性能指标展示
- 快速操作入口

### 2. 库存管理 (Inventory Management)
- 产品信息管理
- 库存水平实时跟踪
- 库存状态分类 (正常/低库存/缺货)
- 产品搜索和筛选

### 3. AI 助手 (AI Assistant) ✨
- 智能库存查询和分析
- 需求预测和建议
- 自然语言交互界面
- 文件上传分析支持
- 语音输入功能
- 主动洞察和建议

### 4. 报告系统 (Reports)
- 库存报告生成
- 销售数据分析
- Text-to-SQL 查询功能
- 可视化图表展示

### 5. 设置管理 (Settings)
- 个人资料管理
- 主题和外观设置
- AI助手配置
- 通知偏好设置
- 安全设置
- 第三方集成配置

## 🛠 技术栈

### 前端技术栈
- **框架**: React 18, TypeScript, Vite
- **UI 组件库**: shadcn/ui, Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router v6
- **数据可视化**: Chart.js
- **图标**: Lucide React

### 后端技术栈
- **框架**: FastAPI (Python)
- **数据库**: SQLite (默认) / PostgreSQL (可选)
- **ORM**: SQLAlchemy
- **认证**: JWT/OAuth2
- **异步任务**: Celery + Redis
- **AI服务**: OpenAI API / 类似服务
- **数据库迁移**: Alembic

## 🚀 快速开始

### 前置要求

- **Node.js**: 18+
- **Python**: 3.9+
- **阿里云 RDS MySQL**: 8.0+（推荐）
- **Git**: 最新版本

---

### 开发环境搭建

#### 1. 克隆项目

```bash
git clone https://github.com/yourusername/Product_Warehouse.git
cd Product_Warehouse
```

#### 2. 配置数据库（重要！）

本项目使用**阿里云 RDS MySQL**，在同一个 RDS 实例上创建两个数据库：

- `warehouse_test_data` - 开发/测试数据库
- `warehouse_product` - 生产数据库

**创建数据库：**

```sql
-- 登录你的阿里云 RDS MySQL
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com -u username -p

-- 创建测试数据库
CREATE DATABASE warehouse_test_data CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建生产数据库
CREATE DATABASE warehouse_product CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 验证
SHOW DATABASES;
```

#### 3. 配置开发环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**填入你的配置：**

```bash
# 开发环境 - 使用测试数据库
DATABASE_URL=mysql+pymysql://username:password@rm-xxxxx.mysql.rds.aliyuncs.com:3306/warehouse_test_data

# 开发密钥（仅测试使用）
SECRET_KEY=dev-secret-key-for-testing-only

# 允许本地访问
BACKEND_CORS_ORIGINS=["http://localhost:8003", "http://127.0.0.1:8003"]

# 开启调试
DEBUG=True
LOG_LEVEL=DEBUG
```

#### 4. 安装依赖

```bash
# 安装前端依赖
npm install

# 创建并激活 Python 虚拟环境
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate    # Windows

# 安装后端依赖
pip install --upgrade pip
pip install -r requirements.txt
```

#### 5. 启动开发环境

**方式一：使用脚本启动（推荐）**

```bash
# 同时启动前端和后端
./start_dev.sh
```

**方式二：分别启动服务**

```bash
# 启动后端 (终端1)
source .venv/bin/activate
./start_backend.sh

# 启动前端 (终端2)
npm run dev
```

#### 6. 访问应用

- 前端: http://localhost:8003
- 后端 API: http://localhost:8001
- API 文档: http://localhost:8001/docs

---

### 环境切换

本项目支持开发和生产两个环境：

| 环境 | 配置文件 | 数据库 | 用途 |
|------|----------|--------|------|
| **开发** | `.env` | `warehouse_test_data` | 开发和测试 |
| **生产** | `.env.production` | `warehouse_product` | 生产运营 |

**切换到开发环境：**

```bash
# 使用 .env 配置文件
cp .env.example .env
nano .env  # 编辑配置
./start_dev.sh
```

**切换到生产环境：**

```bash
# 使用 .env.production 配置文件
cp .env.production.example .env.production
nano .env.production  # 编辑配置（⚠️ 必须使用强密钥！）
./deploy.sh
```

**环境配置对照：**

```bash
# 开发环境 (.env)
DATABASE_URL=mysql+pymysql://user:pass@rds-host/warehouse_test_data
DEBUG=True
LOG_LEVEL=DEBUG

# 生产环境 (.env.production)
DATABASE_URL=mysql+pymysql://user:pass@rds-host/warehouse_product
DEBUG=False
LOG_LEVEL=INFO
```

---

### 生产环境部署

详细的部署说明请参见：

- 📘 **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 完整的部署指南
- 📘 **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - 数据库设计文档
- 📘 **[BUSINESS_WORKFLOW.md](./BUSINESS_WORKFLOW.md)** - 业务流程说明

**快速部署命令：**

```bash
# 配置生产环境变量
cp .env.production.example .env.production
nano .env.production

# 运行自动化部署脚本
./deploy.sh
```

---

## 📋 功能实现状态

### 前端已完成功能
- [x] 响应式布局和现代化UI设计
- [x] 完整的路由系统
- [x] 所有页面的静态界面实现
- [x] 客户端状态管理 (Zustand)
- [x] AI助手界面和交互
- [x] 设置页面完整功能界面
- [x] 可拖拽AI助手组件

### 后端已完成功能
- [x] 微服务架构设计
- [x] 用户认证和授权系统
- [x] 数据持久化 (数据库集成)
- [x] 完整的RESTful API
- [x] 数据库迁移框架
- [x] 异步任务处理框架

### 需要完善的后端功能
- [ ] AI服务集成 (OpenAI/类似服务)
- [ ] 文件上传和处理服务
- [ ] 语音识别服务
- [ ] 实时通知推送 (WebSocket)
- [ ] 第三方服务集成API

## 🎯 详细功能说明

### AI助手配置和使用

AI助手是WarehouseAI的核心功能之一，提供了智能化的仓库管理辅助。

#### 前端功能:
- 可拖拽的悬浮AI助手按钮
- 完整的聊天界面，支持文本输入、文件上传和语音输入
- AI助手启用/禁用控制
- 聊天历史记录显示
- 快速操作建议
- 主动洞察提示

#### 后端需要实现:
- AI服务集成 (如OpenAI、Google AI等)
- 自然语言处理和Text-to-SQL转换
- 聊天历史存储和查询API
- 文件上传处理服务
- 语音识别服务
- 实时响应推送

#### 使用说明:
1. 在设置页面启用AI助手功能
2. 点击界面右下角的AI助手按钮打开聊天窗口
3. 输入自然语言查询库存、需求预测等信息
4. 可上传文件进行内容分析
5. 可使用语音输入功能进行语音查询

### 设置页面功能

设置页面允许用户自定义系统行为和个人偏好。

#### 已实现的前端功能:
- 个人资料管理 (头像上传、基本信息)
- 仓库配置 (仓库信息、时区、温度单位)
- AI助手配置 (启用开关、响应速度等)
- 通知偏好设置 (邮件、推送、短信等)
- 外观设置 (主题、界面选项)
- 安全设置 (密码、两步验证、API密钥)
- 第三方集成配置
- 设置保存和恢复功能

#### 需要完善的后端功能:
- 用户资料持久化存储
- 设置参数持久化存储
- 密码修改和安全验证
- API密钥生成和管理
- 第三方服务集成接口
- 通知推送服务

## 📞 联系方式

项目维护者: [Your Name]
项目仓库: [Repository URL]

## 🏗 后端架构

后端采用微服务架构设计，包含以下核心服务:

```
logistics_warehouse/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI主入口
│   ├── core/                   # 核心配置
│   │   ├── __init__.py
│   │   ├── config.py           # 配置管理
│   │   ├── security.py         # 安全/认证
│   │   ├── database.py         # 数据库连接
│   │   └── dependencies.py     # 依赖注入
│   │
│   ├── api/                    # API路由
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # 认证接口
│   │   │   ├── products.py     # 产品管理
│   │   │   ├── inventory.py    # 库存管理
│   │   │   ├── warehouse.py    # 仓库管理
│   │   │   ├── analytics.py    # 数据分析
│   │   │   └── ai_rag.py       # AI RAG接口
│   │   └── deps.py             # API依赖
│   │
│   ├── models/                 # 数据模型
│   │   ├── __init__.py
│   │   ├── product.py
│   │   ├── inventory.py
│   │   ├── warehouse.py
│   │   └── user.py
│   │
│   ├── schemas/                # Pydantic模型
│   │   ├── __init__.py
│   │   ├── product.py
│   │   ├── inventory.py
│   │   ├── warehouse.py
│   │   └── response.py
│   │
│   ├── crud/                   # CRUD操作
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── product.py
│   │   ├── inventory.py
│   │   └── warehouse.py
│   │
│   ├── services/               # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── product_service.py
│   │   ├── inventory_service.py
│   │   ├── warehouse_service.py
│   │   ├── analytics_service.py
│   │   └── rag_service.py
│   │
│   ├── tasks/                  # Celery异步任务
│   │   ├── __init__.py
│   │   ├── celery_app.py
│   │   ├── inventory_tasks.py
│   │   └── analytics_tasks.py
│   │
│   └── utils/                  # 工具函数
│       ├── __init__.py
│       ├── hologres.py
│       ├── cache.py
│       └── exceptions.py
│
├── alembic/                    # 数据库迁移
├── tests/                      # 测试
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env
```

核心服务模块:
1. **API网关服务** (API Gateway Service) - 统一入口管理
2. **认证服务** (Authentication Service) - JWT/OAuth2认证
3. **产品管理服务** (Product Management Service) - 产品信息维护
4. **库存服务** (Inventory Service) - 库存水平跟踪
5. **仓库操作服务** (Warehouse Operations Service) - 入库/出库管理
6. **AI/RAG服务** (AI/RAG Service) - 智能问答接口
7. **分析服务** (Analytics Service) - 数据分析
8. **通知服务** (Notification Service) - 实时消息推送

## 📄 许可证

本项目仅供学习和参考使用。