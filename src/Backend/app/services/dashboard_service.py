"""
Dashboard 服务

该模块提供仪表板数据聚合的业务逻辑。
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
from datetime import datetime, timedelta

from app.models.product import Product
from app.models.inventory import Inventory, Warehouse
from app.models.sales import SalesOrder
from app.models.activity_log import ActivityLog
from app.schemas.dashboard import (
    DashboardStats,
    StockStatus,
    ActivityLogResponse,
    InventoryAlert,
    TopProduct,
    WarehouseUtilization,
    OrderStatusDistribution,
    DashboardResponse,
)


class DashboardService:
    """仪表板服务类"""

    @staticmethod
    def get_dashboard_stats(db: Session) -> DashboardStats:
        """
        获取仪表板统计数据

        Args:
            db: 数据库会话

        Returns:
            DashboardStats: 统计数据
        """
        # 产品总数
        total_products = db.query(Product).filter(Product.is_active == True).count()  # type: ignore[arg-type]

        # 库存总量
        total_inventory_result = db.query(func.sum(Inventory.quantity)).scalar()
        total_inventory = int(total_inventory_result) if total_inventory_result else 0

        # 低库存商品数（库存低于最低库存水平）
        low_stock_items = (
            db.query(Inventory)
            .join(Product, Inventory.product_id == Product.id)
            .filter(
                Inventory.quantity <= Product.min_stock_level,  # type: ignore[arg-type]
                Inventory.quantity > 0,  # type: ignore[arg-type]
            )
            .count()
        )

        # 缺货商品数
        out_of_stock = db.query(Inventory).filter(Inventory.quantity == 0).count()  # type: ignore[arg-type]

        # 仓库总数
        total_warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).count()  # type: ignore[arg-type]

        # 待处理订单数
        pending_orders = (
            db.query(SalesOrder)
            .filter(SalesOrder.status.in_(["pending", "processing"]))  # type: ignore[arg-type]
            .count()
        )

        # 库存总价值（库存数量 × 产品价格）
        inventory_value_result = (
            db.query(func.sum(Inventory.quantity * Product.price))
            .join(Product, Inventory.product_id == Product.id)
            .scalar()
        )
        inventory_value = float(inventory_value_result) if inventory_value_result else 0.0

        return DashboardStats(
            total_products=total_products,
            total_inventory=total_inventory,
            low_stock_items=low_stock_items,
            out_of_stock=out_of_stock,
            total_warehouses=total_warehouses,
            pending_orders=pending_orders,
            total_inventory_value=round(inventory_value, 2),
        )

    @staticmethod
    def get_stock_status(db: Session) -> List[StockStatus]:
        """
        获取库存状态分布

        Args:
            db: 数据库会话

        Returns:
            List[StockStatus]: 库存状态列表
        """
        total_products = db.query(Inventory).count()
        if total_products == 0:
            return []

        # 正常库存
        normal_stock = (
            db.query(Inventory)
            .join(Product, Inventory.product_id == Product.id)
            .filter(Inventory.quantity > Product.min_stock_level)  # type: ignore[arg-type]
            .count()
        )

        # 低库存
        low_stock = (
            db.query(Inventory)
            .join(Product, Inventory.product_id == Product.id)
            .filter(
                Inventory.quantity <= Product.min_stock_level,  # type: ignore[arg-type]
                Inventory.quantity > 0,  # type: ignore[arg-type]
            )
            .count()
        )

        # 缺货
        out_of_stock = db.query(Inventory).filter(Inventory.quantity == 0).count()  # type: ignore[arg-type]

        return [
            StockStatus(
                status="正常",
                count=normal_stock,
                percentage=round((normal_stock / total_products) * 100, 2),
            ),
            StockStatus(
                status="低库存",
                count=low_stock,
                percentage=round((low_stock / total_products) * 100, 2),
            ),
            StockStatus(
                status="缺货",
                count=out_of_stock,
                percentage=round((out_of_stock / total_products) * 100, 2),
            ),
        ]

    @staticmethod
    def get_recent_activities(db: Session, limit: int = 10) -> List[ActivityLogResponse]:
        """
        获取最近活动记录

        Args:
            db: 数据库会话
            limit: 返回记录数量限制

        Returns:
            List[ActivityLogResponse]: 活动记录列表
        """
        activities = (
            db.query(ActivityLog)
            .order_by(desc(ActivityLog.created_at))
            .limit(limit)
            .all()
        )

        return [ActivityLogResponse.from_orm(activity) for activity in activities]

    @staticmethod
    def get_inventory_alerts(db: Session, limit: int = 20) -> List[InventoryAlert]:
        """
        获取库存警报

        Args:
            db: 数据库会话
            limit: 返回记录数量限制

        Returns:
            List[InventoryAlert]: 库存警报列表
        """
        alerts = []

        # 查询低库存和缺货商品
        low_stock_items = (
            db.query(Inventory, Product, Warehouse)
            .join(Product, Inventory.product_id == Product.id)
            .join(Warehouse, Inventory.warehouse_id == Warehouse.id)
            .filter(Inventory.quantity <= Product.min_stock_level)  # type: ignore[arg-type]
            .order_by(Inventory.quantity)
            .limit(limit)
            .all()
        )

        for inventory, product, warehouse in low_stock_items:
            alert_type = "out_of_stock" if inventory.quantity == 0 else "low_stock"  # type: ignore[comparison-overlap]
            severity = "critical" if inventory.quantity == 0 else "warning"  # type: ignore[comparison-overlap]

            alerts.append(
                InventoryAlert(
                    id=inventory.id,
                    product_id=product.id,
                    product_name=product.name,
                    product_sku=product.sku,
                    warehouse_name=warehouse.name,
                    current_quantity=inventory.quantity,
                    min_stock_level=product.min_stock_level,
                    alert_type=alert_type,
                    severity=severity,
                )
            )

        return alerts

    @staticmethod
    def get_top_products(db: Session, limit: int = 5, days: int = 30) -> List[TopProduct]:
        """
        获取热门产品（按销量）

        Args:
            db: 数据库会话
            limit: 返回记录数量限制
            days: 统计天数

        Returns:
            List[TopProduct]: 热门产品列表
        """
        start_date = datetime.now() - timedelta(days=days)

        top_products = (
            db.query(
                SalesOrder.product_id,
                SalesOrder.product_name,
                Product.sku,
                func.sum(SalesOrder.quantity).label("total_sold"),
                func.sum(SalesOrder.total_value).label("total_revenue"),
            )
            .join(Product, SalesOrder.product_id == Product.id)
            .filter(SalesOrder.order_date >= start_date)  # type: ignore[arg-type]
            .filter(SalesOrder.status != "cancelled")  # type: ignore[arg-type]
            .group_by(SalesOrder.product_id, SalesOrder.product_name, Product.sku)
            .order_by(desc("total_sold"))
            .limit(limit)
            .all()
        )

        return [
            TopProduct(
                product_id=p.product_id,
                product_name=p.product_name,
                sku=p.sku,
                total_sold=p.total_sold,
                total_revenue=round(p.total_revenue, 2),
            )
            for p in top_products
        ]

    @staticmethod
    def get_warehouse_utilization(db: Session) -> List[WarehouseUtilization]:
        """
        获取仓库利用率

        Args:
            db: 数据库会话

        Returns:
            List[WarehouseUtilization]: 仓库利用率列表
        """
        warehouses = db.query(Warehouse).filter(Warehouse.is_active == True).all()  # type: ignore[arg-type]

        utilization_list = []
        for warehouse in warehouses:
            # 获取实际值并进行类型转换
            capacity = float(warehouse.capacity) if warehouse.capacity else 0.0  # type: ignore[truthy-bool]
            current_usage = float(warehouse.current_usage) if warehouse.current_usage else 0.0  # type: ignore[truthy-bool]

            if capacity > 0:
                utilization_rate = round((current_usage / capacity) * 100, 2)
            else:
                utilization_rate = 0.0

            utilization_list.append(
                WarehouseUtilization(
                    warehouse_id=warehouse.id,  # type: ignore[arg-type]
                    warehouse_name=warehouse.name,  # type: ignore[arg-type]
                    warehouse_code=warehouse.code if warehouse.code else f"WH{warehouse.id:03d}",  # type: ignore[arg-type,truthy-bool]
                    capacity=capacity,
                    current_usage=current_usage,
                    utilization_rate=float(utilization_rate),
                )
            )

        return utilization_list

    @staticmethod
    def get_order_status_distribution(db: Session) -> List[OrderStatusDistribution]:
        """
        获取订单状态分布

        Args:
            db: 数据库会话

        Returns:
            List[OrderStatusDistribution]: 订单状态分布列表
        """
        order_stats = (
            db.query(
                SalesOrder.status,
                func.count(SalesOrder.id).label("count"),
                func.sum(SalesOrder.total_value).label("total_value"),
            )
            .group_by(SalesOrder.status)
            .all()
        )

        return [
            OrderStatusDistribution(
                status=str(stat.status),
                count=int(stat.count),  # type: ignore[arg-type]
                total_value=round(float(stat.total_value or 0.0), 2),
            )
            for stat in order_stats
        ]

    @staticmethod
    def get_inventory_sales_trend(db: Session, period: str = "weekly", days: int = 30) -> Dict[str, Any]:
        """
        获取库存和销售趋势数据

        Args:
            db: 数据库会话
            period: 时间周期 (daily, weekly, monthly)
            days: 统计天数

        Returns:
            Dict: 包含 labels, inventory_levels, sales_data 的字典
        """
        from datetime import datetime, timedelta

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # 根据周期设置分组
        if period == "daily":
            # 按天统计最近7天
            labels = [(end_date - timedelta(days=i)).strftime("%m-%d") for i in range(6, -1, -1)]
            date_format = "%Y-%m-%d"
        elif period == "monthly":
            # 按月统计最近6个月
            labels = [(end_date - timedelta(days=30*i)).strftime("%Y-%m") for i in range(5, -1, -1)]
            date_format = "%Y-%m"
        else:  # weekly
            # 按周统计最近4周
            labels = [f"第{i+1}周" for i in range(4)]
            date_format = None  # 周统计需要特殊处理

        # 获取销售数据
        sales_query = (
            db.query(
                func.date_format(SalesOrder.order_date, '%Y-%m-%d' if period == 'daily' else '%Y-%m').label("period"),
                func.sum(SalesOrder.total_value).label("total_sales")
            )
            .filter(SalesOrder.order_date >= start_date)  # type: ignore[arg-type]
            .filter(SalesOrder.status != "cancelled")  # type: ignore[arg-type]
            .group_by("period")
            .all()
        )

        # 获取当前库存总量（简化处理，实际应该是历史快照）
        total_inventory = db.query(func.sum(Inventory.quantity)).scalar() or 0

        # 构建返回数据
        sales_data = [0.0] * len(labels)
        sales_dict = {row.period: float(row.total_sales or 0) for row in sales_query}

        # 填充销售数据
        for i, label in enumerate(labels):
            if period == "daily":
                date_key = (end_date - timedelta(days=6-i)).strftime("%Y-%m-%d")
            else:
                date_key = label
            sales_data[i] = sales_dict.get(date_key, 0.0)

        # 库存水平（简化：使用当前总库存，实际应该查历史记录）
        inventory_levels = [int(total_inventory)] * len(labels)

        return {
            "labels": labels,
            "inventory_levels": inventory_levels,
            "sales_data": sales_data,
        }

    @staticmethod
    def get_product_movement(db: Session, period: str = "weekly", days: int = 30) -> Dict[str, Any]:
        """
        获取产品动向数据（出入库统计）

        Args:
            db: 数据库会话
            period: 时间周期
            days: 统计天数

        Returns:
            Dict: 包含 labels 和 movement_data 的字典
        """
        from app.models.inventory import InventoryTransaction
        from datetime import datetime, timedelta

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        if period == "daily":
            labels = [(end_date - timedelta(days=i)).strftime("%m-%d") for i in range(6, -1, -1)]
        elif period == "monthly":
            labels = [(end_date - timedelta(days=30*i)).strftime("%Y-%m") for i in range(5, -1, -1)]
        else:  # weekly
            labels = [f"第{i+1}周" for i in range(4)]

        # 获取交易统计
        movements = (
            db.query(
                func.date_format(InventoryTransaction.created_at, '%Y-%m-%d' if period == 'daily' else '%Y-%m').label("period"),
                func.sum(func.abs(InventoryTransaction.quantity)).label("total_movement")
            )
            .filter(InventoryTransaction.created_at >= start_date)  # type: ignore[arg-type]
            .group_by("period")
            .all()
        )

        movement_dict = {row.period: int(row.total_movement or 0) for row in movements}
        movement_data = [0] * len(labels)

        for i, label in enumerate(labels):
            if period == "daily":
                date_key = (end_date - timedelta(days=6-i)).strftime("%Y-%m-%d")
            else:
                date_key = label
            movement_data[i] = movement_dict.get(date_key, 0)

        return {
            "labels": labels,
            "movement_data": movement_data,
        }

    @staticmethod
    def get_category_distribution(db: Session) -> Dict[str, Any]:
        """
        获取产品分类分布

        Args:
            db: 数据库会话

        Returns:
            Dict: 包含 labels 和 data 的字典
        """
        from app.models.product import ProductCategory

        # 获取每个分类的产品数量
        category_stats = (
            db.query(
                ProductCategory.name.label("category_name"),
                func.count(Product.id).label("product_count")
            )
            .join(Product, Product.category_id == ProductCategory.id)
            .filter(Product.is_active == True)  # type: ignore[arg-type]
            .group_by(ProductCategory.name)
            .all()
        )

        labels = [row.category_name for row in category_stats]
        data = [int(row.product_count) for row in category_stats]

        # 如果没有数据，返回默认值
        if not labels:
            labels = ["暂无分类"]
            data = [0]

        return {
            "labels": labels,
            "data": data,
        }

    @staticmethod
    def get_full_dashboard(db: Session) -> DashboardResponse:
        """
        获取完整的仪表板数据

        Args:
            db: 数据库会话

        Returns:
            DashboardResponse: 完整仪表板数据
        """
        return DashboardResponse(
            stats=DashboardService.get_dashboard_stats(db),
            stock_status=DashboardService.get_stock_status(db),
            recent_activities=DashboardService.get_recent_activities(db),
            inventory_alerts=DashboardService.get_inventory_alerts(db),
            top_products=DashboardService.get_top_products(db),
            warehouse_utilization=DashboardService.get_warehouse_utilization(db),
            order_status_distribution=DashboardService.get_order_status_distribution(db),
        )
