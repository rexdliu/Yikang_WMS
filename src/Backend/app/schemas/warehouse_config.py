"""
仓库配置 Pydantic 模型

该模块定义了与仓库配置相关的 Pydantic 模型，用于数据验证和序列化。
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class WarehouseConfigBase(BaseModel):
    """仓库配置基础模型"""
    warehouse_name: str
    location: str
    timezone: str
    temperature_unit: str
    low_stock_threshold: int


class WarehouseConfigResponse(WarehouseConfigBase):
    """仓库配置响应模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WarehouseConfigUpdate(BaseModel):
    """仓库配置更新模型"""
    warehouse_name: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    timezone: Optional[str] = None
    temperature_unit: Optional[str] = Field(None, pattern="^(celsius|fahrenheit)$")
    low_stock_threshold: Optional[int] = Field(None, ge=0)
