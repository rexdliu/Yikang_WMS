"""
库存相关数据模型

该模块定义了与库存管理相关的 SQLAlchemy 数据模型。
主要包含：
1. Warehouse - 仓库模型
2. Inventory - 库存模型
3. InventoryTransaction - 库存交易模型
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Warehouse(Base):
    """
    仓库模型

    用于存储仓库的基本信息，如名称、位置、容量等。
    """

    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    code = Column(String(50), unique=True)  # 仓库代码，如 "WH001"
    location = Column(String(255))
    capacity = Column(Float)  # 仓库总容量（立方米）
    current_usage = Column(Float, default=0.0)  # 当前使用量（用于计算容量使用率）
    manager_name = Column(String(100))  # 仓库管理员姓名
    phone = Column(String(20))  # 联系电话
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Inventory(Base):
    """
    库存模型

    用于跟踪每个仓库中每种产品的库存数量。
    """

    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)  # 预留数量
    location_code = Column(String(50))  # 货位编号，如 "A-01-03"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    product = relationship("Product")
    warehouse = relationship("Warehouse")

    # 索引
    __table_args__ = (
        Index('ix_inventory_product_warehouse', 'product_id', 'warehouse_id'),
    )

class InventoryTransaction(Base):
    """
    库存交易模型

    用于记录库存的所有进出交易，包括入库、出库、调整和调拨。
    交易类型: IN=入库, OUT=出库, ADJUST=调整, TRANSFER=调拨
    """

    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    transaction_type = Column(String(20), nullable=False)  # IN, OUT, ADJUST, TRANSFER
    quantity = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))  # 操作用户
    reference = Column(String(100))  # 关联的订单号或其他参考信息
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    product = relationship("Product")
    warehouse = relationship("Warehouse")