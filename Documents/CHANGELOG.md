# 变更日志 (Changelog)

记录项目的所有重要变更。

## 2025-11-10
### 更新了数据库
主要优化点：
产品表 (products) - 添加 Cummins 特定字段：

part_number: 零件号（如 "3803682"）
engine_model: 适用发动机型号（如 "6BT5.9"）
manufacturer: 制造商
unit: 单位（件/箱/升）
min_stock_level: 最低库存预警
销售订单 (sales_orders) - 添加状态跟踪：

status: pending/processing/completed/cancelled/shipped
unit_price: 单价
warehouse_id: 出货仓库
delivery_date: 交货日期
user_id: 创建人
notes: 备注
仓库 (warehouses) - 添加管理信息：

current_usage: 当前使用量（用于计算容量）
manager_name, phone: 管理员信息
经销商 (distributors) - 添加业务字段：

code: 经销商代码
email, address: 联系信息
credit_limit: 信用额度
新增活动日志表 (activity_logs):

统一记录所有系统活动
用于 Dashboard 的"最近活动"
## 2025-10-09

### 新增 (Added)
- 添加后端服务启动脚本 (start_backend.sh)
- 添加完整开发环境启动脚本 (start_dev.sh)
- 在package.json中添加npm脚本简化开发流程
  - dev:backend: 启动后端服务
  - dev:full: 同时启动前端和后端服务

## 2025-09-08

### 新增 (Added)
- 支持阿里云RDS MySQL数据库连接
- 添加PyMySQL依赖以支持MySQL连接
- 创建数据库连接测试脚本

### 修改 (Changed)
- 更新数据库配置以支持阿里云RDS MySQL
- 修改数据库连接逻辑，支持MySQL连接池配置
- 优化数据库连接URL构建方式

### 配置 (Configuration)
- 配置阿里云RDS MySQL连接参数：
  - 主机: rm-zf85fdbqq9sc8zqnh8o.mysql.kualalumpur.rds.aliyuncs.com
  - 端口: 3306
  - 用户名: REX
  - 数据库: product_warehouse

## 2025-09-02

### Improved frontend-backend integration and DX

- Backend: Added `/api/v1/health` for versioned health checks (`src/Backend/app/main.py`).
- Backend: Initialized database tables on startup for local dev using SQLite (`on_startup` in `src/Backend/app/main.py`).
- Backend: Broadened default CORS origins to include `localhost:8003` and `127.0.0.1:8003` (`src/Backend/app/core/config.py`).
- Frontend: Switched API calls to relative paths and aligned routes with backend (`/health`, `/api/v1/products`) in `src/services/api.ts`.
- Frontend: Updated `ApiTestComponent` to consume product array directly and removed non-existent `quantity` field (`src/components/ApiTestComponent.tsx`).
- Dev server: Updated Vite proxy to route `/api/v1` and `/health` to backend at `127.0.0.1:8000` (`vite.config.ts`).
- Secrets: Set `SECRET_KEY=Rex1234` and added `BACKEND_CORS_ORIGINS` to `.env`.

Notes:
- RDS MySQL is not required for these changes; local SQLite auto-creates tables during development. Replace `DATABASE_URL` when RDS is ready.
- Frontend no longer expects `quantity` on product; an inventory summary endpoint can be added later when DB is connected.

## 2024-06-15

### 新增
- 项目初始化
- 添加基础目录结构
- 添加基础组件和页面
- 添加Tailwind CSS和Shadcn UI配置
- 添加状态管理和主题配置

### 配置
- 配置Vite开发环境
- 配置TypeScript和ESLint
- 配置路径别名
- 配置开发服务器

## 2025-08-22

### 修复 (Fixes)
- 修复 TypeScript 无法找到 React 类型声明的问题，通过安装 `@types/react` 包解决
- 修复 AI 聊天机器人设置在页面刷新后丢失的问题，使用 Zustand 的 persist 中间件实现状态持久化

### 新增 (Added)
- 创建变更日志文件 CHANGELOG.md
## 2025-08-26

