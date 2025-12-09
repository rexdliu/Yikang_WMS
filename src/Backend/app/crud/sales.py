"""销售相关 CRUD"""

from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.crud.base import CRUDBase
from app.models.sales import Distributor, SalesOrder
from app.schemas.sales import (
    DistributorCreate,
    DistributorUpdate,
    SalesOrderCreate,
    SalesOrderUpdate,
)


class CRUDDistributor(CRUDBase[Distributor, DistributorCreate, DistributorUpdate]):
    pass


class CRUDSalesOrder(CRUDBase[SalesOrder, SalesOrderCreate, SalesOrderUpdate]):
    def get_by_distributor(
        self,
        db: Session,
        *,
        distributor_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[SalesOrder]:
        return (
            db.query(SalesOrder)
            .filter(SalesOrder.distributor_id == distributor_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_distributor_with_filters(
        self,
        db: Session,
        *,
        distributor_id: Optional[int] = None,
        product_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[SalesOrder]:
        """
        查询销售订单，支持多条件筛选

        Args:
            distributor_id: 经销商ID（可选）
            product_name: 产品名称关键词（可选，大小写不敏感）
            start_date: 订单开始日期（可选，包含当天00:00:00）
            end_date: 订单结束日期（可选，包含当天23:59:59）
            skip: 分页偏移
            limit: 分页限制
        """
        query = db.query(SalesOrder)

        # 经销商筛选
        if distributor_id is not None:
            query = query.filter(SalesOrder.distributor_id == distributor_id)

        # 产品名称筛选（大小写不敏感的模糊匹配）
        if product_name and product_name.strip():
            search_term = f"%{product_name.strip()}%"
            query = query.filter(SalesOrder.product_name.ilike(search_term))

        # 订单日期范围筛选
        if start_date:
            query = query.filter(SalesOrder.order_date >= start_date)
        if end_date:
            query = query.filter(SalesOrder.order_date <= end_date)

        # 按订单日期降序排列（最新的在前）
        query = query.order_by(SalesOrder.order_date.desc())

        return query.offset(skip).limit(limit).all()

    def get_by_code(self, db: Session, *, order_code: str) -> Optional[SalesOrder]:
        return db.query(SalesOrder).filter(SalesOrder.order_code == order_code).first()

    def search_distributors(
        self,
        db: Session,
        *,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[SalesOrder]:
        """
        搜索经销商（支持名称、代码、联系人搜索）

        Args:
            search: 搜索关键词（可选）
            skip: 分页偏移
            limit: 分页限制
        """
        from app.models.sales import Distributor

        query = db.query(Distributor).filter(Distributor.is_active == True)  # type: ignore[arg-type]

        if search and search.strip():
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Distributor.name.ilike(search_term),
                    Distributor.code.ilike(search_term),
                    Distributor.contact_person.ilike(search_term),
                    Distributor.region.ilike(search_term),
                )
            )

        return query.offset(skip).limit(limit).all()


distributor = CRUDDistributor(Distributor)
sales_order = CRUDSalesOrder(SalesOrder)
