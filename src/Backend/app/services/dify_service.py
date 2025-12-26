"""
Dify AI 服务

提供与 Dify 平台的对话接口
"""

import httpx
from typing import Optional, Dict, Any, AsyncGenerator

from app.core.config import settings


class DifyService:
    """Dify API 服务封装"""
    
    def __init__(self):
        self.base_url = settings.DIFY_API_BASE
        self.api_key = settings.DIFY_API_KEY or ""
        if not self.api_key:
            print("[WARN] DIFY_API_KEY not configured in .env")
    
    async def chat(
        self, 
        message: str, 
        user_id: str,
        conversation_id: Optional[str] = None,
        context: Optional[str] = None
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
        full_message = message
        if context:
            full_message = f"[系统提供的实时数据]\n{context}\n\n[用户问题]\n{message}"
        
        payload = {
            "query": full_message,
            "user": user_id,
            "response_mode": "blocking",
            "inputs": {}
        }
        
        if conversation_id:
            payload["conversation_id"] = conversation_id
        
        print(f"[Dify] Sending message to {self.base_url}/chat-messages")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat-messages",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code != 200:
                    error_text = response.text
                    print(f"[Dify] Error response: {response.status_code} - {error_text}")
                    return {
                        "error": f"Dify API error: {response.status_code}",
                        "detail": error_text
                    }
                
                result = response.json()
                print(f"[Dify] Response received, conversation_id: {result.get('conversation_id')}")
                return result
                
            except httpx.TimeoutException:
                print("[Dify] Request timeout")
                return {"error": "请求超时，请稍后重试"}
            except Exception as e:
                print(f"[Dify] Request error: {e}")
                return {"error": str(e)}
    
    async def chat_stream(
        self, 
        message: str, 
        user_id: str,
        conversation_id: Optional[str] = None,
        context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """流式对话（实时显示回复）"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        full_message = message
        if context:
            full_message = f"[系统提供的实时数据]\n{context}\n\n[用户问题]\n{message}"
        
        payload = {
            "query": full_message,
            "user": user_id,
            "response_mode": "streaming",
            "inputs": {}
        }
        
        if conversation_id:
            payload["conversation_id"] = conversation_id
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat-messages",
                headers=headers,
                json=payload
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        data = line[5:].strip()
                        if data:
                            yield data
    
    async def get_conversations(self, user_id: str, limit: int = 20) -> Dict[str, Any]:
        """获取用户的对话列表"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/conversations",
                headers=headers,
                params={"user": user_id, "limit": limit}
            )
            return response.json()
    
    async def get_conversation_messages(
        self, 
        conversation_id: str, 
        user_id: str,
        limit: int = 20
    ) -> Dict[str, Any]:
        """获取对话的消息历史"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/messages",
                headers=headers,
                params={
                    "conversation_id": conversation_id,
                    "user": user_id,
                    "limit": limit
                }
            )
            return response.json()


# 单例
_dify_service: Optional[DifyService] = None


def get_dify_service() -> DifyService:
    """获取 DifyService 单例"""
    global _dify_service
    if _dify_service is None:
        _dify_service = DifyService()
    return _dify_service
