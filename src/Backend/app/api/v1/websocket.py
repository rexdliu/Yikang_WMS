"""
WebSocket API 路由

该模块定义了 WebSocket 相关的 API 路由。
主要功能：
1. WebSocket 连接端点（用于实时通知推送）
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.websocket import manager
from app.core.dependencies import get_current_user
from app.models.user import User
from jose import JWTError
import json

router = APIRouter()


async def get_current_user_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> User:
    """
    从 WebSocket 连接中获取当前用户

    Args:
        websocket: WebSocket 连接对象
        token: JWT 访问令牌（从查询参数获取）
        db: 数据库会话

    Returns:
        User: 当前认证用户对象

    Raises:
        WebSocketDisconnect: 如果令牌无效或用户不存在
    """
    try:
        # 使用现有的 get_current_user 依赖来验证 token
        from app.core.dependencies import oauth2_scheme
        from jose import jwt
        from app.core.config import settings
        from app.crud.user import user as user_crud

        # 解析 JWT token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        username = payload.get("sub")

        if not isinstance(username, str):
            await websocket.close(code=1008, reason="Invalid credentials")
            raise WebSocketDisconnect()

        user = user_crud.get_by_username(db, username=username)
        if user is None:
            await websocket.close(code=1008, reason="User not found")
            raise WebSocketDisconnect()

        return user

    except JWTError:
        await websocket.close(code=1008, reason="Invalid token")
        raise WebSocketDisconnect()


@router.websocket("/ws/notifications")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket 通知推送端点

    客户端连接示例：
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/api/v1/ws/notifications?token=YOUR_JWT_TOKEN');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        console.log('New notification:', data.data);
      }
    };
    ```

    Args:
        websocket: WebSocket 连接对象
        token: JWT 访问令牌
        db: 数据库会话
    """
    # 验证用户身份
    try:
        user = await get_current_user_ws(websocket, token, db)
    except WebSocketDisconnect:
        return

    user_id = int(user.id)  # type: ignore[arg-type]

    # 建立连接
    await manager.connect(websocket, user_id)

    # 发送连接成功消息
    await websocket.send_text(json.dumps({
        "type": "connection",
        "data": {
            "status": "connected",
            "user_id": user_id,
            "message": "WebSocket 连接已建立"
        }
    }))

    try:
        while True:
            # 接收客户端消息（保持连接活跃）
            data = await websocket.receive_text()

            # 处理心跳消息
            if data == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "data": {"timestamp": str(websocket)}
                }))

    except WebSocketDisconnect:
        # 断开连接
        manager.disconnect(websocket, user_id)
