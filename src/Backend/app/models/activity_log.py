"""
活动日志模型

该模块定义了系统活动日志的 SQLAlchemy 数据模型。
用于记录系统中的各种操作，为 Dashboard 的"最近活动"提供数据支持。
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ActivityLog(Base):
    """
    活动日志模型

    用于记录系统中的所有重要活动，包括库存变动、订单处理、产品更新和系统警报。
    活动类型: inventory=库存操作, order=订单操作, product=产品操作, alert=系统警报
    """

    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(String(20), nullable=False, index=True)  # inventory, order, product, alert
    action = Column(String(100), nullable=False)  # 具体操作，如 "入库", "出库", "创建订单", "更新产品"
    item_name = Column(String(200), nullable=False)  # 相关项目名称
    user_id = Column(Integer, ForeignKey("users.id"))  # 操作用户
    reference_id = Column(Integer)  # 关联记录的ID
    reference_type = Column(String(50))  # 关联记录的类型，如 "product", "order", "inventory"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # 关系
    user = relationship("User")
