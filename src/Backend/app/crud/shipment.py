"""
运输单 CRUD 操作
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from app.models.shipment import Shipment, ShipmentStatus
from app.models.sales import SalesOrder, DeliveryPerson
from app.models.inventory import Warehouse
from app.services.amap_service import get_amap_service


class CRUDShipment:
    """运输单 CRUD 操作"""
    
    def generate_shipment_code(self, db: Session) -> str:
        """生成运输单编号"""
        today = datetime.now().strftime("%Y%m%d")
        count = db.query(Shipment).filter(
            Shipment.shipment_code.like(f"SHP-{today}%")
        ).count()
        return f"SHP-{today}-{count + 1:03d}"
    
    def get(self, db: Session, shipment_id: int) -> Optional[Shipment]:
        """获取单个运输单"""
        return db.query(Shipment).filter(Shipment.id == shipment_id).first()
    
    def get_by_code(self, db: Session, shipment_code: str) -> Optional[Shipment]:
        """通过编号获取运输单"""
        return db.query(Shipment).filter(Shipment.shipment_code == shipment_code).first()
    
    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Shipment]:
        """获取运输单列表"""
        query = db.query(Shipment)
        if status:
            query = query.filter(Shipment.status == status)
        return query.order_by(Shipment.created_at.desc()).offset(skip).limit(limit).all()
    
    async def create(
        self, 
        db: Session, 
        origin_warehouse_id: int,
        destination_address: str,
        order_ids: List[int],
        delivery_person_id: Optional[int] = None,
        departure_time: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> Shipment:
        """
        创建运输单
        
        自动计算距离和ETA
        """
        # 获取仓库信息
        warehouse = db.query(Warehouse).filter(Warehouse.id == origin_warehouse_id).first()
        if not warehouse:
            raise ValueError(f"Warehouse {origin_warehouse_id} not found")
        
        origin_address = warehouse.location or warehouse.name
        
        # 使用高德API计算距离和ETA
        eta_info = None
        try:
            amap = get_amap_service()
            eta_info = await amap.calculate_eta(origin_address, destination_address, departure_time)
        except Exception as e:
            print(f"Failed to calculate ETA: {e}")
        
        # 创建运输单
        shipment = Shipment(
            shipment_code=self.generate_shipment_code(db),
            delivery_person_id=delivery_person_id,
            origin_warehouse_id=origin_warehouse_id,
            origin_address=origin_address,
            destination_address=destination_address,
            departure_time=departure_time,
            status=ShipmentStatus.planned,
            notes=notes
        )
        
        # 填充ETA信息
        if eta_info and "error" not in eta_info:
            shipment.origin_lat = eta_info["origin"]["lat"]
            shipment.origin_lng = eta_info["origin"]["lng"]
            shipment.destination_lat = eta_info["destination"]["lat"]
            shipment.destination_lng = eta_info["destination"]["lng"]
            shipment.total_distance = eta_info["distance_km"]
            shipment.eta_minutes = eta_info["eta_minutes"]
            if departure_time:
                shipment.estimated_arrival = datetime.fromisoformat(eta_info["estimated_arrival"])
        
        db.add(shipment)
        db.commit()
        db.refresh(shipment)
        
        # 关联订单
        if order_ids:
            db.query(SalesOrder).filter(
                SalesOrder.id.in_(order_ids)
            ).update({SalesOrder.shipment_id: shipment.id}, synchronize_session=False)
            db.commit()
        
        return shipment
    
    def update_status(
        self, 
        db: Session, 
        shipment_id: int, 
        status: ShipmentStatus,
        actual_arrival: Optional[datetime] = None
    ) -> Shipment:
        """更新运输单状态，并联动更新订单状态"""
        shipment = self.get(db, shipment_id)
        if not shipment:
            raise ValueError(f"Shipment {shipment_id} not found")
        
        shipment.status = status
        
        if status == ShipmentStatus.in_transit and not shipment.departure_time:
            shipment.departure_time = datetime.now()
        
        # 发车时：订单状态 -> shipped (已发货)
        if status == ShipmentStatus.in_transit:
            db.query(SalesOrder).filter(
                SalesOrder.shipment_id == shipment_id
            ).update({SalesOrder.status: "shipped"}, synchronize_session=False)
        
        # 送达时：订单状态 -> completed (已完成)
        if status == ShipmentStatus.delivered:
            shipment.actual_arrival = actual_arrival or datetime.now()
            db.query(SalesOrder).filter(
                SalesOrder.shipment_id == shipment_id
            ).update({
                SalesOrder.status: "completed",
                SalesOrder.completed_at: datetime.now()
            }, synchronize_session=False)
        
        db.commit()
        db.refresh(shipment)
        return shipment
    
    def get_shipment_orders(self, db: Session, shipment_id: int) -> List[SalesOrder]:
        """获取运输单包含的订单"""
        return db.query(SalesOrder).filter(SalesOrder.shipment_id == shipment_id).all()
    
    def get_tracking_info(self, db: Session, shipment_id: int) -> dict:
        """获取运输追踪信息"""
        shipment = self.get(db, shipment_id)
        if not shipment:
            raise ValueError(f"Shipment {shipment_id} not found")
        
        # 获取司机信息
        delivery_person = None
        vehicle_number = None
        if shipment.delivery_person_id:
            dp = db.query(DeliveryPerson).filter(
                DeliveryPerson.id == shipment.delivery_person_id
            ).first()
            if dp:
                delivery_person = dp.name
                vehicle_number = dp.vehicle_number
        
        # 获取仓库信息
        warehouse_name = ""
        if shipment.origin_warehouse_id:
            wh = db.query(Warehouse).filter(
                Warehouse.id == shipment.origin_warehouse_id
            ).first()
            if wh:
                warehouse_name = wh.name
        
        # 获取关联订单
        orders = self.get_shipment_orders(db, shipment_id)
        order_list = [
            {
                "order_code": o.order_code,
                "product_name": o.product_name,
                "quantity": o.quantity,
                "status": o.status
            }
            for o in orders
        ]
        
        return {
            "shipment_id": shipment.id,
            "shipment_code": shipment.shipment_code,
            "status": shipment.status.value,
            "origin_warehouse": warehouse_name,
            "destination_address": shipment.destination_address,
            "delivery_person": delivery_person,
            "vehicle_number": vehicle_number,
            "departure_time": shipment.departure_time,
            "estimated_arrival": shipment.estimated_arrival,
            "actual_arrival": shipment.actual_arrival,
            "total_distance_km": float(shipment.total_distance) if shipment.total_distance else None,
            "eta_minutes": shipment.eta_minutes,
            "orders": order_list
        }


# 单例
shipment_crud = CRUDShipment()
