"""通知工具函数"""

from typing import Optional, List
from sqlalchemy.orm import Session
from app.crud.notification import notification as notification_crud
import asyncio


def send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    days_to_expire: int = 7
) -> None:
    """
    发送通知给用户（包括WebSocket实时推送）

    Args:
        db: 数据库会话
        user_id: 用户ID
        title: 通知标题
        message: 通知消息
        notification_type: 通知类型 (order, inventory, alert, product, system)
        reference_id: 关联实体ID
        reference_type: 关联实体类型
        days_to_expire: 过期天数（默认7天）
    """
    # 保存到数据库
    notification = notification_crud.create_with_expiry(
        db=db,
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=reference_id,
        reference_type=reference_type,
        days_to_expire=days_to_expire
    )

    # 实时推送（如果用户在线）
    try:
        from app.core.websocket import manager

        # 创建异步任务推送通知
        async def push_notification():
            await manager.send_notification(
                user_id=user_id,
                notification_id=int(notification.id),  # type: ignore[arg-type]
                title=title,
                message=message,
                notification_type=notification_type,
                reference_id=reference_id,# type: ignore[arg-type]
                reference_type=reference_type# type: ignore[arg-type]
            )

        # 尝试在事件循环中运行
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # 如果事件循环正在运行，创建任务
                asyncio.create_task(push_notification())
            else:
                # 如果没有运行中的事件循环，直接运行
                loop.run_until_complete(push_notification())
        except RuntimeError:
            # 如果没有事件循环，创建新的
            asyncio.run(push_notification())
    except Exception:
        # WebSocket推送失败不应影响通知保存
        pass


def send_notification_to_multiple(
    db: Session,
    user_ids: List[int],
    title: str,
    message: str,
    notification_type: str,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    days_to_expire: int = 7
) -> None:
    """
    发送通知给多个用户

    Args:
        db: 数据库会话
        user_ids: 用户ID列表
        title: 通知标题
        message: 通知消息
        notification_type: 通知类型 (order, inventory, alert, product, system)
        reference_id: 关联实体ID
        reference_type: 关联实体类型
        days_to_expire: 过期天数（默认7天）
    """
    for user_id in user_ids:
        send_notification(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            reference_id=reference_id,
            reference_type=reference_type,
            days_to_expire=days_to_expire
        )


def send_notification_to_managers(
    db: Session,
    title: str,
    message: str,
    notification_type: str,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    days_to_expire: int = 7
) -> None:
    """
    发送通知给所有管理员和仓库管理员

    Args:
        db: 数据库会话
        title: 通知标题
        message: 通知消息
        notification_type: 通知类型 (order, inventory, alert, product, system)
        reference_id: 关联实体ID
        reference_type: 关联实体类型
        days_to_expire: 过期天数（默认7天）
    """
    from app.models.user import User

    # 查询所有管理员和仓库管理员
    managers = db.query(User).filter(
        User.role.in_(["admin", "manager"])
    ).all()

    manager_ids = [int(manager.id) for manager in managers]  # type: ignore[arg-type]

    send_notification_to_multiple(
        db=db,
        user_ids=manager_ids,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=reference_id,
        reference_type=reference_type,
        days_to_expire=days_to_expire
    )
