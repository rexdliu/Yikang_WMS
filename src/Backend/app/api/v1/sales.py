"""销售相关 API"""

from typing import Iterable, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud import sales as sales_crud
from app.schemas.sales import (
    DistributorCreate,
    DistributorInDB,
    DistributorUpdate,
    SalesOrderCreateRequest,
    SalesOrderCreate,
    SalesOrderInDB,
    SalesOrderUpdate,
    DeliveryPersonCreate,
    DeliveryPersonInDB,
    DeliveryPersonUpdate,
)
from app.models.sales import Distributor, SalesOrder, DeliveryPerson
from app.models.product import Product
from app.models.inventory import InventoryTransaction
from app.api.deps import require_manager_or_above
from app.models.user import User
from app.utils.activity import log_activity
from app.utils.notification import send_notification_to_managers, send_notification

router = APIRouter()


def _map_distributors(distributors: Iterable[Distributor]) -> List[DistributorInDB]:
    return [DistributorInDB.model_validate(item) for item in distributors]


def _map_sales_orders(orders: Iterable[SalesOrder]) -> List[SalesOrderInDB]:
    return [SalesOrderInDB.model_validate(item) for item in orders]


@router.get("/distributors", response_model=List[DistributorInDB])
def list_distributors(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
) -> List[DistributorInDB]:
    """
    查询经销商列表

    支持筛选条件：
    - search: 搜索关键词（支持名称、代码、联系人、地区模糊搜索）
    """
    if search and search.strip():
        distributors = sales_crud.sales_order.search_distributors(
            db, search=search, skip=skip, limit=limit
        )
    else:
        distributors = sales_crud.distributor.get_multi(db, skip=skip, limit=limit)
    return _map_distributors(distributors)


@router.post("/distributors", response_model=DistributorInDB, status_code=201)
def create_distributor(
    distributor_in: DistributorCreate,
    db: Session = Depends(get_db),
) -> DistributorInDB:
    distributor = sales_crud.distributor.create(db, obj_in=distributor_in)
    return DistributorInDB.model_validate(distributor)


