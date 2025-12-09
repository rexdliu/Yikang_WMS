from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.crud.inventory import inventory as inventory_repo, warehouse as warehouse_repo
from app.schemas.inventory import (
    WarehouseCreate, WarehouseUpdate, WarehouseInDB,
    InventoryCreate, InventoryUpdate, InventoryInDB
)
from app.models.inventory import Inventory
from app.models.product import Product

router = APIRouter()
# 仓库相关API
@router.get("/warehouses", response_model=List[WarehouseInDB])
def read_warehouses(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """获取仓库列表"""
    warehouses = warehouse_repo.get_multi(db, skip=skip, limit=limit)
    return warehouses

@router.post("/warehouses", response_model=WarehouseInDB)
def create_warehouse(
    *,
    db: Session = Depends(get_db),
    warehouse_in: WarehouseCreate
) -> Any:
    """创建仓库"""
    warehouse = warehouse_repo.create(db, obj_in=warehouse_in)
    return warehouse

# 库存相关API
@router.get("/items", response_model=List[InventoryInDB])
def read_inventory_items(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="搜索产品名称、SKU或零件号")
) -> Any:
    """
    获取库存项目列表

    支持通过产品名称、SKU或零件号进行模糊搜索
    例如：搜索 "6BT 5.9" 可以匹配 "Cummins 6BT5.9 发动机总成"
    """
    query = db.query(Inventory).join(Product)

    if search:
        # 移除空格以支持灵活搜索 (如 "6BT 5.9" 可以匹配 "6BT5.9")
        search_pattern = f"%{search.replace(' ', '%')}%"
        query = query.filter(
            or_(
                Product.name.like(search_pattern),
                Product.sku.like(search_pattern),
                Product.part_number.like(search_pattern)
            )
        )

    items = query.offset(skip).limit(limit).all()
    return items

@router.get("/items/{id}", response_model=InventoryInDB)
def read_inventory_item(
    *,
    db: Session = Depends(get_db),
    id: int
) -> Any:
    """获取特定库存项目"""
    item = inventory_repo.get(db, id=id)
    if not item:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )
    return item

@router.put("/items/{id}", response_model=InventoryInDB)
def update_inventory_item(
    *,
    db: Session = Depends(get_db),
    id: int,
    item_in: InventoryUpdate
) -> Any:
    """更新库存项目"""
    item = inventory_repo.get(db, id=id)
    if not item:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )
    item = inventory_repo.update(db, db_obj=item, obj_in=item_in)
    return item
