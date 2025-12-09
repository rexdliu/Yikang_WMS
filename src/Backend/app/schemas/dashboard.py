"""
Dashboard 相关的 Pydantic 模型

该模块定义了 Dashboard API 的请求和响应模型。
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    """仪表板统计数据"""

    total_products: int = Field(..., description="产品总数")
    total_inventory: int = Field(..., description="库存总量")
    low_stock_items: int = Field(..., description="低库存商品数")
    out_of_stock: int = Field(..., description="缺货商品数")
    total_warehouses: int = Field(..., description="仓库总数")
    pending_orders: int = Field(..., description="待处理订单数")
    total_inventory_value: float = Field(..., description="库存总价值")

    class Config:
        from_attributes = True


class StockStatus(BaseModel):
    """库存状态分布"""

    status: str = Field(..., description="状态：正常/低库存/缺货")
    count: int = Field(..., description="数量")
    percentage: float = Field(..., description="百分比")

    class Config:
        from_attributes = True


class ActivityLogResponse(BaseModel):
    """活动日志响应"""

    id: int
    activity_type: str = Field(..., description="活动类型：inventory/order/product/alert")
    action: str = Field(..., description="操作动作")
    item_name: str = Field(..., description="项目名称")
    user_id: Optional[int] = Field(None, description="操作用户ID")
    reference_id: Optional[int] = Field(None, description="关联记录ID")
    reference_type: Optional[str] = Field(None, description="关联记录类型")
    created_at: datetime = Field(..., description="创建时间")

    class Config:
        from_attributes = True


class InventoryAlert(BaseModel):
    """库存警报"""

    id: int
    product_id: int
    product_name: str = Field(..., description="产品名称")
    product_sku: str = Field(..., description="产品SKU")
    warehouse_name: str = Field(..., description="仓库名称")
    current_quantity: int = Field(..., description="当前库存")
    min_stock_level: int = Field(..., description="最低库存水平")
    alert_type: str = Field(..., description="警报类型：low_stock/out_of_stock")
    severity: str = Field(..., description="严重程度：warning/critical")

    class Config:
        from_attributes = True


class TopProduct(BaseModel):
    """热门产品"""

    product_id: int
    product_name: str
    sku: str
    total_sold: int = Field(..., description="总销量")
    total_revenue: float = Field(..., description="总收入")

    class Config:
        from_attributes = True


class WarehouseUtilization(BaseModel):
    """仓库利用率"""

    warehouse_id: int
    warehouse_name: str
    warehouse_code: str
    capacity: float = Field(..., description="总容量（立方米）")
    current_usage: float = Field(..., description="当前使用量（立方米）")
    utilization_rate: float = Field(..., description="利用率百分比")

    class Config:
        from_attributes = True


class OrderStatusDistribution(BaseModel):
    """订单状态分布"""

    status: str = Field(..., description="订单状态")
    count: int = Field(..., description="订单数量")
    total_value: float = Field(..., description="总价值")

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    """仪表板完整响应"""

    stats: DashboardStats
    stock_status: List[StockStatus]
    recent_activities: List[ActivityLogResponse]
    inventory_alerts: List[InventoryAlert]
    top_products: Optional[List[TopProduct]] = []
    warehouse_utilization: Optional[List[WarehouseUtilization]] = []
    order_status_distribution: Optional[List[OrderStatusDistribution]] = []

    class Config:
        from_attributes = True


class DashboardStatsResponse(BaseModel):
    """仪表板统计数据响应（简化版）"""

    stats: DashboardStats

    class Config:
        from_attributes = True
