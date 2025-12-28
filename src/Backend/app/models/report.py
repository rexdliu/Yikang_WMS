"""
AI 报告数据模型

定义报告和洞察的数据库模型
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ReportStatus(str, enum.Enum):
    """报告状态"""
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class InsightType(str, enum.Enum):
    """洞察类型"""
    SUGGESTION = "suggestion"
    TREND = "trend"
    WARNING = "warning"


class InsightPriority(str, enum.Enum):
    """洞察优先级"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Report(Base):
    """
    AI 生成的报告模型
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 报告基本信息
    title = Column(String(200), nullable=False)
    query = Column(Text, nullable=False)  # 用户的原始查询
    
    # AI 生成的内容
    content = Column(Text)  # 报告正文 (Markdown 格式)
    summary = Column(Text)  # 报告摘要
    
    # 状态和元数据
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.GENERATING)
    error_message = Column(Text)  # 生成失败时的错误信息
    
    # 用户操作
    is_starred = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # 关系
    user = relationship("User")


class AIInsight(Base):
    """
    AI 洞察模型
    
    系统自动生成的库存、销售等智能洞察
    """
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = 系统级洞察
    
    # 洞察内容
    type = Column(SQLEnum(InsightType), nullable=False)
    priority = Column(SQLEnum(InsightPriority), default=InsightPriority.MEDIUM)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # 关联数据
    related_product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    related_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    
    # 状态
    is_handled = Column(Boolean, default=False)
    handled_at = Column(DateTime(timezone=True))
    handled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))  # 洞察过期时间
    
    # 关系
    user = relationship("User", foreign_keys=[user_id])
    handler = relationship("User", foreign_keys=[handled_by])
