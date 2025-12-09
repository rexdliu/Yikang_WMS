"""
WebSocket 连接管理器

该模块定义了 WebSocket 连接管理器，用于管理实时通知推送。
主要功能：
1. 管理用户的 WebSocket 连接
2. 支持多设备同时连接
3. 向指定用户推送通知
4. 广播通知给所有连接用户
"""

from typing import Dict, List, Optional
from fastapi import WebSocket
import json


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        """初始化连接管理器"""
        # 存储用户ID到WebSocket连接的映射（支持多设备）
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """
        接受新的 WebSocket 连接

        Args:
            websocket: WebSocket 连接对象
            user_id: 用户ID
        """
        await websocket.accept()

        # 如果用户已有连接，添加到列表；否则创建新列表
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []

        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        """
        断开 WebSocket 连接

        Args:
            websocket: WebSocket 连接对象
            user_id: 用户ID
        """
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

            # 如果用户没有活跃连接，删除用户记录
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        """
        向指定用户的所有连接发送消息

        Args:
            message: 消息内容（JSON字符串）
            user_id: 用户ID
        """
        if user_id in self.active_connections:
            # 向该用户的所有设备发送消息
            dead_connections = []

            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    # 如果发送失败，标记为待删除连接
                    dead_connections.append(connection)

            # 清理失效的连接
            for connection in dead_connections:
                self.disconnect(connection, user_id)

    async def send_notification(
        self,
        user_id: int,
        notification_id: int,
        title: str,
        message: str,
        notification_type: str,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None
    ):
        """
        向指定用户发送通知

        Args:
            user_id: 用户ID
            notification_id: 通知ID
            title: 通知标题
            message: 通知消息
            notification_type: 通知类型
            reference_id: 关联实体ID
            reference_type: 关联实体类型
        """
        notification_data = {
            "type": "notification",
            "data": {
                "id": notification_id,
                "title": title,
                "message": message,
                "notification_type": notification_type,
                "reference_id": reference_id,
                "reference_type": reference_type
            }
        }

        await self.send_personal_message(
            json.dumps(notification_data),
            user_id
        )

    async def broadcast(self, message: str):
        """
        向所有连接的用户广播消息

        Args:
            message: 消息内容（JSON字符串）
        """
        dead_connections = []

        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_connections.append((user_id, connection))

        # 清理失效的连接
        for user_id, connection in dead_connections:
            self.disconnect(connection, user_id)

    def get_connected_users(self) -> List[int]:
        """
        获取所有已连接的用户ID

        Returns:
            List[int]: 用户ID列表
        """
        return list(self.active_connections.keys())

    def get_connection_count(self, user_id: int) -> int:
        """
        获取指定用户的连接数量

        Args:
            user_id: 用户ID

        Returns:
            int: 连接数量
        """
        return len(self.active_connections.get(user_id, []))


# 创建全局连接管理器实例
manager = ConnectionManager()
