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
                func.sum(Inventory.quantity * Product.cost)
            ).join(Product, Inventory.product_id == Product.id).first()
            
            total_quantity = inventory_stats[0] or 0
            total_value = inventory_stats[1] or 0
            
            # 仓库数量
            warehouse_count = self.db.query(func.count(Warehouse.id)).filter(
                Warehouse.is_active == True
            ).scalar() or 0
            
            # 低库存预警（库存低于最低库存线的产品）
            low_stock_subq = self.db.query(
                func.sum(Inventory.quantity).label('total_qty'),
                Product.min_stock_level,
                Product.id
            ).join(
                Product, Inventory.product_id == Product.id
            ).group_by(Product.id).subquery()
            
            low_stock_count = self.db.query(func.count()).filter(
                low_stock_subq.c.total_qty < low_stock_subq.c.min_stock_level
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
        # 先按产品聚合库存
        results = self.db.query(
            Product.name,
            Product.sku,
            Product.min_stock_level,
            func.sum(Inventory.quantity).label('total_quantity')
        ).join(
            Inventory, Product.id == Inventory.product_id
        ).group_by(
            Product.id
        ).having(
            func.sum(Inventory.quantity) < Product.min_stock_level
        ).order_by(
            (func.sum(Inventory.quantity) - Product.min_stock_level).asc()
        ).limit(limit).all()
        
        return [
            {
                "product_name": r.name,
                "sku": r.sku,
                "current_stock": r.total_quantity,
                "min_stock_level": r.min_stock_level,
                "shortage": r.min_stock_level - r.total_quantity
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
    
    def search_products(self, keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
        """根据关键词搜索产品信息"""
        results = self.db.query(
            Product.name,
            Product.sku,
            Product.description,
            Product.cost_price,
            Product.selling_price,
            func.sum(Inventory.quantity).label('total_stock')
        ).outerjoin(
            Inventory, Product.id == Inventory.product_id
        ).filter(
            (Product.name.ilike(f'%{keyword}%')) | 
            (Product.sku.ilike(f'%{keyword}%'))
        ).group_by(
            Product.id
        ).limit(limit).all()
        
        return [
            {
                "name": r.name,
                "sku": r.sku,
                "description": r.description,
                "cost_price": float(r.cost_price) if r.cost_price else 0,
                "selling_price": float(r.selling_price) if r.selling_price else 0,
                "stock": r.total_stock or 0
            }
            for r in results
        ]
    
    def get_sales_trend(self, days: int = 7) -> Dict[str, Any]:
        """获取销售趋势"""
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # 按天统计订单数和销售额
        daily_stats = self.db.query(
            func.date(SalesOrder.created_at).label('date'),
            func.count(SalesOrder.id).label('order_count'),
            func.sum(SalesOrder.total_amount).label('revenue')
        ).filter(
            SalesOrder.created_at >= start_date,
            SalesOrder.created_at <= end_date
        ).group_by(
            func.date(SalesOrder.created_at)
        ).order_by(
            func.date(SalesOrder.created_at)
        ).all()
        
        return {
            "period": f"最近{days}天",
            "daily_data": [
                {
                    "date": str(r.date),
                    "orders": r.order_count,
                    "revenue": float(r.revenue) if r.revenue else 0
                }
                for r in daily_stats
            ],
            "total_orders": sum(r.order_count for r in daily_stats),
            "total_revenue": sum(float(r.revenue) if r.revenue else 0 for r in daily_stats)
        }
    
    def query_by_intent(self, message: str) -> str:
        """
        根据用户消息意图智能查询数据库
        
        返回格式化的上下文字符串供 AI 使用
        """
        message_lower = message.lower()
        context_parts = []
        
        # 1. 基础库存概览 - 任何库存相关问题都提供
        if any(kw in message_lower for kw in ['库存', '仓库', '存货', '概览', '总览', '情况']):
            context_parts.append(self.get_context_summary())
        
        # 2. 低库存/预警/缺货查询
        if any(kw in message_lower for kw in ['低库存', '缺货', '预警', '不足', '补货', '紧缺']):
            low_stock = self.get_low_stock_items(limit=5)
            if low_stock:
                items_text = "\n".join([
                    f"  - {item['product_name']} (SKU: {item['sku']}): 当前 {item['current_stock']} 件, 最低库存 {item['min_stock_level']} 件, 缺口 {item['shortage']} 件"
                    for item in low_stock
                ])
                context_parts.append(f"低库存产品预警:\n{items_text}")
            else:
                context_parts.append("当前没有低库存预警的产品。")
        
        # 3. 仓库库存分布
        if any(kw in message_lower for kw in ['仓库', '分布', '各仓', '哪个仓']):
            warehouse_stats = self.get_inventory_by_warehouse()
            if warehouse_stats:
                items_text = "\n".join([
                    f"  - {item['warehouse']}: {item['product_count']} 种产品, 共 {item['total_quantity']} 件"
                    for item in warehouse_stats
                ])
                context_parts.append(f"各仓库库存分布:\n{items_text}")
        
        # 4. 产品搜索 - 提取可能的产品名
        product_keywords = ['产品', '商品', '货品', 'iphone', 'samsung', '手机', '电脑', '椅子', '办公']
        for kw in product_keywords:
            if kw in message_lower and kw not in ['产品', '商品', '货品']:
                products = self.search_products(kw, limit=3)
                if products:
                    items_text = "\n".join([
                        f"  - {p['name']} (SKU: {p['sku']}): 库存 {p['stock']} 件, 售价 ¥{p['selling_price']}"
                        for p in products
                    ])
                    context_parts.append(f"找到的相关产品:\n{items_text}")
                break
        
        # 5. 销售/订单趋势
        if any(kw in message_lower for kw in ['销售', '订单', '趋势', '业绩', '收入', '营收']):
            trend = self.get_sales_trend(days=7)
            context_parts.append(
                f"销售趋势 ({trend['period']}):\n"
                f"  - 总订单数: {trend['total_orders']} 笔\n"
                f"  - 总收入: ¥{trend['total_revenue']:,.2f}"
            )
        
        # 6. 库存最多的产品
        if any(kw in message_lower for kw in ['最多', '库存高', '库存量']):
            top_products = self.get_top_products_by_stock(limit=5)
            if top_products:
                items_text = "\n".join([
                    f"  - {p['product_name']} (SKU: {p['sku']}): {p['total_stock']} 件"
                    for p in top_products
                ])
                context_parts.append(f"库存量最高的产品:\n{items_text}")
        
        # 如果没有匹配到特定意图，返回基础概览
        if not context_parts:
            context_parts.append(self.get_context_summary())
        
        return "\n\n".join(context_parts)
