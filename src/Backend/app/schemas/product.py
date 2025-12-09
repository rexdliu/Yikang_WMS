"""
产品 Pydantic 模型

该模块定义了与产品相关的 Pydantic 模型，用于数据验证和序列化。
主要包含：
1. ProductCategory 相关模型
2. Product 相关模型
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# 产品分类基础模型
class ProductCategoryBase(BaseModel):
    """产品分类基础模型"""
    name: str
    description: Optional[str] = None

# 创建产品分类模型
class ProductCategoryCreate(ProductCategoryBase):
    """创建产品分类模型"""
    pass

# 更新产品分类模型
class ProductCategoryUpdate(BaseModel):
    """更新产品分类模型"""
    name: Optional[str] = None
    description: Optional[str] = None

# 产品分类数据库模型
class ProductCategoryInDB(ProductCategoryBase):
    """产品分类数据库模型"""
    id: int
    code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# 产品基础模型
class ProductBase(BaseModel):
    """产品基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="产品名称")
    sku: str = Field(..., min_length=1, max_length=100, description="SKU")
    description: Optional[str] = Field(None, description="产品描述")

    # Cummins 特定字段
    part_number: Optional[str] = Field(None, max_length=100, description="Cummins 零件号")
    engine_model: Optional[str] = Field(None, max_length=50, description="适用发动机型号")
    manufacturer: str = Field(default="Cummins", max_length=100, description="制造商")

    # 分类和价格
    category_id: Optional[int] = Field(None, description="产品分类ID")
    price: float = Field(..., gt=0, description="售价")
    cost: Optional[float] = Field(None, ge=0, description="成本")

    # 库存管理
    unit: str = Field(default="pcs", max_length=20, description="单位: pcs/box/liter")
    min_stock_level: int = Field(default=10, ge=0, description="最低库存预警线")

    # 其他
    image_url: Optional[str] = Field(None, max_length=255, description="产品图片URL")
    is_active: bool = Field(default=True, description="是否启用")

# 创建产品模型
class ProductCreate(ProductBase):
    """创建产品模型"""
    category_id: int = Field(..., gt=0, description="产品分类ID（必填）")  # type: ignore[assignment]
    part_number: str = Field(..., min_length=1, max_length=100, description="Cummins零件号（必填）")  # type: ignore[assignment]


class ProductCreateRequest(BaseModel):
    """创建产品的请求模型 - 包含warehouse信息"""
    # 产品基本信息
    name: str = Field(..., min_length=1, max_length=200, description="产品名称")
    sku: str = Field(..., min_length=1, max_length=100, description="SKU")
    part_number: str = Field(..., min_length=1, max_length=100, description="Cummins零件号")
    manufacturer: str = Field(default="Cummins", max_length=100, description="制造商")
    description: Optional[str] = Field(None, description="产品描述")

    # 分类和价格
    category_id: int = Field(..., gt=0, description="产品分类ID")
    price: float = Field(..., gt=0, description="售价")
    cost: Optional[float] = Field(None, ge=0, description="成本")

    # 库存管理
    unit: str = Field(default="pcs", max_length=20, description="单位: pcs/box/liter")
    min_stock_level: int = Field(default=10, ge=0, description="最低库存预警线")

    # 仓库和初始库存
    warehouse_id: int = Field(..., gt=0, description="仓库ID（必填）")
    initial_quantity: int = Field(default=0, ge=0, description="初始库存数量")
    location_code: Optional[str] = Field(None, max_length=50, description="货位编号")

    # 其他
    image_url: Optional[str] = Field(None, max_length=255, description="产品图片URL")
    is_active: bool = Field(default=True, description="是否启用")


# 更新产品模型
class ProductUpdate(BaseModel):
    """更新产品模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None

    # Cummins 特定字段
    part_number: Optional[str] = Field(None, max_length=100)
    engine_model: Optional[str] = Field(None, max_length=50)
    manufacturer: Optional[str] = Field(None, max_length=100)

    # 分类和价格
    category_id: Optional[int] = Field(None, gt=0)
    price: Optional[float] = Field(None, gt=0)
    cost: Optional[float] = Field(None, ge=0)

    # 库存管理
    unit: Optional[str] = Field(None, max_length=20)
    min_stock_level: Optional[int] = Field(None, ge=0)

    # 其他
    image_url: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None

# 产品数据库模型
class ProductInDB(BaseModel):
    """产品数据库模型 - 包含所有字段和分类信息"""
    id: int
    name: str
    sku: str
    description: Optional[str] = None

    # Cummins 特定字段
    part_number: Optional[str] = None
    engine_model: Optional[str] = None
    manufacturer: str = "Cummins"

    # 分类和价格
    category_id: Optional[int] = None
    category: Optional[ProductCategoryInDB] = None  # 关联的分类信息
    price: float
    cost: Optional[float] = None

    # 库存管理
    unit: str = "pcs"
    min_stock_level: int = 10

    # 其他
    image_url: Optional[str] = None
    is_active: bool = True

    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
