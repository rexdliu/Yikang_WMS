"""
运输单 Schemas
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum
from decimal import Decimal


class ShipmentStatus(str, Enum):
    planned = "planned"
    loading = "loading"
    in_transit = "in_transit"
    delivered = "delivered"
    cancelled = "cancelled"


class ShipmentBase(BaseModel):
    """运输单基础字段"""
    delivery_person_id: Optional[int] = None
    origin_warehouse_id: int
    destination_address: str
    departure_time: Optional[datetime] = None
    notes: Optional[str] = None


class ShipmentCreate(ShipmentBase):
    """创建运输单"""
    order_ids: List[int]  # 关联的订单ID列表


class ShipmentUpdate(BaseModel):
    """更新运输单"""
    delivery_person_id: Optional[int] = None
    destination_address: Optional[str] = None
    departure_time: Optional[datetime] = None
    status: Optional[ShipmentStatus] = None
    notes: Optional[str] = None


class ShipmentInDB(ShipmentBase):
    """运输单数据库模型"""
    id: int
    shipment_code: str
    origin_address: Optional[str] = None
    origin_lat: Optional[Decimal] = None
    origin_lng: Optional[Decimal] = None
    destination_lat: Optional[Decimal] = None
    destination_lng: Optional[Decimal] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    total_distance: Optional[Decimal] = None
    eta_minutes: Optional[int] = None
    status: ShipmentStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShipmentResponse(ShipmentInDB):
    """运输单响应"""
    delivery_person_name: Optional[str] = None
    warehouse_name: Optional[str] = None
    order_count: int = 0


class ShipmentWithOrders(ShipmentResponse):
    """运输单及其订单"""
    orders: List[dict] = []


class ShipmentTrackingResponse(BaseModel):
    """运输追踪响应"""
    shipment_id: int
    shipment_code: str
    status: ShipmentStatus
    origin_warehouse: str
    destination_address: str
    delivery_person: Optional[str] = None
    vehicle_number: Optional[str] = None
    departure_time: Optional[datetime] = None
    estimated_arrival: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    total_distance_km: Optional[float] = None
    eta_minutes: Optional[int] = None
    orders: List[dict] = []
