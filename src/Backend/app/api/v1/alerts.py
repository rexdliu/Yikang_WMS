"""库存警报 API"""

from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.models.inventory import Inventory, Warehouse
from app.models.product import Product
from app.utils.activity import log_activity
from app.utils.notification import send_notification_to_managers
from pydantic import BaseModel


class LowStockAlert(BaseModel):
    """低库存警报模型"""
    product_id: int
    product_name: str
    warehouse_id: int
    warehouse_name: str
    current_quantity: int
    min_stock_level: int
    shortage: int


router = APIRouter()


@router.post("/check-low-stock")
def check_low_stock_and_alert(
    db: Session = Depends(get_db)
) -> Any:
    """
    检查低库存并自动创建警报

    扫描所有库存记录，找出低于最低库存预警线的产品
    为每个低库存产品创建活动日志警报
    """
    # 查询所有低于最低库存水平的库存记录
    low_stock_items = db.query(Inventory, Product, Warehouse).join(
        Product, Inventory.product_id == Product.id
    ).join(
        Warehouse, Inventory.warehouse_id == Warehouse.id
    ).filter(
        and_(
            Inventory.quantity < Product.min_stock_level,
            Inventory.quantity >= 0,
            Product.is_active == True
        )
    ).all()

    alerts_created = 0
    alert_details: List[LowStockAlert] = []

    for inventory, product, warehouse in low_stock_items:
        shortage = product.min_stock_level - inventory.quantity

        # 创建警报活动日志
        item_name = f"{product.name} - {warehouse.name}"

        # 检查是否最近已经为此产品创建过警报（避免重复）
        # 这里简化处理，每次检查都会创建新警报
        # 实际应用中可以添加时间窗口检查

        if inventory.quantity == 0:
            action = "缺货警报"
            log_activity(
                db=db,
                activity_type="alert",
                action=action,
                item_name=item_name,
                user_id=None,  # 系统自动生成的警报
                reference_id=product.id,
                reference_type="product"
            )
            # 发送缺货通知给管理员
            send_notification_to_managers(
                db=db,
                title="缺货警报",
                message=f"{product.name} 在 {warehouse.name} 已缺货，请尽快补货",
                notification_type="alert",
                reference_id=product.id,
                reference_type="product"
            )
        else:
            action = "低库存警报"
            log_activity(
                db=db,
                activity_type="alert",
                action=action,
                item_name=item_name,
                user_id=None,
                reference_id=product.id,
                reference_type="product"
            )
            # 发送低库存通知给管理员
            send_notification_to_managers(
                db=db,
                title="低库存警报",
                message=f"{product.name} 在 {warehouse.name} 库存不足（当前：{inventory.quantity}，最低：{product.min_stock_level}），缺货 {shortage} 件",
                notification_type="alert",
                reference_id=product.id,
                reference_type="product"
            )

        alerts_created += 1
        alert_details.append(LowStockAlert(
            product_id=product.id,
            product_name=product.name,
            warehouse_id=warehouse.id,
            warehouse_name=warehouse.name,
            current_quantity=inventory.quantity,
            min_stock_level=product.min_stock_level,
            shortage=shortage
        ))

    db.commit()

    return {
        "alerts_created": alerts_created,
        "details": alert_details
    }


@router.get("/low-stock-items", response_model=List[LowStockAlert])
def get_low_stock_items(
    db: Session = Depends(get_db)
) -> Any:
    """
    获取所有低库存产品列表

    返回当前库存低于最低预警线的所有产品
    """
    low_stock_items = db.query(Inventory, Product, Warehouse).join(
        Product, Inventory.product_id == Product.id
    ).join(
        Warehouse, Inventory.warehouse_id == Warehouse.id
    ).filter(
        and_(
            Inventory.quantity < Product.min_stock_level,
            Inventory.quantity >= 0,
            Product.is_active == True
        )
    ).all()

    alerts: List[LowStockAlert] = []

    for inventory, product, warehouse in low_stock_items:
        shortage = product.min_stock_level - inventory.quantity
        alerts.append(LowStockAlert(
            product_id=product.id,
            product_name=product.name,
            warehouse_id=warehouse.id,
            warehouse_name=warehouse.name,
            current_quantity=inventory.quantity,
            min_stock_level=product.min_stock_level,
            shortage=shortage
        ))

    return alerts
