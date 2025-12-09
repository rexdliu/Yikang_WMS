"""
数据库连接模块

该模块负责初始化和管理数据库连接。
主要功能：
1. 创建 SQLAlchemy 数据库引擎
2. 创建会话工厂
3. 提供数据库会话依赖项
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# 创建数据库引擎
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=True  # 打印SQL语句用于调试
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基础类，用于定义模型
Base = declarative_base()

def get_db():
    """
    获取数据库会话依赖项
    
    Yields:
        Session: 数据库会话对象
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
