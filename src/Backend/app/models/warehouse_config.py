"""
仓库配置数据模型

该模块定义了仓库配置相关的 SQLAlchemy 数据模型。
"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class WarehouseConfig(Base):
    """
    仓库配置模型

    用于存储仓库的全局配置信息，如名称、位置、时区等。
    """

    __tablename__ = "warehouse_config"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_name = Column(String, default="主仓库")  # 仓库名称
    location = Column(String, default="未设置")  # 仓库位置
    timezone = Column(String, default="Asia/Shanghai")  # 时区
    temperature_unit = Column(String, default="celsius")  # 温度单位: celsius/fahrenheit
    low_stock_threshold = Column(Integer, default=10)  # 低库存阈值
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
