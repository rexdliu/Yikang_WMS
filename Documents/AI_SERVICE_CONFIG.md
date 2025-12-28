# AI 服务配置指南

## 当前配置（本地 Ollama）

目前使用 **Ollama + Qwen2.5** 作为 AI 服务，通过 Dify 平台集成。

### 配置信息

| 配置项 | 值 |
|-------|-----|
| 模型供应商 | Ollama |
| 模型 | qwen2.5:7b |
| Ollama Base URL | `http://host.docker.internal:11434` |
| Dify Base URL | `http://localhost/v1` |
| Dify API Key | `app-bl0lXJ6dC4a6jP0jgWF0DOTM` |

### 启动命令

```bash
# 1. 启动 Ollama
ollama serve

# 2. 启动 Dify
cd /Users/liu/Desktop/dify-deploy/docker && docker compose up -d

# 3. 启动仓库系统
cd /Users/liu/Desktop/Yikang\ product_warehouse && npm run dev:full
```

---

## 未来迁移：切换到云端 Gemini

> ⚠️ **待办**：当 Dify 修复 Gemini 兼容性问题后，执行以下步骤切换到云端 AI。

### 迁移时机

- Dify 发布新版本修复 Gemini multimodal output bug
- 或需要更强的 AI 能力时

### 迁移步骤

1. **升级 Dify**
   ```bash
   cd /Users/liu/Desktop/dify-deploy/docker
   git pull origin main
   docker compose pull
   docker compose up -d
   ```

2. **配置 Gemini**
   - 打开 http://localhost → 设置 → 模型供应商
   - 添加 Google Gemini
   - API Key: `AIzaSyBzuIoxQoYV4Dfa1Z01-naeC0eYZasrbR4`

3. **切换应用模型**
   - 工作室 → Yikang 应用
   - 模型设置 → 选择 `gemini-2.0-flash`
   - 保存并发布

4. **测试验证**
   - 在 AI 助手页面测试对话功能
   - 确认响应正常后，可关闭 Ollama

### 迁移后清理

```bash
# 停止 Ollama
pkill ollama

# 删除 Ollama 模型（可选）
ollama rm qwen2.5:7b
```

---

## 对比

| 特性 | Ollama (当前) | Gemini (未来) |
|-----|--------------|--------------|
| 运行位置 | 本地 | 云端 |
| 费用 | 免费 | 按量计费 |
| 响应速度 | 取决于硬件 | 较快 |
| 中文能力 | ★★★★★ | ★★★★☆ |
| 离线可用 | ✅ | ❌ |
