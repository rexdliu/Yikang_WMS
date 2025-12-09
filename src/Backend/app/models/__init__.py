"""
数据模型导出

该模块导出所有数据模型，确保 Alembic 可以正确检测所有模型进行数据库迁移。
"""

from app.models.user import User
from app.models.product import Product, ProductCategory
from app.models.inventory import Warehouse, Inventory, InventoryTransaction
from app.models.sales import Distributor, SalesOrder
from app.models.activity_log import ActivityLog
from app.models.notification import Notification

__all__ = [
    "User",
    "Product",
    "ProductCategory",
    "Warehouse",
    "Inventory",
    "InventoryTransaction",
    "Distributor",
    "SalesOrder",
    "ActivityLog",
    "Notification",
]
