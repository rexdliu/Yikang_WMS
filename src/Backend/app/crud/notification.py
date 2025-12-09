"""通知 CRUD 操作"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from app.crud.base import CRUDBase
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate


class CRUDNotification(CRUDBase[Notification, NotificationCreate, NotificationUpdate]):
    """通知 CRUD 操作类"""

    def get_by_user(
        self,
        db: Session,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        unread_only: bool = False
    ) -> List[Notification]:
        """
        获取用户的通知列表

        Args:
            db: 数据库会话
            user_id: 用户ID
            skip: 跳过的记录数
            limit: 返回的记录数限制
            unread_only: 只返回未读通知

        Returns:
            List[Notification]: 通知列表
        """
        query = db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.expire_at > datetime.utcnow()  # 未过期
            )
        )

        if unread_only:
            query = query.filter(self.model.is_read == False)

        return query.order_by(self.model.created_at.desc()).offset(skip).limit(limit).all()

    def get_unread_count(self, db: Session, *, user_id: int) -> int:
        """
        获取用户未读通知数量

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            int: 未读通知数量
        """
        return db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.is_read == False,
                self.model.expire_at > datetime.utcnow()  # 未过期
            )
        ).count()

    def mark_as_read(self, db: Session, *, notification_id: int, user_id: int) -> Optional[Notification]:
        """
        将通知标记为已读

        Args:
            db: 数据库会话
            notification_id: 通知ID
            user_id: 用户ID（用于验证权限）

        Returns:
            Optional[Notification]: 更新后的通知对象，如果不存在或无权限则返回None
        """
        notification = db.query(self.model).filter(
            and_(
                self.model.id == notification_id,
                self.model.user_id == user_id
            )
        ).first()

        if notification:
            notification.is_read = True  # type: ignore[assignment]
            db.add(notification)
            db.commit()
            db.refresh(notification)

        return notification

    def mark_all_as_read(self, db: Session, *, user_id: int) -> int:
        """
        将用户所有未读通知标记为已读

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            int: 标记为已读的通知数量
        """
        count = db.query(self.model).filter(
            and_(
                self.model.user_id == user_id,
                self.model.is_read == False,
                self.model.expire_at > datetime.utcnow()
            )
        ).update({"is_read": True})

        db.commit()
        return count

    def delete_expired(self, db: Session) -> int:
        """
        删除所有已过期的通知（超过7天）

        Args:
            db: 数据库会话

        Returns:
            int: 删除的通知数量
        """
        count = db.query(self.model).filter(
            self.model.expire_at <= datetime.utcnow()
        ).delete()

        db.commit()
        return count

    def create_with_expiry(
        self,
        db: Session,
        *,
        user_id: int,
        title: str,
        message: str,
        notification_type: str,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None,
        days_to_expire: int = 7
    ) -> Notification:
        """
        创建通知并自动设置过期时间

        Args:
            db: 数据库会话
            user_id: 用户ID
            title: 通知标题
            message: 通知消息
            notification_type: 通知类型
            reference_id: 关联实体ID
            reference_type: 关联实体类型
            days_to_expire: 过期天数（默认7天）

        Returns:
            Notification: 创建的通知对象
        """
        notification_in = NotificationCreate(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            reference_id=reference_id,
            reference_type=reference_type
        )

        # 添加过期时间
        obj_in_data = notification_in.model_dump()
        obj_in_data["expire_at"] = datetime.utcnow() + timedelta(days=days_to_expire)

        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


# 创建通知 CRUD 实例
notification = CRUDNotification(Notification)
