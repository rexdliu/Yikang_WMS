"""
波次管理 API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.crud.wave import wave_crud
from app.schemas.wave import (
    WaveCreate, WaveUpdate, WaveResponse, WaveWithOrders, WaveGenerateRequest
)

router = APIRouter()


@router.get("/", response_model=List[WaveResponse])
def get_waves(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取波次列表"""
    waves = wave_crud.get_multi(db, skip=skip, limit=limit, status=status)
    return waves


@router.get("/{wave_id}", response_model=WaveWithOrders)
def get_wave(wave_id: int, db: Session = Depends(get_db)):
    """获取波次详情（包含订单）"""
    wave = wave_crud.get(db, wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    
    # 获取关联订单
    orders = wave_crud.get_wave_orders(db, wave_id)
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
        **wave.__dict__,
        "orders": order_list
    }


@router.post("/generate", response_model=List[WaveResponse])
def generate_waves(
    request: WaveGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    自动生成波次
    
    根据过滤规则将待处理订单分组生成波次
    如果指定了 order_ids，则只处理这些订单
    """
    if request.order_ids:
        # 手动指定订单的波次生成
        # 按仓库分组创建波次
        from app.models.sales import SalesOrder
        orders = db.query(SalesOrder).filter(SalesOrder.id.in_(request.order_ids)).all()
        
        # 按仓库分组
        groups = {}
        for order in orders:
            wh_id = order.warehouse_id or 0
            if wh_id not in groups:
                groups[wh_id] = []
            groups[wh_id].append(order.id)
        
        waves = []
        for wh_id, order_ids in groups.items():
            for i in range(0, len(order_ids), request.max_orders_per_wave):
                batch = order_ids[i:i + request.max_orders_per_wave]
                wave = wave_crud.create(
                    db,
                    warehouse_id=wh_id if wh_id else None,
                    region=request.region
                )
                wave_crud.add_orders_to_wave(db, wave.id, batch)
                waves.append(wave)
        return waves
    
    # 自动生成波次
    waves = wave_crud.auto_generate_waves(
        db,
        region=request.region,
        warehouse_id=request.warehouse_id,
        max_orders_per_wave=request.max_orders_per_wave
    )
    return waves


@router.post("/", response_model=WaveResponse)
def create_wave(
    request: WaveCreate,
    db: Session = Depends(get_db)
):
    """手动创建波次"""
    wave = wave_crud.create(
        db,
        carrier=request.carrier,
        region=request.region,
        warehouse_id=request.warehouse_id,
        priority=request.priority,
        notes=request.notes
    )
    
    # 如果指定了订单，添加到波次
    if request.order_ids:
        wave = wave_crud.add_orders_to_wave(db, wave.id, request.order_ids)
    
    return wave


@router.put("/{wave_id}/release", response_model=WaveResponse)
def release_wave(wave_id: int, db: Session = Depends(get_db)):
    """释放波次开始执行"""
    try:
        wave = wave_crud.release_wave(db, wave_id)
        return wave
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{wave_id}/complete", response_model=WaveResponse)
def complete_wave(wave_id: int, db: Session = Depends(get_db)):
    """完成波次"""
    try:
        wave = wave_crud.complete_wave(db, wave_id)
        return wave
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{wave_id}/orders")
def add_orders_to_wave(
    wave_id: int,
    order_ids: List[int],
    db: Session = Depends(get_db)
):
    """向波次添加订单"""
    try:
        wave = wave_crud.add_orders_to_wave(db, wave_id, order_ids)
        return {"message": f"Added {len(order_ids)} orders to wave", "wave_id": wave.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{wave_id}/orders")
def get_wave_orders(wave_id: int, db: Session = Depends(get_db)):
    """获取波次包含的订单"""
    wave = wave_crud.get(db, wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    
    orders = wave_crud.get_wave_orders(db, wave_id)
    return [
        {
            "id": o.id,
            "order_code": o.order_code,
            "product_name": o.product_name,
            "quantity": o.quantity,
            "total_value": o.total_value,
            "status": o.status,
            "warehouse_id": o.warehouse_id
        }
        for o in orders
    ]