@router.put("/distributors/{distributor_id}", response_model=DistributorInDB)
def update_distributor(
    distributor_id: int,
    distributor_in: DistributorUpdate,
    db: Session = Depends(get_db),
) -> DistributorInDB:
    db_obj = sales_crud.distributor.get(db, distributor_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Distributor not found")
    updated = sales_crud.distributor.update(db, db_obj=db_obj, obj_in=distributor_in)
    return DistributorInDB.model_validate(updated)


# ========== DeliveryPerson APIs ==========

def _map_delivery_persons(persons: Iterable[DeliveryPerson]) -> List[DeliveryPersonInDB]:
    return [DeliveryPersonInDB.model_validate(item) for item in persons]


@router.get("/delivery-persons", response_model=List[DeliveryPersonInDB])
def list_delivery_persons(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
) -> List[DeliveryPersonInDB]:
    """
    查询交付人列表
    
    支持筛选条件：
    - search: 搜索关键词（支持姓名、电话、车牌号搜索）
    """
    if search and search.strip():
        persons = sales_crud.delivery_person.search(db, search=search, skip=skip, limit=limit)
    else:
        persons = sales_crud.delivery_person.get_active(db, skip=skip, limit=limit)
    return _map_delivery_persons(persons)


@router.post("/delivery-persons", response_model=DeliveryPersonInDB, status_code=201)
def create_delivery_person(
    person_in: DeliveryPersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
) -> DeliveryPersonInDB:
    """创建交付人，需要管理员权限"""
    person = sales_crud.delivery_person.create(db, obj_in=person_in)
    return DeliveryPersonInDB.model_validate(person)


@router.put("/delivery-persons/{person_id}", response_model=DeliveryPersonInDB)
def update_delivery_person(
    person_id: int,
    person_in: DeliveryPersonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
) -> DeliveryPersonInDB:
    """更新交付人信息，需要管理员权限"""
    db_obj = sales_crud.delivery_person.get(db, person_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Delivery person not found")
    updated = sales_crud.delivery_person.update(db, db_obj=db_obj, obj_in=person_in)
    return DeliveryPersonInDB.model_validate(updated)


@router.get("/delivery-persons/{person_id}", response_model=DeliveryPersonInDB)
def get_delivery_person(
    person_id: int,
    db: Session = Depends(get_db),
) -> DeliveryPersonInDB:
    """获取单个交付人信息"""
    person = sales_crud.delivery_person.get(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Delivery person not found")
    return DeliveryPersonInDB.model_validate(person)


@router.get("/orders", response_model=List[SalesOrderInDB])
def list_sales_orders(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    distributor_id: Optional[int] = None,
    product_name: Optional[str] = None,
    start_date: Optional[str] = None,  # 格式: YYYY-MM-DD
    end_date: Optional[str] = None,    # 格式: YYYY-MM-DD
) -> List[SalesOrderInDB]:
    """
    查询销售订单列表

    支持筛选条件：
    - distributor_id: 经销商ID
    - product_name: 产品名称关键词（模糊搜索）
    - start_date: 订单开始日期（格式: YYYY-MM-DD，包含当天）
    - end_date: 订单结束日期（格式: YYYY-MM-DD，包含当天）
    """
    # 解析日期参数
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date 格式错误，应为 YYYY-MM-DD"
            )
    if end_date:
        try:
            # 结束日期设置为当天的23:59:59
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date 格式错误，应为 YYYY-MM-DD"
            )

    # 使用增强的查询方法
    orders = sales_crud.sales_order.get_by_distributor_with_filters(
        db,
        distributor_id=distributor_id,
        product_name=product_name,
        start_date=start_dt,
        end_date=end_dt,
        skip=skip,
        limit=limit
    )
    return _map_sales_orders(orders)


@router.get("/orders/available-for-shipment", response_model=List[SalesOrderInDB])
def list_orders_available_for_shipment(
    db: Session = Depends(get_db),
    warehouse_id: Optional[int] = None,
) -> List[SalesOrderInDB]:
    """
    获取可分配运输单的订单
    
    条件:
    - 已分配波次 (wave_id IS NOT NULL)
    - 未分配运输单 (shipment_id IS NULL)
    - 状态为 processing 或 pending
    - 可选按仓库过滤
    """
    from app.models.wave import Wave, WaveStatus
    
    query = db.query(SalesOrder).join(
        Wave, SalesOrder.wave_id == Wave.id
    ).filter(
        SalesOrder.wave_id.isnot(None),
        SalesOrder.shipment_id.is_(None),
        SalesOrder.status.in_(["pending", "processing"]),
        Wave.status.in_([WaveStatus.processing, WaveStatus.completed])
    )
    
    if warehouse_id:
        query = query.filter(SalesOrder.warehouse_id == warehouse_id)
    
    orders = query.order_by(SalesOrder.order_date.desc()).limit(100).all()
    return _map_sales_orders(orders)


@router.post("/orders", response_model=SalesOrderInDB, status_code=201)
def create_sales_order(
    order_in: SalesOrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
) -> SalesOrderInDB:
    """
    创建新订单

    需要 Manager/Admin/Tester 权限
    自动生成订单号格式: SO-YYYYMMDD-XXXX
    """
    # 验证经销商存在
    distributor = sales_crud.distributor.get(db, id=order_in.distributor_id)
    if not distributor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"经销商 ID {order_in.distributor_id} 不存在"
        )

    # 验证产品存在
    product = db.query(Product).filter(Product.id == order_in.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"产品 ID {order_in.product_id} 不存在"
        )

    # 生成订单号: SO-YYYYMMDD-XXXX
    today_str = datetime.now().strftime("%Y%m%d")
    last_order = db.query(SalesOrder).filter(
        SalesOrder.order_code.like(f"SO{today_str}%")
    ).order_by(SalesOrder.id.desc()).first()

    if last_order:
        last_num = int(last_order.order_code[-4:])  # type: ignore[arg-type]
        order_code = f"SO{today_str}{(last_num + 1):04d}"
    else:
        order_code = f"SO{today_str}1001"

    # 构建完整的订单数据
    order_create = SalesOrderCreate(
        order_code=order_code,
        distributor_id=order_in.distributor_id,
        product_id=order_in.product_id,
        product_name=order_in.product_name,
        quantity=order_in.quantity,
        unit_price=order_in.unit_price,
        total_value=order_in.total_value,
        order_date=datetime.now(),
        warehouse_id=order_in.warehouse_id,
        delivery_person_id=order_in.delivery_person_id,
        delivery_date=order_in.delivery_date,
        user_id=int(current_user.id),  # type: ignore[arg-type]
        notes=order_in.notes
    )

    order = sales_crud.sales_order.create(db, obj_in=order_create)

    # 记录活动日志
    log_activity(
        db=db,
        activity_type="order",
        action="创建订单",
        item_name=f"订单 {order.order_code}",  # type: ignore[arg-type]
        user_id=int(current_user.id),  # type: ignore[arg-type]
        reference_id=int(order.id),  # type: ignore[arg-type]
        reference_type="order"
    )

    # 发送通知给所有管理员
    send_notification_to_managers(
        db=db,
        title="新订单创建",
        message=f"{current_user.username} 创建了新订单 {order.order_code}，产品：{order_in.product_name}，数量：{order_in.quantity}",  # type: ignore[arg-type]
        notification_type="order",
        reference_id=int(order.id),  # type: ignore[arg-type]
        reference_type="order"
    )

    db.commit()
    db.refresh(order)
    return SalesOrderInDB.model_validate(order)


