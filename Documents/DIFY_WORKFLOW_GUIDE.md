
# Dify Workflow 配置教程

## 为什么使用 Workflow？

| 特性 | Chatbot | Workflow |
|-----|---------|----------|
| 适用场景 | 简单对话 | 复杂 RAG 场景 |
| 数据库查询 | 需要后端预处理 | 可直接调用 API |
| 流程控制 | 线性对话 | 条件分支、循环 |
| 调试能力 | 有限 | 可视化调试每步 |

**推荐**: 对于需要查询数据库的库存助手，Workflow 更适合。

---

## 架构对比

### 当前架构 (Chatbot)
```
用户输入 → 后端 API → 查询数据库 → 组装上下文 → Dify → LLM → 返回
```

### Workflow 架构
```
用户输入 → Dify Workflow:
              ├─ 意图识别 (LLM)
              ├─ HTTP Request (查询后端 API)
              ├─ 组装 Prompt
              └─ 生成回答 (LLM)
          → 返回
```

---

## 创建 Workflow 应用

### 步骤 1: 创建新应用

1. 打开 Dify 控制台: http://localhost/apps
2. 点击 **"创建应用"**
3. 选择 **"Workflow"** 类型
4. 输入名称: `益康库存助手-Workflow`
5. 点击创建

### 步骤 2: 设计 Workflow

在可视化编辑器中添加以下节点：

#### 节点 1: 开始 (Start)
- 输入变量: `query` (用户问题)

#### 节点 2: 意图分类 (LLM)
- 模型: `qwen2.5:7b`
- Prompt:
```
分析用户问题的意图，返回以下类别之一：
- inventory_overview: 库存概览
- low_stock: 低库存查询
- warehouse_distribution: 仓库分布
- sales_trend: 销售趋势
- product_search: 产品搜索
- general: 通用问题

用户问题: {{query}}

只返回类别名称，不要其他内容。
```
- 输出变量: `intent`

#### 节点 3: 条件分支 (IF/ELSE)
根据 `intent` 值选择不同的数据查询路径

#### 节点 4a: HTTP Request - 库存概览
- 方法: `GET`
- URL: `http://host.docker.internal:8001/api/v1/ai/inventory-context`
- Headers:
  ```json
  {
    "Authorization": "Bearer {{auth_token}}"
  }
  ```

#### 节点 4b: HTTP Request - 低库存
- 方法: `GET`
- URL: `http://host.docker.internal:8001/api/v1/inventory/low-stock`

#### 节点 5: 生成回答 (LLM)
- 模型: `qwen2.5:7b`
- System Prompt:
```
你是益康公司的智能库存助手。根据以下数据回答用户问题：

{{context_data}}

要求：
1. 使用中文回答
2. 数据准确，不要编造
3. 给出具体建议
```
- User Prompt: `{{query}}`

#### 节点 6: 结束 (End)
- 输出: `answer`

---

## 后端 API 准备

需要在后端添加专门为 Workflow 设计的 API：

### 添加到 `ai.py`:

```python
@router.get("/inventory-context")
async def get_inventory_context(
    intent: str = "overview",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    为 Dify Workflow 提供库存上下文数据
    """
    analyzer = InventoryAnalyzer(db)
    
    if intent == "low_stock":
        data = analyzer.get_low_stock_items(limit=10)
        return {"type": "low_stock", "data": data}
    elif intent == "warehouse_distribution":
        data = analyzer.get_inventory_by_warehouse()
        return {"type": "warehouse", "data": data}
    elif intent == "sales_trend":
        data = analyzer.get_sales_trend(days=7)
        return {"type": "sales", "data": data}
    else:
        summary = analyzer.get_context_summary()
        return {"type": "overview", "data": summary}
```

---

## Workflow 变量传递

### 1. 用户认证
在 Workflow 开始节点添加系统变量：
- `sys.user_id`: 当前用户 ID

### 2. HTTP 请求认证
方案 A: 使用服务账号 Token
```
Authorization: Bearer <service_account_token>
```

方案 B: 传递用户 Token (需要前端配合)
```
Authorization: Bearer {{user_token}}
```

---

## 发布和测试

### 步骤 1: 保存 Workflow
点击右上角 **"发布"**

### 步骤 2: 获取 API Key
1. 点击 **"访问 API"**
2. 复制 API Key

### 步骤 3: 测试 API
```bash
curl -X POST 'http://localhost/v1/workflows/run' \
  -H 'Authorization: Bearer <your-api-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {
      "query": "当前库存情况怎么样？"
    },
    "response_mode": "blocking",
    "user": "test-user"
  }'
```

---

## 前端集成

更新 `apiService.aiChat` 方法调用 Workflow API：

```typescript
async aiWorkflow(message: string, userId: string) {
  const response = await fetch(`${DIFY_API_BASE}/workflows/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: { query: message },
      response_mode: 'blocking',
      user: userId
    })
  });
  return response.json();
}
```

---

## 性能优化建议

### 1. 响应速度
- **问题**: Ollama 本地模型较慢 (8-15秒)
- **解决方案**:
  - 使用更小的模型 (`qwen2.5:3b`)
  - 切换到云端 Gemini API (需要等 Dify 修复兼容性)
  - 使用流式响应提升体验

### 2. 减少 LLM 调用
- 对于简单查询，直接返回数据库结果
- 只在需要"智能"回答时调用 LLM

### 3. 缓存策略
- 缓存库存概览数据 (5分钟过期)
- 缓存常见问题的回答

---

## 迁移步骤

1. ✅ 后端添加 `/inventory-context` API
2. ⬜ 在 Dify 创建 Workflow 应用
3. ⬜ 配置 Workflow 节点
4. ⬜ 测试 Workflow API
5. ⬜ 前端切换到 Workflow API
6. ⬜ 验证功能正常

---

## 参考资源

- [Dify Workflow 官方文档](https://docs.dify.ai/guides/workflow)
- [Dify API 参考](https://docs.dify.ai/guides/api)
