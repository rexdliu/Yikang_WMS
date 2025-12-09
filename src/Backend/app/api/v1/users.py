"""
用户相关 API 路由

该模块定义了用户管理相关的 API 路由。
主要功能：
1. 获取用户列表
2. 获取当前用户信息
3. 获取和更新用户设置
4. 更新用户个人资料
5. 上传用户头像
6. 修改密码
"""

from typing import Any, Dict, List, Optional, cast
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Response
from sqlalchemy.orm import Session
from PIL import Image
from app.core.database import get_db
from app.crud.user import CRUDUser, user as _user_crud
from app.schemas.user import (
    UserInDB,
    UserPasswordUpdate,
    UserProfileUpdate,
    UserUpdate,
    AvatarUploadResponse,
    PasswordChangeResponse,
)
from app.core.security import verify_password, get_password_hash
# 依赖项导入
from app.api.deps import get_current_active_user
from app.models.user import User

user_crud: CRUDUser = _user_crud

# 创建路由实例
router = APIRouter()

@router.get("/", response_model=List[UserInDB])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    获取用户列表（分页）
    
    Args:
        db: 数据库会话依赖
        skip: 跳过的记录数
        limit: 返回的记录数限制
        
    Returns:
        List[UserInDB]: 用户列表
    """
    users = user_crud.get_multi(db, skip=skip, limit=limit)
    return users

@router.get("/me", response_model=UserInDB)
def read_user_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    获取当前用户信息
    
    Args:
        db: 数据库会话依赖
        current_user: 当前认证用户依赖
        
    Returns:
        UserInDB: 当前用户信息
    """
    return current_user

@router.put("/me", response_model=UserInDB)
def update_user_profile(
    *,
    db: Session = Depends(get_db),
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    更新当前用户个人资料

    允许所有用户更新自己的基本信息，包括：
    - username (用户名)
    - email (邮箱)
    - phone (电话)
    - full_name (全名)
    - language (界面语言)

    注意：不能修改 role, is_superuser, is_active 等权限相关字段
    """
    # 检查username唯一性（如果修改）
    if profile_data.username is not None and profile_data.username != current_user.username:
        existing_user = user_crud.get_by_username(db, username=profile_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"用户名 '{profile_data.username}' 已被使用"
            )
        current_user.username = profile_data.username  # type: ignore[assignment]

    # 检查email唯一性（如果修改）
    if profile_data.email is not None and profile_data.email != current_user.email:
        existing_user = user_crud.get_by_email(db, email=profile_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"邮箱 '{profile_data.email}' 已被使用"
            )
        current_user.email = profile_data.email  # type: ignore[assignment]

    # 更新其他字段
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone  # type: ignore[assignment]
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name  # type: ignore[assignment]
    if profile_data.language is not None:
        current_user.language = profile_data.language  # type: ignore[assignment]

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user

@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    *,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    上传用户头像

    支持格式: JPG, PNG, WEBP
    最大文件大小: 2MB
    图片会被自动调整为 200x200 像素
    """
    # 1. 验证文件类型
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 JPG, PNG, WEBP 格式的图片"
        )

    # 2. 验证文件大小 (2MB)
    file.file.seek(0, 2)  # 移到文件末尾
    file_size = file.file.tell()
    file.file.seek(0)  # 重置文件指针

    if file_size > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小不能超过 2MB"
        )

    # 3. 创建avatars目录（如果不存在）
    # 使用绝对路径，指向app/static/avatars
    avatars_dir = Path(__file__).parent.parent.parent / "static" / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)

    # 4. 生成唯一文件名
    file_ext = "jpg"
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    filepath = avatars_dir / filename

    # 5. 使用 Pillow 处理图片
    try:
        image = Image.open(file.file)

        # 转换RGBA为RGB（如果需要）
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        # 调整尺寸为 200x200
        image = image.resize((200, 200), Image.Resampling.LANCZOS)

        # 保存图片
        image.save(filepath, "JPEG", quality=90)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"图片处理失败: {str(e)}"
        )

    # 6. 生成URL并更新数据库
    avatar_url = f"/static/avatars/{filename}"
    current_user.avatar_url = avatar_url  # type: ignore[assignment]
    db.add(current_user)
    db.commit()

    return AvatarUploadResponse(avatar_url=avatar_url)


@router.delete("/me/avatar", response_model=dict)
def delete_avatar(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    删除用户头像

    删除用户的自定义头像，恢复使用默认头像
    """
    # 如果用户有自定义头像，删除文件
    avatar_url = current_user.avatar_url
    if avatar_url is not None and str(avatar_url).startswith("/static/avatars/"):
        try:
            # 获取文件路径
            avatars_dir = Path(__file__).parent.parent.parent / "static" / "avatars"
            filename = str(avatar_url).split("/")[-1]
            filepath = avatars_dir / filename

            # 删除文件
            if filepath.exists():
                filepath.unlink()
        except Exception as e:
            # 即使文件删除失败，也继续清空数据库中的记录
            print(f"删除头像文件失败: {str(e)}")

    # 清空数据库中的avatar_url
    current_user.avatar_url = None  # type: ignore[assignment]
    db.add(current_user)
    db.commit()

    return {"message": "头像已删除", "avatar_url": None}


@router.get("/me/avatar/default")
def get_default_avatar() -> Any:
    """
    获取默认头像SVG

    返回一个通用的默认头像，不需要身份验证
    可以在<img>标签中直接使用
    """
    # 使用通用的用户图标
    initial = "U"
    bg_color = "#4ECDC4"  # 使用固定的颜色

    # 生成SVG
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="{bg_color}"/>
  <text x="100" y="100" font-family="Arial, sans-serif" font-size="80" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="central">
    {initial}
  </text>
</svg>'''

    return Response(
        content=svg.encode('utf-8'),
        media_type="image/svg+xml",
        headers={
            "Content-Disposition": "inline; filename=avatar_default.svg",
            "Cache-Control": "public, max-age=86400"  # 缓存24小时
        }
    )


@router.post("/me/change-password", response_model=PasswordChangeResponse)
def change_password(
    *,
    db: Session = Depends(get_db),
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    修改当前用户密码

    需要提供当前密码进行验证
    新密码必须至少8位
    """
    # 验证旧密码
    stored_hash = cast(str, current_user.hashed_password)
    if not verify_password(password_data.current_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码不正确"
        )

    # 验证新密码不同于旧密码
    if verify_password(password_data.new_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码不能与当前密码相同"
        )

    # 更新密码
    hashed_password = get_password_hash(password_data.new_password)
    current_user.hashed_password = hashed_password  # type: ignore[assignment]
    db.add(current_user)
    db.commit()

    return PasswordChangeResponse(message="密码修改成功")

# 保留旧的endpoint以保持向后兼容
@router.put("/me/password")
def update_password(
    *,
    db: Session = Depends(get_db),
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    更新用户密码（已废弃，请使用 POST /me/change-password）
    """
    stored_hash = cast(str, current_user.hashed_password)
    if not verify_password(password_data.current_password, stored_hash):
        raise HTTPException(status_code=400, detail="Incorrect password")
    hashed_password = get_password_hash(password_data.new_password)
    setattr(current_user, "hashed_password", hashed_password)
    db.add(current_user)
    db.commit()
    return {"msg": "Password updated successfully"}
