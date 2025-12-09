"""
后台任务调度器

该模块定义了后台任务调度器，用于执行定期任务。
主要功能：
1. 清理过期通知（每天执行）
2. 低库存检查（每小时执行）
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.crud.notification import notification as notification_crud
import logging

logger = logging.getLogger(__name__)

# 创建调度器实例
scheduler = AsyncIOScheduler()


def cleanup_expired_notifications():
    """
    清理过期的通知（超过7天）

    这个任务每天凌晨2点执行
    """
    logger.info("开始清理过期通知...")

    db: Session = SessionLocal()
    try:
        deleted_count = notification_crud.delete_expired(db)
        logger.info(f"清理完成，删除了 {deleted_count} 条过期通知")
    except Exception as e:
        logger.error(f"清理过期通知时发生错误: {str(e)}")
    finally:
        db.close()


def check_low_stock():
    """
    检查低库存并创建警报

    这个任务每小时执行一次
    """
    logger.info("开始检查低库存...")

    db: Session = SessionLocal()
    try:
        from app.api.v1.alerts import check_low_stock_and_alert

        # 调用低库存检查函数
        result = check_low_stock_and_alert(db=db)
        logger.info(f"低库存检查完成，创建了 {result.get('alerts_created', 0)} 个警报")
    except Exception as e:
        logger.error(f"检查低库存时发生错误: {str(e)}")
    finally:
        db.close()


def start_scheduler():
    """
    启动调度器并添加任务
    """
    # 添加每天凌晨2点执行的清理任务
    scheduler.add_job(
        cleanup_expired_notifications,
        trigger=CronTrigger(hour=2, minute=0),
        id="cleanup_notifications",
        name="清理过期通知",
        replace_existing=True
    )

    # 添加每小时执行的低库存检查任务
    scheduler.add_job(
        check_low_stock,
        trigger=IntervalTrigger(hours=1),
        id="check_low_stock",
        name="检查低库存",
        replace_existing=True
    )

    # 启动调度器
    scheduler.start()
    logger.info("后台任务调度器已启动")


def shutdown_scheduler():
    """
    关闭调度器
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("后台任务调度器已关闭")
