"""销售相关模型"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Distributor(Base):
    __tablename__ = "distributors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    code = Column(String(50), unique=True)  # 经销商代码，如 "DIST001"
    contact_person = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100))  # 邮箱
    address = Column(String(255))  # 详细地址
    region = Column(String(100), nullable=False)
    credit_limit = Column(Float, default=0.0)  # 信用额度
    is_active = Column(Boolean, default=True)  # 是否启用
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sales_orders = relationship("SalesOrder", back_populates="distributor", cascade="all,delete")


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, nullable=False, index=True)
    distributor_id = Column(Integer, ForeignKey("distributors.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(200), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)  # 单价
    total_value = Column(Float, nullable=False)

    # 订单状态管理
    status = Column(String(20), default="pending", index=True)  # pending, processing, completed, cancelled, shipped
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))  # 出货仓库
    delivery_date = Column(DateTime(timezone=True))  # 计划交货日期
    completed_at = Column(DateTime(timezone=True))  # 实际完成时间
    user_id = Column(Integer, ForeignKey("users.id"))  # 创建订单的用户
    notes = Column(Text)  # 备注

    order_date = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    distributor = relationship("Distributor", back_populates="sales_orders")
