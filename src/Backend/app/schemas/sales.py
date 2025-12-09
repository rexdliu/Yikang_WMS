from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DistributorBase(BaseModel):
    name: str
    contact_person: str
    phone: str
    region: str


class DistributorCreate(DistributorBase):
    pass


class DistributorUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    region: Optional[str] = None


class DistributorInDB(DistributorBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SalesOrderBase(BaseModel):
    order_code: str
    distributor_id: int
    product_id: int
    product_name: str
    quantity: int
    total_value: float
    order_date: datetime


class SalesOrderCreateRequest(BaseModel):
    """创建订单的请求模型 - 不包含系统生成的字段"""
    distributor_id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    total_value: float
    warehouse_id: Optional[int] = None
    delivery_date: Optional[datetime] = None
    notes: Optional[str] = None


class SalesOrderCreate(SalesOrderBase):
    """完整的订单创建模型 - 包含所有必填字段"""
    unit_price: float
    warehouse_id: Optional[int] = None
    delivery_date: Optional[datetime] = None
    user_id: Optional[int] = None
    notes: Optional[str] = None


class SalesOrderUpdate(BaseModel):
    quantity: Optional[int] = None
    total_value: Optional[float] = None
    order_date: Optional[datetime] = None
    status: Optional[str] = None
    warehouse_id: Optional[int] = None
    delivery_date: Optional[datetime] = None
    notes: Optional[str] = None


class SalesOrderInDB(SalesOrderBase):
    id: int
    status: str
    warehouse_id: Optional[int] = None
    delivery_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    user_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
