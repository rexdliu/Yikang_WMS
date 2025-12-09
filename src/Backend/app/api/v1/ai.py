from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_service import ai_service
from app.services.rag_service import rag_service


class RAGQuery(BaseModel):
    question: str
    top_k: int = 3


class ProductInsightRequest(BaseModel):
    product: Dict[str, Any]


router = APIRouter()


@router.post("/rag/query")
def rag_query(payload: RAGQuery) -> Dict[str, Any]:
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="问题不能为空")
    return rag_service.query(payload.question, top_k=payload.top_k)


@router.post("/insights")
def generate_insights(request: ProductInsightRequest) -> Dict[str, Any]:
    insight = ai_service.generate_product_insights(request.product)
    return {"insight": insight}
