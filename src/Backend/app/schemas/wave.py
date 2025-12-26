"""
波次 Schemas
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class WaveStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    cancelled = "cancelled"


class WavePriority(str, Enum):
    normal = "normal"
    urgent = "urgent"


class WaveBase(BaseModel):
    """波次基础字段"""
    carrier: Optional[str] = None
    region: Optional[str] = None
    warehouse_id: Optional[int] = None
    priority: WavePriority = WavePriority.normal
    notes: Optional[str] = None


class WaveCreate(WaveBase):
    """创建波次"""
    order_ids: Optional[List[int]] = None  # 手动指定订单


class WaveUpdate(BaseModel):
    """更新波次"""
    carrier: Optional[str] = None
    region: Optional[str] = None
    priority: Optional[WavePriority] = None
    status: Optional[WaveStatus] = None
    notes: Optional[str] = None


class WaveInDB(WaveBase):
    """波次数据库模型"""
    id: int
    wave_code: str
    order_count: int
    total_quantity: int
    status: WaveStatus
    created_at: datetime
    released_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class WaveResponse(WaveInDB):
    """波次响应"""
    pass


class WaveWithOrders(WaveResponse):
    """波次及其订单"""
    orders: List[dict] = []


class WaveGenerateRequest(BaseModel):
    """自动生成波次请求"""
    region: Optional[str] = None  # 按区域过滤
    carrier: Optional[str] = None  # 按承运商过滤
    warehouse_id: Optional[int] = None  # 按仓库过滤
    priority: Optional[WavePriority] = None  # 按优先级过滤
    max_orders_per_wave: int = 50  # 每波次最大订单数
    order_ids: Optional[List[int]] = None  # 手动指定订单IDs
