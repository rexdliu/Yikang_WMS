"""
Shipment Model - 运输单管理

运输单用于追踪货物配送，支持多订单合并运输
"""

from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ShipmentStatus(str, enum.Enum):
    """运输状态"""
    planned = "planned"  # 计划中
    loading = "loading"  # 装货中
    in_transit = "in_transit"  # 运输中
    delivered = "delivered"  # 已送达
    cancelled = "cancelled"  # 已取消


class Shipment(Base):
    """运输单模型"""
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    shipment_code = Column(String(50), unique=True, nullable=False, index=True)  # 运输单号 SHP-20231027-001
    
    # 关联司机/交付人
    delivery_person_id = Column(Integer, ForeignKey("delivery_persons.id"), nullable=True)
    
    # 起点 (仓库)
    origin_warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    origin_address = Column(String(500), nullable=True)
    origin_lat = Column(Numeric(10, 7), nullable=True)  # 起点纬度
    origin_lng = Column(Numeric(10, 7), nullable=True)  # 起点经度
    
    # 终点
    destination_address = Column(String(500), nullable=False)
    destination_lat = Column(Numeric(10, 7), nullable=True)  # 终点纬度
    destination_lng = Column(Numeric(10, 7), nullable=True)  # 终点经度
    
    # 时间
    departure_time = Column(DateTime(timezone=True), nullable=True)  # 出发时间
    estimated_arrival = Column(DateTime(timezone=True), nullable=True)  # 预计到达
    actual_arrival = Column(DateTime(timezone=True), nullable=True)  # 实际到达
    
    # 距离和ETA
    total_distance = Column(Numeric(10, 2), nullable=True)  # 总距离(km)
    eta_minutes = Column(Integer, nullable=True)  # 预计时长(分钟)
    
    # 状态
    status = Column(Enum(ShipmentStatus), default=ShipmentStatus.planned)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    delivery_person = relationship("DeliveryPerson", back_populates="shipments")
    origin_warehouse = relationship("Warehouse", back_populates="shipments")
    orders = relationship("SalesOrder", back_populates="shipment")  # 一对多：一个运输单包含多个订单
