"""通知 Pydantic 模型"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationBase(BaseModel):
    """通知基础模型"""
    title: str
    message: str
    notification_type: str  # system, inventory_alert, order, approval, message, product, alert
    priority: str = "normal"  # low, normal, high, urgent
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    action_url: Optional[str] = None


class NotificationCreate(NotificationBase):
    """创建通知模型"""
    user_id: int
    sender_id: Optional[int] = None
    expire_at: Optional[datetime] = None


class NotificationUpdate(BaseModel):
    """更新通知模型"""
    is_read: Optional[bool] = None


class NotificationInDB(NotificationBase):
    """通知数据库模型"""
    id: int
    user_id: int
    sender_id: Optional[int] = None
    is_read: bool
    is_deleted: bool
    read_at: Optional[datetime] = None
    expire_at: Optional[datetime] = None  # 单数形式，匹配数据库
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationResponse(NotificationInDB):
    """通知响应模型（与InDB相同）"""
    pass


class UnreadCountResponse(BaseModel):
    """未读通知数量响应模型"""
    unread_count: int
