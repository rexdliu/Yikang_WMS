"""
用户 CRUD 操作

该模块定义了用户相关的 CRUD 操作。
主要功能：
1. 用户的创建、获取、更新
2. 用户认证（用户名/密码验证）
3. 用户状态检查（活跃状态、超级用户）
"""

from typing import Any, Dict, Optional, Union, cast
from sqlalchemy.orm import Session
from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """用户 CRUD 操作类"""
    
    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        """
        根据用户名获取用户
        
        Args:
            db: 数据库会话
            username: 用户名
            
        Returns:
            Optional[User]: 用户对象或 None
        """
        return db.query(User).filter(User.username == username).first()

    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        """
        根据邮箱获取用户
        
        Args:
            db: 数据库会话
            email: 邮箱地址
            
        Returns:
            Optional[User]: 用户对象或 None
        """
        return db.query(User).filter(User.email == email).first()
    def get_by_phone(self, db: Session, *, phone: str) -> Optional[User]:
        """
        根据手机号获取用户
        
        Args:
            db: 数据库会话
            phone: 手机号
            
        Returns:
            Optional[User]: 用户对象或 None
        """
        return db.query(User).filter(User.phone == phone).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """
        创建新用户

        Args:
            db: 数据库会话
            obj_in: 用户创建模式实例

        Returns:
            User: 创建的用户对象
        """
        db_obj = User(
            username=obj_in.username,
            email=obj_in.email,
            phone=obj_in.phone,
            full_name=obj_in.full_name,
            hashed_password=get_password_hash(obj_in.password),
            role=obj_in.role or "staff",
            is_active=True,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: User,
        obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        """
        更新用户信息
        
        Args:
            db: 数据库会话
            db_obj: 数据库用户对象
            obj_in: 用户更新模式实例
            
        Returns:
            User: 更新后的用户对象
        """
        if isinstance(obj_in, dict):
            update_data = obj_in.copy()
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        if "password" in update_data:
            password = update_data["password"]
            hashed_password = get_password_hash(password)
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def authenticate(self, db: Session, *, username: str, password: str) -> Optional[User]:
        """
        验证用户身份
        
        Args:
            db: 数据库会话
            username: 用户名
            password: 明文密码
            
        Returns:
            Optional[User]: 验证成功的用户对象或 None
        """
        user = self.get_by_username(db, username=username)
        if not user:
            return None
        stored_hash = cast(str, user.hashed_password)
        if not verify_password(password, stored_hash):
            return None
        return user

    def is_active(self, user: User) -> bool:
        """
        检查用户是否活跃
        
        Args:
            user: 用户对象
            
        Returns:
            bool: 如果用户活跃返回 True，否则返回 False
        """
        return bool(getattr(user, "is_active", False))

    def is_superuser(self, user: User) -> bool:
        """
        检查用户是否为超级用户
        
        Args:
            user: 用户对象
            
        Returns:
            bool: 如果用户是超级用户返回 True，否则返回 False
        """
        return bool(getattr(user, "is_superuser", False))

# 创建用户 CRUD 实例
user = CRUDUser(User)
