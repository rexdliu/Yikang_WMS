# RAG Chatbot 智能库存助手实现方案

## 项目概述

为益康仓储管理系统构建一个智能 RAG (Retrieval-Augmented Generation) 聊天机器人，能够：
- 从数据库实时分析库存状态
- 提供 AI 监控和预警功能
- 支持浮动聊天窗口和独立 AI 助手页面

---

## 功能需求分析

### 1. 库存数据分析与查询
- 实时查询库存状态、库存周转率、库存金额
- 查询特定产品/仓库的库存详情
- 分析销售趋势和库存变化

### 2. AI 监控与预警
- 库存不足自动预警
- 基于历史数据预测下周需求
- 生成周报/月报
- 异常检测（突然的库存变化等）

### 3. 聊天界面
- 浮动聊天气泡 (Float Chatbot)
- AI 助手独立页面 (已有 `/ai-assistant` 路由)

---

## 技术方案：Dify + FastAPI 混合架构

### 为什么选择 Dify？

| 特性 | 优势 |
|-----|------|
| **可视化编排** | 无需编码，拖拽式创建 AI 工作流 |
| **RAG 内置** | 自带知识库、向量检索功能 |
| **多 LLM 支持** | OpenAI、通义千问、Claude 等一键切换 |
| **API 即用** | 每个应用自动生成 API，前端直接调用 |
| **对话管理** | 自动管理对话历史和上下文 |

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │ Float Chatbot   │    │  AI Assistant Page          │ │
│  └────────┬────────┘    └──────────────┬──────────────┘ │
└───────────┼─────────────────────────────┼───────────────┘
            │                             │
            ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Backend (Proxy + Data)              │
│  ┌─────────────────────────────────────────────────────┐│
│  │  /api/v1/ai/chat      → 转发到 Dify API             ││
│  │  /api/v1/ai/analyze   → 本地库存分析               ││
│  │  /api/v1/ai/context   → 提供实时库存数据给 Dify    ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│    Dify Platform    │     │      MySQL Database         │
│  ┌───────────────┐  │     │  - products                 │
│  │ 库存助手 App  │  │     │  - inventory                │
│  │ - RAG 知识库  │  │     │  - sales_orders             │
│  │ - 对话工作流  │  │     │  - warehouses               │
│  └───────────────┘  │     └─────────────────────────────┘
│  ┌───────────────┐  │
│  │ 报告生成 App  │  │
│  └───────────────┘  │
└─────────────────────┘
```

---

## Dify 快速开始

### 1. 部署 Dify（Docker）

```bash
# 克隆 Dify 仓库
git clone https://github.com/langgenius/dify.git
cd dify/docker

# 启动服务
docker compose up -d

# 访问 http://localhost:80 进行初始化
```

### 2. Dify 云服务（更简单）

直接使用 [Dify Cloud](https://cloud.dify.ai)：
1. 注册账号
2. 创建应用
3. 获取 API Key

### 3. 创建库存助手应用

在 Dify 中创建新应用时：

**应用类型**: Chatbot (对话型)

**系统提示词 (System Prompt)**:

```
你是益康仓储管理系统的智能助手，专门帮助用户分析和管理库存。

你的能力包括：
1. 查询库存状态和详情
2. 分析销售趋势
3. 预测库存需求
4. 生成库存报告
5. 提供补货建议

当用户询问库存相关问题时，你会收到实时的库存数据作为上下文。请基于这些数据给出准确、专业的回答。

回答风格：
- 简洁明了
- 使用数据支撑观点
- 给出可操作的建议
```

**知识库配置**:
- 上传产品目录文档
- 上传库存管理规范文档
- 上传历史报告（可选）

---

## 实现计划

### Phase 1: Dify 集成 (2-3天)

#### 1.1 后端 Dify 代理
- [ ] 创建 `app/services/dify_service.py` - Dify API 客户端
- [ ] 创建 `app/api/v1/ai_chat.py` - 转发请求到 Dify
- [ ] 实现实时库存数据注入

#### 1.2 环境配置
```env
# .env 添加
DIFY_API_BASE=https://api.dify.ai/v1  # 或自部署地址
DIFY_API_KEY=app-xxxxx  # Dify 应用 API Key
```

### Phase 2: 前端聊天组件 (2-3天)

#### 2.1 浮动聊天气泡
- [ ] 创建 `FloatChatbot.tsx`
- [ ] 集成到 `Layout.tsx`

#### 2.2 AI 助手页面增强
- [ ] 升级现有 `AIAssistant.tsx`
- [ ] 添加对话历史

### Phase 3: 高级功能 (3-4天)

#### 3.1 库存分析工作流
- [ ] 在 Dify 中创建 Workflow 应用
- [ ] 实现：用户提问 → 获取数据 → 分析 → 生成回答

#### 3.2 报告生成
- [ ] 创建报告生成 Workflow
- [ ] 支持周报/月报自动生成

---

## 核心代码设计

### Dify 服务封装

```python
# app/services/dify_service.py

