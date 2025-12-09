"""
通知相关 API 路由

该模块定义了通知相关的 API 路由。
主要功能：
1. 获取当前用户通知列表
2. 获取未读通知数量
3. 标记通知为已读
4. 标记所有通知为已读
5. 删除通知
"""

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.crud.notification import notification as notification_crud
from app.schemas.notification import (
    NotificationResponse,
    UnreadCountResponse,
)
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    unread_only: bool = Query(False)
) -> Any:
    """
    获取当前用户的通知列表

    Args:
        skip: 跳过的记录数
        limit: 返回的记录数限制（最大100）
        unread_only: 只返回未读通知

    Returns:
        List[NotificationResponse]: 通知列表
    """
    notifications = notification_crud.get_by_user(
        db,
        user_id=int(current_user.id),  # type: ignore[arg-type]
        skip=skip,
        limit=limit,
        unread_only=unread_only
    )
    return notifications


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    获取当前用户未读通知数量

    Returns:
        UnreadCountResponse: 包含未读通知数量
    """
    count = notification_crud.get_unread_count(
        db,
        user_id=int(current_user.id)  # type: ignore[arg-type]
    )
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    将指定通知标记为已读

    Args:
        notification_id: 通知ID

    Returns:
        NotificationResponse: 更新后的通知对象
    """
    notification = notification_crud.mark_as_read(
        db,
        notification_id=notification_id,
        user_id=int(current_user.id)  # type: ignore[arg-type]
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在或无权限访问"
        )

    return notification


@router.put("/read-all", response_model=dict)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    将当前用户所有未读通知标记为已读

    Returns:
        dict: 包含标记为已读的通知数量
    """
    count = notification_crud.mark_all_as_read(
        db,
        user_id=int(current_user.id)  # type: ignore[arg-type]
    )

    return {"message": "所有通知已标记为已读", "count": count}


@router.delete("/{notification_id}", response_model=dict)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    删除指定通知

    Args:
        notification_id: 通知ID

    Returns:
        dict: 删除成功消息
    """
    # 验证通知是否属于当前用户
    notification = notification_crud.get(db, id=notification_id)

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在"
        )

    if notification.user_id != current_user.id:  # type: ignore[comparison-overlap]
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限删除此通知"
        )

    notification_crud.remove(db, id=notification_id)

    return {"message": "通知已删除"}
