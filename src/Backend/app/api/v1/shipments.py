"""
运输单管理 API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.crud.shipment import shipment_crud
from app.schemas.shipment import (
    ShipmentCreate, ShipmentUpdate, ShipmentResponse, 
    ShipmentWithOrders, ShipmentTrackingResponse, ShipmentStatus
)

router = APIRouter()


@router.get("/", response_model=List[ShipmentResponse])
def get_shipments(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取运输单列表"""
    shipments = shipment_crud.get_multi(db, skip=skip, limit=limit, status=status)
    
    result = []
    for s in shipments:
        # 获取订单数量
        orders = shipment_crud.get_shipment_orders(db, s.id)
        
        result.append({
            **s.__dict__,
            "delivery_person_name": s.delivery_person.name if s.delivery_person else None,
            "warehouse_name": s.origin_warehouse.name if s.origin_warehouse else None,
            "order_count": len(orders)
        })
    
    return result


@router.get("/{shipment_id}", response_model=ShipmentWithOrders)
def get_shipment(shipment_id: int, db: Session = Depends(get_db)):
    """获取运输单详情（包含订单）"""
    shipment = shipment_crud.get(db, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    orders = shipment_crud.get_shipment_orders(db, shipment_id)
    order_list = [
        {
            "id": o.id,
            "order_code": o.order_code,
            "product_name": o.product_name,
            "quantity": o.quantity,
            "status": o.status
        }
        for o in orders
    ]
    
    return {
        **shipment.__dict__,
        "delivery_person_name": shipment.delivery_person.name if shipment.delivery_person else None,
        "warehouse_name": shipment.origin_warehouse.name if shipment.origin_warehouse else None,
        "order_count": len(orders),
        "orders": order_list
    }


@router.post("/", response_model=ShipmentResponse)
async def create_shipment(
    request: ShipmentCreate,
    db: Session = Depends(get_db)
):
    """
    创建运输单
    
    自动使用高德API计算距离和预计到达时间
    """
    try:
        shipment = await shipment_crud.create(
            db,
            origin_warehouse_id=request.origin_warehouse_id,
            destination_address=request.destination_address,
            order_ids=request.order_ids,
            delivery_person_id=request.delivery_person_id,
            departure_time=request.departure_time,
            notes=request.notes
        )
        
        orders = shipment_crud.get_shipment_orders(db, shipment.id)
        
        return {
            **shipment.__dict__,
            "delivery_person_name": shipment.delivery_person.name if shipment.delivery_person else None,
            "warehouse_name": shipment.origin_warehouse.name if shipment.origin_warehouse else None,
            "order_count": len(orders)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{shipment_id}/status")
def update_shipment_status(
    shipment_id: int,
    status: ShipmentStatus,
    db: Session = Depends(get_db)
):
    """更新运输单状态"""
    try:
        actual_arrival = datetime.now() if status == ShipmentStatus.delivered else None
        shipment = shipment_crud.update_status(db, shipment_id, status, actual_arrival)
        return {"message": f"Shipment status updated to {status.value}", "shipment_id": shipment.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{shipment_id}/tracking", response_model=ShipmentTrackingResponse)
def get_shipment_tracking(shipment_id: int, db: Session = Depends(get_db)):
    """获取运输追踪信息"""
    try:
        tracking = shipment_crud.get_tracking_info(db, shipment_id)
        return tracking
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{shipment_id}/orders")
def get_shipment_orders(shipment_id: int, db: Session = Depends(get_db)):
    """获取运输单包含的订单"""
    shipment = shipment_crud.get(db, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    orders = shipment_crud.get_shipment_orders(db, shipment_id)
    return [
        {
            "id": o.id,
            "order_code": o.order_code,
            "product_name": o.product_name,
            "quantity": o.quantity,
            "total_value": o.total_value,
            "status": o.status
        }
        for o in orders
    ]


from pydantic import BaseModel
from app.models.sales import SalesOrder, Distributor
from app.models.inventory import Warehouse
from app.services.amap_service import get_amap_service


class RouteCalculateRequest(BaseModel):
    warehouse_id: int
    order_ids: List[int]


class RoutePoint(BaseModel):
    order_id: Optional[int] = None
    order_code: Optional[str] = None
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_origin: bool = False
    sequence: int = 0


class RouteCalculateResponse(BaseModel):
    origin: RoutePoint
    destinations: List[RoutePoint]
    total_distance_km: Optional[float] = None
    total_eta_minutes: Optional[int] = None
    route_polyline: Optional[str] = None


@router.post("/calculate-route", response_model=RouteCalculateResponse)
async def calculate_route(
    request: RouteCalculateRequest,
    db: Session = Depends(get_db)
):
    """
    计算多点配送路线
    
    根据起点仓库和多个订单的收货地址，计算最优配送路线
    返回路线顺序、总距离和预计时间
    """
    # 获取仓库信息
    warehouse = db.query(Warehouse).filter(Warehouse.id == request.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="仓库不存在")
    
    origin = RoutePoint(
        address=warehouse.location or warehouse.name,
        lat=float(warehouse.lat) if warehouse.lat else None,
        lng=float(warehouse.lng) if warehouse.lng else None,
        is_origin=True,
        sequence=0
    )
    
    # 获取订单及其收货地址
    orders = db.query(SalesOrder).filter(SalesOrder.id.in_(request.order_ids)).all()
    if not orders:
        raise HTTPException(status_code=400, detail="未找到指定订单")
    
    destinations = []
    for idx, order in enumerate(orders):
        # 优先使用订单的收货地址，否则使用经销商地址
        address = order.delivery_address
        lat = float(order.delivery_lat) if order.delivery_lat else None
        lng = float(order.delivery_lng) if order.delivery_lng else None
        
        if not address:
            # 从经销商获取地址
            distributor = db.query(Distributor).filter(Distributor.id == order.distributor_id).first()
            if distributor:
                address = distributor.address or f"{distributor.region} {distributor.name}"
        
        destinations.append(RoutePoint(
            order_id=order.id,
            order_code=order.order_code,
            address=address or "地址未知",
            lat=lat,
            lng=lng,
            is_origin=False,
            sequence=idx + 1
        ))
    
    # 使用高德API计算路线
    total_distance = None
    total_eta = None
    
    try:
        amap = get_amap_service()
        
        # 先获取起点坐标
        if not origin.lat or not origin.lng:
            origin_geo = await amap.geocode(origin.address)
            if origin_geo:
                origin.lat = origin_geo.get("lat")
                origin.lng = origin_geo.get("lng")
                print(f"Origin geocoded: {origin.address} -> ({origin.lat}, {origin.lng})")
        
        # 获取所有目的地的坐标
        for dest in destinations:
            if not dest.lat or not dest.lng:
                dest_geo = await amap.geocode(dest.address)
                if dest_geo:
                    dest.lat = dest_geo.get("lat")
                    dest.lng = dest_geo.get("lng")
                    print(f"Destination geocoded: {dest.address} -> ({dest.lat}, {dest.lng})")
        
        # 使用最近邻算法优化路线顺序
        if len(destinations) > 1 and origin.lat and origin.lng:
            print(f"Optimizing route for {len(destinations)} destinations from origin ({origin.lat}, {origin.lng})")
            
            def calc_distance(lat1, lng1, lat2, lng2):
                """计算两点距离（简化版，使用坐标差的欧氏距离）"""
                if not all([lat1, lng1, lat2, lng2]):
                    return float('inf')
                try:
                    return ((float(lat2) - float(lat1)) ** 2 + (float(lng2) - float(lng1)) ** 2) ** 0.5
                except:
                    return float('inf')
            
            optimized = []
            remaining = list(destinations)
            current_lat, current_lng = float(origin.lat), float(origin.lng)
            
            while remaining:
                # 找到距当前点最近的目的地
                nearest = min(remaining, key=lambda d: calc_distance(
                    current_lat, current_lng, 
                    d.lat if d.lat else 0, d.lng if d.lng else 0
                ))
                remaining.remove(nearest)
                nearest.sequence = len(optimized) + 1
                optimized.append(nearest)
                print(f"  Step {len(optimized)}: {nearest.order_code} at ({nearest.lat}, {nearest.lng})")
                if nearest.lat and nearest.lng:
                    current_lat, current_lng = float(nearest.lat), float(nearest.lng)
            
            destinations = optimized
            print(f"Route optimized: {[d.order_code for d in destinations]}")
        
        # 计算总距离和时间
        if len(destinations) == 1:
            eta_info = await amap.calculate_eta(origin.address, destinations[0].address)
            if eta_info and "error" not in eta_info:
                total_distance = eta_info.get("distance_km")
                total_eta = eta_info.get("eta_minutes")
        else:
            total_distance = 0
            total_eta = 0
            current_point = origin.address
            for dest in destinations:
                eta_info = await amap.calculate_eta(current_point, dest.address)
                if eta_info and "error" not in eta_info:
                    total_distance += eta_info.get("distance_km", 0)
                    total_eta += eta_info.get("eta_minutes", 0)
                current_point = dest.address
                
    except Exception as e:
        print(f"Route calculation error: {e}")
    
    return RouteCalculateResponse(
        origin=origin,
        destinations=destinations,
        total_distance_km=total_distance,
        total_eta_minutes=total_eta
    )
