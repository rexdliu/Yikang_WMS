"""
Dashboard API 路由

该模块提供仪表板相关的 API 端点。
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    DashboardResponse,
    DashboardStats,
    StockStatus,
    ActivityLogResponse,
    InventoryAlert,
    TopProduct,
    WarehouseUtilization,
    OrderStatusDistribution,
)

router = APIRouter()


@router.get("/", response_model=DashboardResponse)
def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取完整的仪表板数据

    返回仪表板所需的所有数据，包括统计、库存状态、活动记录等。
    """
    try:
        return DashboardService.get_full_dashboard(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取仪表板数据失败: {str(e)}")


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取仪表板统计数据

    返回核心统计指标，如产品总数、库存总量、待处理订单等。
    """
    try:
        return DashboardService.get_dashboard_stats(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")


@router.get("/stock-status", response_model=List[StockStatus])
def get_stock_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取库存状态分布

    返回正常、低库存、缺货商品的数量和百分比。
    """
    try:
        return DashboardService.get_stock_status(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取库存状态失败: {str(e)}")


@router.get("/activities", response_model=List[ActivityLogResponse])
def get_recent_activities(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取最近活动记录

    返回系统中最近的活动记录，包括库存变动、订单处理等。

    Args:
        limit: 返回记录数量限制（默认10）
    """
    try:
        return DashboardService.get_recent_activities(db, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取活动记录失败: {str(e)}")


@router.get("/alerts", response_model=List[InventoryAlert])
def get_inventory_alerts(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取库存警报

    返回低库存和缺货商品的警报列表。

    Args:
        limit: 返回记录数量限制（默认20）
    """
    try:
        return DashboardService.get_inventory_alerts(db, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取库存警报失败: {str(e)}")


@router.get("/top-products", response_model=List[TopProduct])
def get_top_products(
    limit: int = 5,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取热门产品

    返回按销量排序的热门产品列表。

    Args:
        limit: 返回记录数量限制（默认5）
        days: 统计天数（默认30天）
    """
    try:
        return DashboardService.get_top_products(db, limit, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取热门产品失败: {str(e)}")


@router.get("/warehouse-utilization", response_model=List[WarehouseUtilization])
def get_warehouse_utilization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取仓库利用率

    返回所有仓库的容量使用情况。
    """
    try:
        return DashboardService.get_warehouse_utilization(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取仓库利用率失败: {str(e)}")


@router.get("/order-status-distribution", response_model=List[OrderStatusDistribution])
def get_order_status_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取订单状态分布

    返回各种状态的订单数量和总价值。
    """
    try:
        return DashboardService.get_order_status_distribution(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取订单状态分布失败: {str(e)}")


@router.get("/inventory-sales-trend", response_model=Dict[str, Any])
def get_inventory_sales_trend(
    period: str = Query("weekly", regex="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取库存和销售趋势数据

    返回指定时间周期的库存水平和销售数据。

    Args:
        period: 时间周期 (daily, weekly, monthly)
        days: 统计天数 (默认30天)
    """
    try:
        return DashboardService.get_inventory_sales_trend(db, period, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取趋势数据失败: {str(e)}")


@router.get("/product-movement", response_model=Dict[str, Any])
def get_product_movement(
    period: str = Query("weekly", regex="^(daily|weekly|monthly)$"),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取产品动向数据

    返回指定时间周期的产品出入库统计。

    Args:
        period: 时间周期 (daily, weekly, monthly)
        days: 统计天数 (默认30天)
    """
    try:
        return DashboardService.get_product_movement(db, period, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取产品动向失败: {str(e)}")


@router.get("/category-distribution", response_model=Dict[str, Any])
def get_category_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    获取产品分类分布

    返回各个分类的产品数量分布。
    """
    try:
        return DashboardService.get_category_distribution(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分类分布失败: {str(e)}")
