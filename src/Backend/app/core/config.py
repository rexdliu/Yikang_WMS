"""
应用核心配置模块

该模块定义了应用的核心配置设置，使用 Pydantic 的 BaseSettings 来管理环境变量。
主要功能：
1. 管理数据库连接配置
2. 管理 JWT 认证配置
3. 管理 CORS 配置
4. 管理 AI 服务配置
5. 通过环境变量覆盖默认配置
"""

from typing import List, Optional

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类"""

    # 数据库配置（必须通过 .env 或环境变量提供）
    DATABASE_URL: Optional[str] = Field(
        default=None,
        description="SQLAlchemy 连接字符串，需在 .env 中配置",
    )

    # JWT配置（通过环境变量注入）
    SECRET_KEY: str = Field(
        default="",
        description="JWT 签名密钥，必须在 .env 或环境变量中配置",
    )
    ALGORITHM: str = Field(
        default="HS256",
        description="JWT 加密算法，可通过环境变量覆盖",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=1440,
        description="访问令牌有效期（分钟），可通过环境变量覆盖",
    )

    # CORS配置（本地开发默认包含 5173 与 8003）
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8003",
        "http://127.0.0.1:8003",
    ]

    # AI服务配置
    OPENAI_API_KEY: Optional[str] = None
    RAG_ENABLED: bool = False

    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        """返回数据库URL"""
        if not self.DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL 未配置，请在 .env 中设置数据库连接字符串。"
            )
        return self.DATABASE_URL

    @model_validator(mode="after")
    def _ensure_required_fields(self):
        """确保关键配置已注入"""
        missing = []
        if not self.DATABASE_URL:
            missing.append("DATABASE_URL")
        if not self.SECRET_KEY:
            missing.append("SECRET_KEY")
        if missing:
            raise ValueError(
                f"缺少必要配置: {', '.join(missing)}，请在 .env 或环境变量中设置。"
            )
        return self

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",#生产环境要改成.env.production
        extra="ignore"  # 忽略.env文件中的额外变量
    )


# 创建全局配置实例
settings = Settings()
