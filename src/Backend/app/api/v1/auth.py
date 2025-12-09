"""
认证相关 API 路由

该模块定义了用户认证相关的 API 路由。
主要功能：
1. 用户登录（JWT 令牌生成）
2. 用户注册
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.crud import user as user_crud
from app.schemas.user import Token, UserCreate, UserInDB

# 创建路由实例
router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    用户登录接口
    
    通过用户名和密码进行身份验证，成功后返回 JWT 访问令牌。
    
    Args:
        db: 数据库会话依赖
        form_data: OAuth2 表单数据（包含用户名和密码）
        
    Returns:
        Token: 包含访问令牌和令牌类型的响应
        
    Raises:
        HTTPException: 认证失败时抛出 401 错误
    """
    user = user_crud.authenticate(
        db, username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user_crud.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserInDB)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate
):
    """
    用户注册接口

    创建新用户账户。新用户默认角色为 staff（只读权限）。

    Args:
        db: 数据库会话依赖
        user_in: 用户创建数据

    Returns:
        UserInDB: 创建的用户信息

    Raises:
        HTTPException: 用户名或邮箱已存在时抛出 400 错误
    """
    # 检查用户名是否已存在
    user = user_crud.get_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已被使用",
        )

    # 检查邮箱是否已存在
    user = user_crud.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册",
        )

    # 检查手机号是否已存在（如果提供了手机号）
    if user_in.phone:
        user = user_crud.get_by_phone(db, phone=user_in.phone)
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="手机号已被注册",
            )

    # 创建用户
    user = user_crud.create(db, obj_in=user_in)
    return user