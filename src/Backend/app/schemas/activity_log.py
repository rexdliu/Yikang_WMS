"""活动日志 Pydantic 模型"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActivityLogBase(BaseModel):
    """活动日志基础模型"""
    activity_type: str  # inventory, order, product, alert
    action: str
    item_name: str
    user_id: Optional[int] = None
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None


class ActivityLogCreate(ActivityLogBase):
    """创建活动日志模型"""
    pass


class ActivityLogInDB(ActivityLogBase):
    """活动日志数据库模型"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
