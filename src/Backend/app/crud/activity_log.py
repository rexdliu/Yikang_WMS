"""活动日志 CRUD 操作"""

from app.crud.base import CRUDBase
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogCreate, ActivityLogBase


class CRUDActivityLog(CRUDBase[ActivityLog, ActivityLogCreate, ActivityLogBase]):
    """活动日志 CRUD 操作类"""
    pass


# 创建活动日志 CRUD 实例
activity_log = CRUDActivityLog(ActivityLog)
