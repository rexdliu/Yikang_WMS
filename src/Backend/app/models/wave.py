"""
Wave Model - 波次管理

波次用于将多个相似订单合并处理，提高拣货效率
"""

from sqlalchemy import Column, Integer, String, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class WaveStatus(str, enum.Enum):
    """波次状态"""
    pending = "pending"  # 待处理
    processing = "processing"  # 执行中
    completed = "completed"  # 已完成
    cancelled = "cancelled"  # 已取消


class WavePriority(str, enum.Enum):
    """波次优先级"""
    normal = "normal"  # 普通
    urgent = "urgent"  # 加急


class Wave(Base):
    """波次模型 - 订单批量处理"""
    __tablename__ = "waves"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    wave_code = Column(String(50), unique=True, nullable=False, index=True)  # 波次号 WAVE-20231027-01
    
    # 过滤规则
    carrier = Column(String(100), nullable=True)  # 承运商
    region = Column(String(100), nullable=True)  # 目标区域
    warehouse_id = Column(Integer, nullable=True)  # 关联仓库
    
    # 波次信息
    order_count = Column(Integer, default=0)  # 包含订单数
    total_quantity = Column(Integer, default=0)  # 总商品数量
    priority = Column(Enum(WavePriority), default=WavePriority.normal)
    status = Column(Enum(WaveStatus), default=WaveStatus.pending)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    released_at = Column(DateTime(timezone=True), nullable=True)  # 释放执行时间
    completed_at = Column(DateTime(timezone=True), nullable=True)  # 完成时间
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关联订单 (一对多)
    orders = relationship("SalesOrder", back_populates="wave")
