# Vercel 部署指南

本文档介绍如何将 WarehouseAI 前端部署到 Vercel，同时保持后端在 ECS 服务器上运行。

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌──────────────────┐            ┌──────────────────────┐
│   Vercel CDN     │            │    ECS 服务器        │
│   (前端静态资源)  │ ─────────▶ │   (FastAPI 后端)     │
│                  │  API 代理   │                      │
│  - React App     │            │  - /api/v1/*         │
│  - 静态资源       │            │  - WebSocket         │
│  - 全球 CDN      │            │  - 静态文件           │
└──────────────────┘            └──────────┬───────────┘
                                           │
                                           ▼
                                ┌──────────────────────┐
                                │   阿里云 RDS MySQL   │
                                └──────────────────────┘
```

## 为什么选择混合部署？

| 优势 | 说明 |
|------|------|
| **前端 CDN 加速** | Vercel 全球边缘节点，访问速度更快 |
| **自动 CI/CD** | Git 推送自动构建部署 |
| **零配置 HTTPS** | 自动 SSL 证书 |
| **后端无需改造** | FastAPI + WebSocket + 定时任务保持不变 |
| **成本优化** | 前端免费额度充足，后端按需付费 |

## 前置条件

1. GitHub/GitLab/Bitbucket 账号
2. Vercel 账号 (https://vercel.com)
3. 项目代码已推送到 Git 仓库
4. ECS 后端服务已部署并正常运行

## 部署步骤

### 步骤 1: 准备项目

确保项目根目录包含以下文件：

```
Product_Warehouse/
├── vercel.json          # Vercel 配置文件（已创建）
├── package.json         # 包含 build 脚本
├── vite.config.ts       # Vite 配置
└── ...
```

### 步骤 2: 登录 Vercel

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub/GitLab/Bitbucket 账号登录
3. 点击 "Add New Project"

### 步骤 3: 导入项目

1. 选择 "Import Git Repository"
2. 选择 `Product_Warehouse` 仓库
3. Vercel 会自动检测为 Vite 项目

### 步骤 4: 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_API_URL` | `https://api.rexp.top/api/v1` | 后端 API 地址 |
| `VITE_WS_URL` | `wss://api.rexp.top/ws` | WebSocket 地址 |
| `VITE_BASE_URL` | `/` | 基础路径 |
| `VITE_NODE_ENV` | `production` | 环境标识 |
| `VITE_BYPASS_AUTH` | `false` | 禁用认证绕过 |

**设置方法：**
1. 进入项目 Dashboard
2. 点击 "Settings" → "Environment Variables"
3. 添加上述变量
4. 选择适用环境（Production / Preview / Development）

### 步骤 5: 配置构建设置

Vercel 通常会自动检测，如需手动配置：

| 设置项 | 值 |
|--------|-----|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 18.x 或 20.x |

### 步骤 6: 部署

1. 点击 "Deploy" 按钮
2. 等待构建完成（通常 1-3 分钟）
3. 获取 Vercel 分配的域名（如 `your-project.vercel.app`）

### 步骤 7: 配置后端 CORS

在 ECS 后端的 `.env.production` 中添加 Vercel 域名：

```env
BACKEND_CORS_ORIGINS=["https://www.rexp.top", "https://rexp.top", "https://your-project.vercel.app"]
```

然后重启后端服务：

```bash
sudo systemctl restart warehouse-backend
```

## 自定义域名配置

### 在 Vercel 添加域名

1. 进入项目 "Settings" → "Domains"
2. 添加你的域名（如 `app.rexp.top`）
3. 按照提示配置 DNS

### DNS 配置

在你的域名服务商（如阿里云）添加记录：

**方式一：CNAME（推荐）**
```
类型: CNAME
主机记录: app
记录值: cname.vercel-dns.com
```

**方式二：A 记录**
```
类型: A
主机记录: app
记录值: 76.76.21.21
```

## vercel.json 配置说明

```json
{
  "buildCommand": "npm run build",     // 构建命令
  "outputDirectory": "dist",           // 输出目录
  "framework": "vite",                 // 框架类型
  "rewrites": [
    {
      "source": "/api/:path*",         // API 请求代理到后端
      "destination": "https://api.rexp.top/api/:path*"
    },
    {
      "source": "/static/:path*",      // 静态文件代理
      "destination": "https://api.rexp.top/static/:path*"
    },
    {
      "source": "/((?!api|static).*)", // SPA 路由回退
      "destination": "/index.html"
    }
  ]
}
```

## 环境配置对比

| 配置项 | ECS 部署 | Vercel 部署 |
|--------|----------|-------------|
| `VITE_API_URL` | `/api/v1` | `https://api.rexp.top/api/v1` |
| `VITE_WS_URL` | `wss://api.rexp.top/ws` | `wss://api.rexp.top/ws` |
| API 代理 | Nginx 反向代理 | vercel.json rewrites |
| HTTPS | 手动配置证书 | 自动配置 |
| CDN | 无/需单独配置 | 自动全球 CDN |

## 常见问题

### Q1: API 请求失败 (CORS 错误)

**原因**：后端未配置 Vercel 域名的 CORS

**解决**：
1. 在后端 `.env.production` 添加 Vercel 域名到 `BACKEND_CORS_ORIGINS`
2. 重启后端服务

### Q2: WebSocket 连接失败

**原因**：Vercel 不支持 WebSocket 代理

**解决**：前端直接连接后端 WebSocket 地址
```typescript
// 确保 VITE_WS_URL 指向后端服务器
const ws = new WebSocket(import.meta.env.VITE_WS_URL);
```

### Q3: 页面刷新 404

**原因**：SPA 路由未正确配置

**解决**：确保 `vercel.json` 包含 SPA 回退规则：
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Q4: 构建失败

**常见原因及解决方案**：

1. **Node 版本不兼容**
   - 在 Vercel 设置中指定 Node.js 18.x 或 20.x

2. **依赖安装失败**
   ```bash
   # 本地测试构建
   npm ci
   npm run build
   ```

3. **TypeScript 类型错误**
   ```bash
   # 本地检查
   npm run type-check
   ```

### Q5: 环境变量不生效

**注意**：Vite 只会暴露 `VITE_` 前缀的环境变量

**检查**：
1. 变量名必须以 `VITE_` 开头
2. 添加/修改环境变量后需要重新部署

## 回滚部署

如果新版本有问题，可以快速回滚：

1. 进入项目 "Deployments" 页面
2. 找到之前的稳定版本
3. 点击 "..." → "Promote to Production"

## CI/CD 自动部署

Vercel 默认配置：

| 分支 | 部署环境 |
|------|----------|
| `main` / `master` | Production |
| 其他分支 | Preview |
| Pull Request | Preview |

### 跳过自动部署

在 commit message 中添加 `[skip ci]` 或 `[vercel skip]`

## 监控与日志

### 查看构建日志

1. 进入 "Deployments"
2. 点击具体部署记录
3. 查看 "Building" 日志

### 查看运行时日志

1. 进入 "Logs" 页面
2. 筛选时间范围和日志级别

### 性能分析

1. 进入 "Analytics" 页面（需要 Pro 计划）
2. 查看 Web Vitals 指标

## 成本说明

### Vercel 免费额度（Hobby Plan）

| 资源 | 限制 |
|------|------|
| 带宽 | 100 GB/月 |
| 构建时间 | 6000 分钟/月 |
| Serverless 执行 | 100 GB-小时/月 |
| 部署次数 | 无限制 |

对于前端静态站点，免费额度通常足够使用。

## 最佳实践

1. **使用环境变量**：敏感信息不要提交到代码仓库
2. **设置 Preview 环境**：测试分支使用 Preview 部署
3. **配置构建缓存**：加速后续构建
4. **监控 Web Vitals**：关注页面性能指标
5. **定期检查日志**：及时发现问题

## 相关文档

- [Vercel 官方文档](https://vercel.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html#vercel)
- [ECS 部署指南](../deploy.sh) - 后端部署脚本
