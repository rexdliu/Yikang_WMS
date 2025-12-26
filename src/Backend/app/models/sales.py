from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class DeliveryPerson(Base):
    """交付人/送货员模型"""
    __tablename__ = "delivery_persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100))
    vehicle_number = Column(String(50))  # 车牌号
    destination = Column(String(255))  # 常用送货目的地
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    sales_orders = relationship("SalesOrder", back_populates="delivery_person")
    shipments = relationship("Shipment", back_populates="delivery_person")


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
    delivery_person_id = Column(Integer, ForeignKey("delivery_persons.id"))  # 交付人
    delivery_date = Column(DateTime(timezone=True))  # 计划交货日期
    completed_at = Column(DateTime(timezone=True))  # 实际完成时间
    user_id = Column(Integer, ForeignKey("users.id"))  # 创建订单的用户
    notes = Column(Text)  # 备注

    # 波次和运输单关联
    wave_id = Column(Integer, ForeignKey("waves.id"), nullable=True, index=True)  # 所属波次
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=True, index=True)  # 所属运输单
    
    # 收货地址（用于多点路径规划）
    delivery_address = Column(String(500), nullable=True)  # 收货地址
    delivery_lat = Column(Numeric(10, 7), nullable=True)  # 收货纬度
    delivery_lng = Column(Numeric(10, 7), nullable=True)  # 收货经度

    order_date = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 关系
    distributor = relationship("Distributor", back_populates="sales_orders")
    delivery_person = relationship("DeliveryPerson", back_populates="sales_orders")
    wave = relationship("Wave", back_populates="orders")
    shipment = relationship("Shipment", back_populates="orders")
