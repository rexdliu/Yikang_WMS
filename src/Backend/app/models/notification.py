"""
通知系统模型

该模块定义了系统通知的 SQLAlchemy 数据模型。
支持多种通知类型、优先级和状态管理，可关联到具体的业务记录。

主要包含：
1. Notification - 通知模型，用于存储用户通知
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Notification(Base):
    """
    通知模型

    用于存储系统通知，包括库存预警、订单状态变更、系统消息等。

    通知类型 (notification_type):
    - system: 系统通知（系统维护、更新等）
    - inventory_alert: 库存预警（低库存、缺货）
    - order: 订单通知（订单状态变更、新订单）
    - approval: 审批通知（需要审批的操作）
    - message: 消息通知（用户消息、提醒）
    - product: 产品通知（产品更新、新品上架）
    - alert: 系统警报（重要事件提醒）

    优先级 (priority):
    - low: 低优先级
    - normal: 普通（默认）
    - high: 高优先级
    - urgent: 紧急

    关联记录类型 (reference_type):
    - product: 产品
    - order: 订单
    - inventory: 库存
    - user: 用户
    - warehouse: 仓库
    - distributor: 经销商
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    # 接收者
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 通知内容
    title = Column(String(200), nullable=False)  # 通知标题
    message = Column(Text, nullable=False)  # 通知内容
    notification_type = Column(String(50), nullable=False, index=True)  # 通知类型
    priority = Column(String(20), default="normal", index=True)  # 优先级: low, normal, high, urgent

    # 业务关联
    reference_id = Column(Integer, index=True)  # 关联的业务记录ID
    reference_type = Column(String(50), index=True)  # 关联记录类型
    action_url = Column(String(255))  # 操作链接（前端路由）

    # 状态管理
    is_read = Column(Boolean, default=False, index=True)  # 是否已读
    is_deleted = Column(Boolean, default=False, index=True)  # 软删除标记
    read_at = Column(DateTime(timezone=True))  # 阅读时间

    # 发送者（可选，系统通知可能没有发送者）
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))  # 发送者

    # 过期时间（可选，用于限时通知，默认7天后过期）
    expire_at = Column(DateTime(timezone=True), index=True)  # 过期时间

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    sender = relationship("User", foreign_keys=[sender_id])

    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.notification_type}, title='{self.title}', user_id={self.user_id})>"