import httpx
import os
from typing import Optional, Dict, Any, AsyncGenerator

class DifyService:
    """Dify API 服务封装"""
    
    def __init__(self):
        self.base_url = os.getenv("DIFY_API_BASE", "https://api.dify.ai/v1")
        self.api_key = os.getenv("DIFY_API_KEY", "")
    
    async def chat(
        self, 
        message: str, 
        user_id: str,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        发送消息到 Dify 并获取回复
        
        Args:
            message: 用户消息
            user_id: 用户标识
            conversation_id: 对话ID（用于多轮对话）
            context: 额外上下文（如实时库存数据）
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # 如果有库存上下文，注入到消息中
        if context:
            message = f"[实时库存数据]\n{context}\n\n[用户问题]\n{message}"
        
        payload = {
            "query": message,
            "user": user_id,
            "response_mode": "blocking",  # 或 "streaming"
            "inputs": {}
        }
        
        if conversation_id:
            payload["conversation_id"] = conversation_id
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat-messages",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            return response.json()
    
    async def chat_stream(
        self, 
        message: str, 
        user_id: str,
        conversation_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """流式对话（实时显示回复）"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "query": message,
            "user": user_id,
            "response_mode": "streaming",
            "inputs": {}
        }
        
        if conversation_id:
            payload["conversation_id"] = conversation_id
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat-messages",
                headers=headers,
                json=payload,
                timeout=60.0
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        yield line[5:].strip()


# 单例
_dify_service: Optional[DifyService] = None

def get_dify_service() -> DifyService:
    global _dify_service
    if _dify_service is None:
        _dify_service = DifyService()
    return _dify_service
```

### AI 聊天 API

```python
# app/api/v1/ai_chat.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.services.dify_service import get_dify_service
from app.services.inventory_analyzer import InventoryAnalyzer

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    suggestions: list = []


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """与 AI 助手对话"""
    
    dify = get_dify_service()
    analyzer = InventoryAnalyzer(db)
    
    # 获取实时库存上下文
    context = None
    if any(keyword in request.message for keyword in ["库存", "产品", "仓库", "订单"]):
        context = analyzer.get_context_summary()
    
    # 调用 Dify API
    try:
        result = await dify.chat(
            message=request.message,
            user_id=str(current_user.id),
            conversation_id=request.conversation_id,
            context=context
        )
        
        return ChatResponse(
            reply=result.get("answer", "抱歉，我无法处理您的请求"),
            conversation_id=result.get("conversation_id", ""),
            suggestions=["查看库存详情", "生成报告", "预测需求"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 文件结构

```
src/Backend/app/
├── services/
│   ├── dify_service.py         # [NEW] Dify API 封装
│   ├── inventory_analyzer.py   # [NEW] 库存分析服务
│   └── amap_service.py         # [EXISTING]
├── api/v1/
│   ├── ai_chat.py              # [NEW] AI 聊天 API
│   └── ...
└── ...

src/
├── components/
│   ├── FloatChatbot/
│   │   ├── FloatChatbot.tsx    # [NEW] 浮动聊天组件
│   │   ├── ChatMessage.tsx     # [NEW] 消息气泡
│   │   └── ChatInput.tsx       # [NEW] 输入框
│   └── Layout.tsx              # [MODIFY] 添加 FloatChatbot
└── pages/
    └── AIAssistant.tsx         # [MODIFY] 增强功能
```

---

## Dify vs 纯 Python 对比

| 方面 | Dify | 纯 Python |
|-----|------|-----------|
| **开发速度** | ⭐⭐⭐⭐⭐ 快 | ⭐⭐⭐ 中等 |
| **灵活性** | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 高 |
| **维护成本** | ⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中等 |
| **部署复杂度** | ⭐⭐⭐ 需要额外服务 | ⭐⭐⭐⭐⭐ 简单 |
| **知识库管理** | ⭐⭐⭐⭐⭐ 内置 | ⭐⭐ 需自建 |
| **Prompt 调优** | ⭐⭐⭐⭐⭐ 可视化 | ⭐⭐⭐ 代码修改 |

**结论**: 对于你的需求，**推荐使用 Dify**，可以快速实现 RAG 对话功能，后期如需更多定制再补充 Python 代码。

---

## 时间估算

| 阶段 | 内容 | 预计时间 |
|-----|------|---------|
| Phase 1 | Dify 部署 + 后端集成 | 2-3 天 |
| Phase 2 | 前端聊天组件 | 2-3 天 |
| Phase 3 | 高级功能 (报告、预测) | 3-4 天 |
| **总计** | | **7-10 天** |

---

## 下一步

1. **部署 Dify** - 选择云服务或 Docker 自部署
2. **创建应用** - 在 Dify 中创建"库存助手"应用
3. **获取 API Key** - 配置到 `.env` 文件
4. **开始开发** - 按计划实现后端和前端代码

> [!TIP]
> 如果你已经有 Dify 账号或已部署，请提供 API 地址和 Key，我们可以立即开始集成。
