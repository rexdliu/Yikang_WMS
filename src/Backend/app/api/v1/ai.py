"""
AI 相关 API

包括：
- RAG 查询
- 产品分析
- Dify AI 聊天（新增）
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.services.ai_service import ai_service
from app.services.rag_service import rag_service
from app.services.dify_service import get_dify_service
from app.services.inventory_analyzer import InventoryAnalyzer
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User


# ==================== 请求/响应模型 ====================

class RAGQuery(BaseModel):
    question: str
    top_k: int = 3


class ProductInsightRequest(BaseModel):
    product: Dict[str, Any]


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str
    conversation_id: Optional[str] = None
    include_context: bool = True


class ChatResponse(BaseModel):
    """聊天响应"""
    answer: str
    conversation_id: str
    message_id: Optional[str] = None
    suggestions: List[str] = []


# ==================== 路由 ====================

router = APIRouter()


# --- 原有 RAG 功能 ---

@router.post("/rag/query")
def rag_query(payload: RAGQuery) -> Dict[str, Any]:
    """RAG 查询"""
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="问题不能为空")
    return rag_service.query(payload.question, top_k=payload.top_k)


@router.post("/insights")
def generate_insights(request: ProductInsightRequest) -> Dict[str, Any]:
    """生成产品分析洞察"""
    insight = ai_service.generate_product_insights(request.product)
    return {"insight": insight}


# --- Dify AI 聊天功能 ---

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    与 AI 助手对话
    
    - **message**: 用户消息
    - **conversation_id**: 对话ID（多轮对话时使用）
    - **include_context**: 是否自动注入实时库存数据
    """
    dify = get_dify_service()
    
    # 获取实时库存上下文
    context = None
    if request.include_context:
        inventory_keywords = ["库存", "产品", "仓库", "订单", "销售", "预警", "补货", "报告", "分析", "多少", "哪些", "统计"]
        if any(keyword in request.message for keyword in inventory_keywords):
            analyzer = InventoryAnalyzer(db)
            context = analyzer.get_context_summary()
    
    # 调用 Dify API
    result = await dify.chat(
        message=request.message,
        user_id=str(current_user.id),
        conversation_id=request.conversation_id,
        context=context
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=500, 
            detail=result.get("error", "AI 服务暂时不可用")
        )
    
    return ChatResponse(
        answer=result.get("answer", "抱歉，我无法处理您的请求"),
        conversation_id=result.get("conversation_id", ""),
        message_id=result.get("message_id"),
        suggestions=[
            "查看库存详情",
            "生成库存报告", 
            "检查低库存预警",
            "分析销售趋势"
        ]
    )


@router.post("/chat/stream")
async def chat_with_ai_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    流式对话（实时显示回复）
    
    返回 Server-Sent Events (SSE) 格式的流式响应
    """
    dify = get_dify_service()
    
    context = None
    if request.include_context:
        inventory_keywords = ["库存", "产品", "仓库", "订单", "销售", "预警", "补货", "报告", "分析"]
        if any(keyword in request.message for keyword in inventory_keywords):
            analyzer = InventoryAnalyzer(db)
            context = analyzer.get_context_summary()
    
    async def generate():
        async for chunk in dify.chat_stream(
            message=request.message,
            user_id=str(current_user.id),
            conversation_id=request.conversation_id,
            context=context
        ):
            yield f"data: {chunk}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/conversations")
async def get_conversations(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user)
):
    """获取用户的对话列表"""
    dify = get_dify_service()
    result = await dify.get_conversations(
        user_id=str(current_user.id),
        limit=limit
    )
    return result


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user)
):
    """获取对话的消息历史"""
    dify = get_dify_service()
    result = await dify.get_conversation_messages(
        conversation_id=conversation_id,
        user_id=str(current_user.id),
        limit=limit
    )
    return result


@router.get("/inventory/context")
async def get_inventory_context(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取当前库存上下文（调试用）"""
    analyzer = InventoryAnalyzer(db)
    return {
        "summary": analyzer.get_context_summary(),
        "low_stock_items": analyzer.get_low_stock_items(5),
        "inventory_by_warehouse": analyzer.get_inventory_by_warehouse()
    }

