"""全局搜索 API"""

from typing import Any, List, Dict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.product import Product
from app.models.sales import SalesOrder, Distributor
from app.models.inventory import Inventory, Warehouse
from pydantic import BaseModel


class SearchResult(BaseModel):
    """搜索结果模型"""
    type: str  # product, order, distributor, inventory
    id: int
    title: str
    subtitle: str
    url: str


router = APIRouter()


@router.get("/", response_model=List[SearchResult])
def global_search(
    db: Session = Depends(get_db),
    q: str = Query(..., min_length=1, description="搜索关键词"),
    limit: int = Query(20, le=50, description="返回结果数量限制")
) -> Any:
    """
    全局搜索功能

    搜索范围：
    - 产品（名称、SKU、零件号）
    - 订单（订单号、产品名称）
    - 经销商（名称、代码、区域）
    - 仓库（名称、代码）

    返回格式化的搜索结果，包含类型、标题、副标题和跳转链接
    """
    results: List[SearchResult] = []
    search_pattern = f"%{q.replace(' ', '%')}%"

    # 搜索产品
    products = db.query(Product).filter(
        or_(
            Product.name.like(search_pattern),
            Product.sku.like(search_pattern),
            Product.part_number.like(search_pattern)
        )
    ).limit(limit // 4).all()

    for product in products:
        results.append(SearchResult(
            type="product",
            id=product.id, # type: ignore[arg-type]
            title=product.name, # type: ignore[arg-type]
            subtitle=f"SKU: {product.sku} | 零件号: {product.part_number or 'N/A'}",
            url=f"/inventory?product_id={product.id}"
        ))

    # 搜索订单
    orders = db.query(SalesOrder).filter(
        or_(
            SalesOrder.order_code.like(search_pattern),
            SalesOrder.product_name.like(search_pattern)
        )
    ).limit(limit // 4).all()

    for order in orders:
        results.append(SearchResult(
            type="order",
            id=order.id, # type: ignore[arg-type]
            title=order.order_code, # type: ignore[arg-type]
            subtitle=f"产品: {order.product_name} | 状态: {order.status}",
            url=f"/sales/orders/{order.id}"
        ))

    # 搜索经销商
    distributors = db.query(Distributor).filter(
        or_(
            Distributor.name.like(search_pattern),
            Distributor.code.like(search_pattern),
            Distributor.region.like(search_pattern)
        )
    ).limit(limit // 4).all()

    for dist in distributors:
        results.append(SearchResult(
            type="distributor",
            id=dist.id, # type: ignore[arg-type]
            title=dist.name, # type: ignore[arg-type]
            subtitle=f"代码: {dist.code or 'N/A'} | 区域: {dist.region}",
            url=f"/sales/distributors/{dist.id}"
        ))

    # 搜索仓库
    warehouses = db.query(Warehouse).filter(
        or_(
            Warehouse.name.like(search_pattern),
            Warehouse.code.like(search_pattern)
        )
    ).limit(limit // 4).all()

    for wh in warehouses:
        results.append(SearchResult(
            type="warehouse",
            id=wh.id, # type: ignore[arg-type]
            title=wh.name, # type: ignore[arg-type]
            subtitle=f"代码: {wh.code or 'N/A'} | 位置: {wh.location or 'N/A'}",
            url=f"/inventory/warehouses/{wh.id}"
        ))

    # 限制总结果数量
    return results[:limit]
