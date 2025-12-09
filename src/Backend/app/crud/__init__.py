"""
CRUD操作模块

该模块整合了所有数据模型的CRUD操作。
"""

from . import base, inventory, product, user, sales
from .product import product, category
from .user import user
from .inventory import inventory, warehouse
from .sales import distributor, sales_order