### 新增 (Added)
- 完善后端服务架构，包含API网关、认证、产品管理、库存、仓库操作、AI/RAG、分析和通知服务
- 添加完整的后端目录结构，包含core、api、models、schemas、crud、services、tasks和utils模块
- 实现基于FastAPI的RESTful API设计
- 集成Alembic数据库迁移工具
- 添加Celery异步任务处理框架
- 实现JWT/OAuth2认证服务
- 添加AI/RAG服务接口

### 修改 (Changed)
- 重构后端架构，采用微服务设计理念
- 优化数据库模型设计，支持产品、库存、仓库等核心业务实体
- 改进API路由结构，按功能模块组织

## 2025-08-26

### 新增 (Added)
- 添加数据库设计规范文档 (数据库规范.md)
- 完善后端API结构，包含用户、产品、库存管理模块
- 实现JWT认证和权限控制
- 添加完整的CRUD操作模板

### 新增
- 创建测试后端API服务，用于验证前后端连接
- 实现健康检查和产品数据API端点
- 创建前端API服务连接模块
- 创建API连接测试组件
- 添加生产环境部署说明文档

### 修复
- 解决Python依赖安装问题，特别是与Python 3.13兼容性相关的问题
- 成功安装pydantic和pydantic-settings包
- 修正requirements.txt文件以反映实际安装的包版本
- 配置前后端在同一端口下运行，实现无缝集成

### 配置
- 修改Vite配置，将前端端口设置为8003
- 配置代理将API请求转发到后端服务
- 修改后端服务端口为8001以避免端口冲突
- 添加静态文件服务支持，用于生产环境部署

### 验证
- 验证pydantic已正确安装 (版本 2.11.7)
- 验证pydantic-settings已正确安装
- 测试前后端连接成功，API端点可正常访问
- 前端可通过fetch API成功获取后端数据
- 前后端服务可在指定地址下运行，实现无缝集成
- 使用Playwright验证前端页面在http://localhost:8003正常运行
- 确认后端API服务在http://127.0.0.1:8000正常运行
## 2025-09-19

### 新增 (Added)
- 新增销售经销商与订单模型及 `/api/v1/sales/*` 路由，返回真实数据库数据。
- 构建轻量 RAG 知识库服务与 `/api/v1/ai/rag/query` 接口，前端 `Analytics`、`Reports` 页面可直接检索洞察。
- 提供 `database_seed.sql`，用于在 MySQL 中初始化分类、产品、库存、经销商与订单样例数据。
- 编写 `tests/test_api_endpoints.py`，覆盖登录、产品、库存、销售、RAG 及分类接口。

### 修改 (Changed)
- 统一后端用户模型与 schema，补充手机号、通知和 AI 设置 JSON 字段，修复注册/登录字段不一致问题。
- 更新 `products`、`inventory` CRUD 调用及新增产品分类列表接口，前端通过 `apiService` 直接获取实时数据。
- 重构前端 `useInventoryStore`、`useSalesStore`，移除全部模拟数据，改为调用后端 API；`Dashboard`、`Inventory` 页面支持加载状态与错误提示。
- `Reports` 与 `Analytics` 页面接入 RAG 结果展示，替换原有延迟模拟逻辑。
- 调整 SQLAlchemy 在 Python 3.13 上的兼容性检查，避免第三方库因 TypingOnly 变更导致测试运行失败。
- 侧边栏、设置页、整站默认展示文案全面汉化，统一中文体验。
- CRUD 基础类使用 `Session.get` 读取主键并补充未找到时的显式错误，解决静态类型告警并与 SQLAlchemy 2.x 风格保持一致。
- 更新库存与产品更新 Schema：`WarehouseUpdate` / `ProductCategoryUpdate` / `ProductUpdate` 改为独立的 `BaseModel`，所有字段可选，从而修复 Pylance 在继承中修改字段必填性的类型告警。
- `AIService` 对 OpenAI 客户端的调用增加精确类型注解与返回值空串兜底，消除 `str | None` 返回类型告警，并保证消息列表符合 SDK 类型要求。
- 销售 API 统一将 ORM 对象映射为 Pydantic schema 返回，避免 `List[Model]` 与 `List[Schema]` 的类型不兼容问题。

### 修复 (Fixed)
- 修复产品分类接口被动态路由覆盖导致的 422 错误，并补充单元测试验证。
- AI 服务在缺少 OpenAI Key 时返回可读的本地策略建议，避免界面出现“AI未配置”提示。
