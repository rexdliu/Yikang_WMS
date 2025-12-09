"""
产品 CRUD 操作

该模块定义了产品和产品分类相关的 CRUD 操作。
主要功能：
1. 产品的创建、获取、更新、删除
2. 产品分类的创建、获取、更新、删除
"""

from app.crud.base import CRUDBase
from app.models.product import Product, ProductCategory
from app.schemas.product import ProductCreate, ProductUpdate, ProductCategoryCreate, ProductCategoryUpdate

class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    """产品 CRUD 操作类"""
    pass

class CRUDProductCategory(CRUDBase[ProductCategory, ProductCategoryCreate, ProductCategoryUpdate]):
    """产品分类 CRUD 操作类"""
    pass

# 创建产品 CRUD 实例
product = CRUDProduct(Product)

# 创建产品分类 CRUD 实例
category = CRUDProductCategory(ProductCategory)