@router.put("/orders/{order_id}", response_model=SalesOrderInDB)
def update_sales_order(
    order_id: int,
    order_in: SalesOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
) -> SalesOrderInDB:
    """
    更新销售订单
    
    当订单状态变更时自动处理库存：
    - shipped/completed: 扣减库存，创建OUT交易记录
    - cancelled: 如果之前已发货/完成，恢复库存，创建IN交易记录
    """
    from app.models.inventory import Inventory
    
    db_obj = sales_crud.sales_order.get(db, order_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Order not found")

    # 记录更新前的状态
    old_status = db_obj.status

    order = sales_crud.sales_order.update(db, db_obj=db_obj, obj_in=order_in)

    # 记录活动日志
    action = "更新订单"
    status_changed = False
    status_text = ""

    if order_in.status and order_in.status != old_status:
        status_map = {
            "pending": "待处理",
            "processing": "处理中",
            "shipped": "已发货",
            "in_transit": "运输中",
            "completed": "已完成",
            "cancelled": "已取消"
        }
        status_text = status_map.get(order_in.status, order_in.status)
        action = f"订单状态变更为{status_text}"
        status_changed = True

    log_activity(
        db=db,
        activity_type="order",
        action=action,
        item_name=f"订单 {order.order_code}",  # type: ignore[arg-type]
        user_id=int(current_user.id),  # type: ignore[arg-type]
        reference_id=int(order.id),  # type: ignore[arg-type]
        reference_type="order"
    )

    # 处理库存变化 - 只在首次状态转换时调整，避免重复
    # 定义"已出库"状态集合
    SHIPPED_STATES = {"shipped", "in_transit", "completed"}
    
    if status_changed and order.warehouse_id:
        # 获取库存记录
        inventory = db.query(Inventory).filter(
            Inventory.product_id == order.product_id,
            Inventory.warehouse_id == order.warehouse_id
        ).first()
        
        old_is_shipped = old_status in SHIPPED_STATES
        new_is_shipped = order_in.status in SHIPPED_STATES
        new_is_cancelled = order_in.status == "cancelled"
        
        # 情况1: 从未出库状态 → 首次出库状态 (扣减库存)
        if not old_is_shipped and new_is_shipped:
            if inventory:
                inventory.quantity = max(0, inventory.quantity - order.quantity)  # type: ignore[operator]
            
            # 创建出库交易记录
            transaction = InventoryTransaction(
                product_id=order.product_id,  # type: ignore[arg-type]
                warehouse_id=order.warehouse_id,  # type: ignore[arg-type]
                transaction_type="OUT",
                quantity=order.quantity,  # type: ignore[arg-type]
                user_id=current_user.id,  # type: ignore[arg-type]
                reference=f"订单 {order.order_code}",  # type: ignore[arg-type]
                notes=f"订单出库 - {order.product_name}"  # type: ignore[arg-type]
            )
            db.add(transaction)
        
        # 情况2: 从已出库状态 → 取消 (恢复库存)
        elif old_is_shipped and new_is_cancelled:
            if inventory:
                inventory.quantity = inventory.quantity + order.quantity  # type: ignore[operator]
            
            # 创建入库交易记录（恢复）
            transaction = InventoryTransaction(
                product_id=order.product_id,  # type: ignore[arg-type]
                warehouse_id=order.warehouse_id,  # type: ignore[arg-type]
                transaction_type="IN",
                quantity=order.quantity,  # type: ignore[arg-type]
                user_id=current_user.id,  # type: ignore[arg-type]
                reference=f"订单取消恢复 {order.order_code}",  # type: ignore[arg-type]
                notes=f"订单取消，恢复库存 - {order.product_name}"  # type: ignore[arg-type]
            )
            db.add(transaction)
        
        # 情况3: 在已出库状态之间切换 (shipped ↔ completed ↔ in_transit) - 不调整库存
        # 情况4: 从未出库状态直接取消 (pending → cancelled) - 不调整库存

    # 如果订单状态发生变化，通知订单创建者
    if status_changed and order.user_id and order.user_id != current_user.id:  # type: ignore[comparison-overlap]
        send_notification(
            db=db,
            user_id=int(order.user_id),  # type: ignore[arg-type]
            title="订单状态更新",
            message=f"您的订单 {order.order_code} 状态已更新为：{status_text}",  # type: ignore[arg-type]
            notification_type="order",
            reference_id=int(order.id),  # type: ignore[arg-type]
            reference_type="order"
        )

    db.commit()
    db.refresh(order)
    return SalesOrderInDB.model_validate(order)

