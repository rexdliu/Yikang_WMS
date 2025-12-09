"""
仓库配置相关 API 路由

该模块定义了仓库配置相关的 API 路由。
主要功能：
1. 获取仓库配置
2. 更新仓库配置（Manager/Admin/Tester权限）
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.warehouse_config import WarehouseConfig
from app.schemas.warehouse_config import (
    WarehouseConfigResponse,
    WarehouseConfigUpdate,
)
from app.api.deps import get_current_active_user, require_manager_or_above
from app.models.user import User

router = APIRouter()


@router.get("/config", response_model=WarehouseConfigResponse)
def get_warehouse_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    获取仓库配置

    所有角色可访问
    """
    config = db.query(WarehouseConfig).first()

    if not config:
        # 如果没有配置，创建默认配置
        config = WarehouseConfig(
            warehouse_name="主仓库",
            location="未设置",
            timezone="Asia/Shanghai",
            temperature_unit="celsius",
            low_stock_threshold=10
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return config


@router.put("/config", response_model=WarehouseConfigResponse)
def update_warehouse_config(
    *,
    db: Session = Depends(get_db),
    config_data: WarehouseConfigUpdate,
    current_user: User = Depends(require_manager_or_above)
) -> Any:
    """
    更新仓库配置

    需要 Manager/Admin/Tester 权限
    """
    config = db.query(WarehouseConfig).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="仓库配置不存在"
        )

    # 更新字段
    update_data = config_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    db.add(config)
    db.commit()
    db.refresh(config)

    return config
