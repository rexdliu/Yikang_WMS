"""
产品相关数据模型

该模块定义了与产品管理相关的 SQLAlchemy 数据模型。
主要包含：
1. ProductCategory - 产品分类模型
2. Product - 产品模型
"""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ProductCategory(Base):
    """
    产品分类模型

    用于对产品进行分类管理，例如发动机、零件、机油、滤芯等。
    """

    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    code = Column(String(50), unique=True)  # 分类代码，如 "ENGINE", "PARTS", "OIL"
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Product(Base):
    """
    产品模型

    用于存储产品的基本信息，包括名称、SKU、价格、描述等。
    针对 Cummins 零件优化，支持零件号、发动机型号等字段。
    """

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    sku = Column(String(100), unique=True, index=True, nullable=False)

    # Cummins 特定字段
    part_number = Column(String(100), unique=True, index=True)  # Cummins 零件号，如 "3803682"
    engine_model = Column(String(50), index=True)  # 适用发动机型号，如 "6BT5.9", "ISF2.8"
    manufacturer = Column(String(100), default="Cummins")  # 制造商
    unit = Column(String(20), default="pcs")  # 单位: pcs=件, box=箱, liter=升
    min_stock_level = Column(Integer, default=10)  # 最低库存预警线

    description = Column(Text)
    price = Column(Float, nullable=False)
    cost = Column(Float)
    category_id = Column(Integer, ForeignKey("product_categories.id"))
    image_url = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    category = relationship("ProductCategory")