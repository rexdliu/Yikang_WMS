"""
用户 Pydantic 模型

该模块定义了与用户相关的 Pydantic 模型，用于数据验证和序列化。
主要包含：
1. UserBase - 用户基础模型
2. UserCreate - 创建用户模型
3. UserUpdate - 更新用户模型
4. UserInDB - 数据库用户模型
5. UserSettings - 用户设置模型
6. 登录和令牌相关模型
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime

# 基础用户模型
class UserBase(BaseModel):
    """用户基础模型，包含所有用户共享的字段"""
    username: str
    email: str
    phone: Optional[str] = None
    full_name: Optional[str] = None

# 创建用户模型
class UserCreate(UserBase):
    """创建用户模型，包含创建用户时需要的字段"""
    password: str
    role: Optional[str] = "staff"  # 默认角色为 staff

# 更新用户模型
class UserUpdate(BaseModel):
    """更新用户模型，所有字段均为可选以支持部分更新"""
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

# 用户个人资料更新模型（用于 PUT /users/me）
class UserProfileUpdate(BaseModel):
    """用户个人资料更新模型 - 允许所有用户更新自己的信息"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    full_name: Optional[str] = Field(None, max_length=100)
    language: Optional[str] = Field(None, pattern="^(zh-CN|en-US)$")

# 数据库用户模型
class UserInDB(UserBase):
    """数据库用户模型，包含从数据库中获取的用户信息"""
    id: int
    role: str
    is_active: bool
    is_superuser: bool
    avatar_url: Optional[str] = None
    language: Optional[str] = "zh-CN"
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 用户密码更新模型
class UserPasswordUpdate(BaseModel):
    """用户密码更新模型"""
    current_password: str
    new_password: str = Field(..., min_length=8, description="新密码至少8位")

# 头像上传响应模型
class AvatarUploadResponse(BaseModel):
    """头像上传响应模型"""
    avatar_url: str

# 修改密码响应模型
class PasswordChangeResponse(BaseModel):
    """修改密码响应模型"""
    message: str
class UserSettings(BaseModel):
    """用户设置模型"""
    theme: str
    notification_settings: Dict[str, Any]
    notifications: Dict[str, Any]
    avatar_url: str
    ai_settings: Dict[str, Any]
class UserSettingsUpdate(BaseModel):
    """用户设置更新模型"""
    theme: str
    notification_settings: Optional[Dict[str, Any]] = None
    avatar_url: Optional[str] = None
    ai_seetings: Optional[Dict[str, Any]] = None

# 登录模型
class LoginRequest(BaseModel):
    """登录请求模型"""
    username: str
    password: str

# Token模型
class Token(BaseModel):
    """JWT 令牌模型"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """令牌数据模型"""
    username: Optional[str] = None
