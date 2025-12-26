"""
库存分析服务

提供实时库存数据分析，用于注入到 AI 对话上下文
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from app.models.product import Product
from app.models.inventory import Inventory, Warehouse
from app.models.sales import SalesOrder


class InventoryAnalyzer:
    """库存分析服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_context_summary(self) -> str:
        """获取库存概览，用于 AI 对话上下文"""
        try:
            # 产品总数
            product_count = self.db.query(func.count(Product.id)).scalar() or 0
            
            # 库存总量和总价值
            inventory_stats = self.db.query(
                func.sum(Inventory.quantity),
                func.sum(Inventory.quantity * Product.cost_price)
            ).join(Product, Inventory.product_id == Product.id).first()
            
            total_quantity = inventory_stats[0] or 0
            total_value = inventory_stats[1] or 0
            
            # 仓库数量
            warehouse_count = self.db.query(func.count(Warehouse.id)).filter(
                Warehouse.is_active == True
            ).scalar() or 0
            
            # 低库存预警（库存低于安全库存的产品）
            low_stock_count = self.db.query(func.count(Inventory.id)).filter(
                Inventory.quantity < Inventory.safety_stock
            ).scalar() or 0
            
            # 今日订单数
            from datetime import datetime, timedelta
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_orders = self.db.query(func.count(SalesOrder.id)).filter(
                SalesOrder.created_at >= today
            ).scalar() or 0
            
            context = f"""当前库存概览:
- 产品种类: {product_count} 种
- 库存总量: {total_quantity:,.0f} 件
- 库存总价值: ¥{total_value:,.2f}
- 活跃仓库: {warehouse_count} 个
- 低库存预警: {low_stock_count} 种产品
- 今日订单: {today_orders} 笔"""
            
            return context
        except Exception as e:
            print(f"[InventoryAnalyzer] Error getting context: {e}")
            return "库存数据获取失败"
    
    def get_low_stock_items(self, limit: int = 10) -> List[Dict[str, Any]]:
        """获取低库存产品列表"""
        results = self.db.query(
            Product.name,
            Product.sku,
            Inventory.quantity,
            Inventory.safety_stock,
            Warehouse.name.label('warehouse_name')
        ).join(
            Inventory, Product.id == Inventory.product_id
        ).outerjoin(
            Warehouse, Inventory.warehouse_id == Warehouse.id
        ).filter(
            Inventory.quantity < Inventory.safety_stock
        ).order_by(
            (Inventory.quantity - Inventory.safety_stock).asc()
        ).limit(limit).all()
        
        return [
            {
                "product_name": r.name,
                "sku": r.sku,
                "current_stock": r.quantity,
                "safety_stock": r.safety_stock,
                "warehouse": r.warehouse_name,
                "shortage": r.safety_stock - r.quantity
            }
            for r in results
        ]
    
    def get_inventory_by_warehouse(self) -> List[Dict[str, Any]]:
        """按仓库统计库存"""
        results = self.db.query(
            Warehouse.name,
            func.count(Inventory.id).label('product_count'),
            func.sum(Inventory.quantity).label('total_quantity')
        ).outerjoin(
            Inventory, Warehouse.id == Inventory.warehouse_id
        ).filter(
            Warehouse.is_active == True
        ).group_by(
            Warehouse.id
        ).all()
        
        return [
            {
                "warehouse": r.name,
                "product_count": r.product_count or 0,
                "total_quantity": r.total_quantity or 0
            }
            for r in results
        ]
    
    def get_top_products_by_stock(self, limit: int = 10) -> List[Dict[str, Any]]:
        """获取库存最多的产品"""
        results = self.db.query(
            Product.name,
            Product.sku,
            func.sum(Inventory.quantity).label('total_stock')
        ).join(
            Inventory, Product.id == Inventory.product_id
        ).group_by(
            Product.id
        ).order_by(
            func.sum(Inventory.quantity).desc()
        ).limit(limit).all()
        
        return [
            {
                "product_name": r.name,
                "sku": r.sku,
                "total_stock": r.total_stock
            }
            for r in results
        ]
