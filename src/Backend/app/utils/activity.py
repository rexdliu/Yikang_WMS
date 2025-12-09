"""活动日志工具函数"""

from sqlalchemy.orm import Session
from app.crud.activity_log import activity_log
from app.schemas.activity_log import ActivityLogCreate
from typing import Optional


def log_activity(
    db: Session,
    activity_type: str,
    action: str,
    item_name: str,
    user_id: Optional[int] = None,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None
) -> None:
    """
    记录活动日志

    Args:
        db: 数据库会话
        activity_type: 活动类型 (inventory/order/product/alert)
        action: 具体操作 (入库/出库/创建订单/更新产品等)
        item_name: 项目名称
        user_id: 操作用户ID
        reference_id: 关联记录ID
        reference_type: 关联记录类型
    """
    log_data = ActivityLogCreate(
        activity_type=activity_type,
        action=action,
        item_name=item_name,
        user_id=user_id,
        reference_id=reference_id,
        reference_type=reference_type
    )
    activity_log.create(db, obj_in=log_data)
