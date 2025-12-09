"""
库存 Pydantic 模型

该模块定义了与库存相关的 Pydantic 模型，用于数据验证和序列化。
主要包含：
1. Warehouse 相关模型
2. Inventory 相关模型
3. InventoryTransaction 相关模型
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 仓库基础模型
class WarehouseBase(BaseModel):
    """仓库基础模型"""
    name: str
    location: Optional[str] = None
    capacity: Optional[float] = None
    is_active: bool = True

# 创建仓库模型
class WarehouseCreate(WarehouseBase):
    """创建仓库模型"""
    pass

# 更新仓库模型
class WarehouseUpdate(BaseModel):
    """更新仓库模型"""
    name: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[float] = None
    is_active: Optional[bool] = None

# 仓库数据库模型
class WarehouseInDB(WarehouseBase):
    """仓库数据库模型"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# 库存基础模型
class InventoryBase(BaseModel):
    """库存基础模型"""
    product_id: int
    warehouse_id: int
    quantity: int = 0
    reserved_quantity: int = 0

# 创建库存模型
class InventoryCreate(InventoryBase):
    """创建库存模型"""
    location_code: Optional[str] = None

# 更新库存模型
class InventoryUpdate(BaseModel):
    """更新库存模型"""
    quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None

# 库存数据库模型
class InventoryInDB(InventoryBase):
    """库存数据库模型"""
    id: int
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# 库存交易基础模型
class InventoryTransactionBase(BaseModel):
    """库存交易基础模型"""
    product_id: int
    warehouse_id: int
    transaction_type: str
    quantity: int
    reference: Optional[str] = None
    notes: Optional[str] = None

# 创建库存交易模型
class InventoryTransactionCreate(InventoryTransactionBase):
    """创建库存交易模型"""
    pass

# 库存交易数据库模型
class InventoryTransactionInDB(InventoryTransactionBase):
    """库存交易数据库模型"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
