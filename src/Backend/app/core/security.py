"""
安全模块

该模块提供密码加密、验证和 JWT 令牌管理功能。
主要功能：
1. 密码哈希和验证
2. JWT 访问令牌的创建和管理
3. 使用 Passlib 进行安全的密码处理
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings
import bcrypt  # type: ignore
from types import SimpleNamespace

# Temporary compatibility shim:
# passlib 1.x expects bcrypt.__about__.__version__, which was removed in bcrypt 4.3.
# Restore the attribute so passlib's backend loader doesn't raise AttributeError.
if not hasattr(bcrypt, "__about__"):  # pragma: no cover - safeguard for newer bcrypt
    bcrypt.__about__ = SimpleNamespace(__version__=getattr(bcrypt, "__version__", "0"))  # type: ignore[attr-defined]

# 密码加密上下文，使用 bcrypt 算法
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证明文密码与哈希密码是否匹配
    
    Args:
        plain_password: 明文密码
        hashed_password: 哈希密码
        
    Returns:
        bool: 如果密码匹配返回 True，否则返回 False
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    获取密码的哈希值
    
    Args:
        password: 明文密码
        
    Returns:
        str: 密码的哈希值
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建 JWT 访问令牌
    
    Args:
        data: 要编码到令牌中的数据
        expires_delta: 令牌过期时间增量
        
    Returns:
        str: JWT 访问令牌
    """
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt