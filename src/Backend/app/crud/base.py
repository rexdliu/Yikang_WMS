"""
基础 CRUD 操作类

该模块定义了一个通用的 CRUD 操作基类，其他具体的 CRUD 类可以继承此类。
主要功能：
1. 提供通用的创建、读取、更新、删除操作
2. 支持泛型，可以适用于任何模型和模式
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    CRUD对象基类，提供默认的创建、读取、更新、删除方法。
    
    **参数**
    * `model`: SQLAlchemy 模型类
    * `schema`: Pydantic 模型（模式）类
    """
    
    def __init__(self, model: Type[ModelType]):
        """
        初始化 CRUD 对象
        
        Args:
            model: SQLAlchemy 模型类
        """
        self.model: Type[ModelType] = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """
        根据 ID 获取单个对象
        
        Args:
            db: 数据库会话
            id: 对象 ID
            
        Returns:
            Optional[ModelType]: 对象实例或 None
        """
        return db.get(self.model, id)

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """
        获取多个对象（支持分页）
        
        Args:
            db: 数据库会话
            skip: 跳过的记录数（偏移量）
            limit: 返回的记录数限制
            
        Returns:
            List[ModelType]: 对象列表
        """
        return db.query(self.model).offset(skip).limit(limit).all()

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        """
        创建新对象
        
        Args:
            db: 数据库会话
            obj_in: 创建对象的模式实例
            
        Returns:
            ModelType: 创建的对象实例
        """
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)  # type: ignore
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        更新对象
        
        Args:
            db: 数据库会话
            db_obj: 数据库对象实例
            obj_in: 更新数据（模式实例或字典）
            
        Returns:
            ModelType: 更新后的对象实例
        """
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int) -> ModelType:
        """
        删除对象
        
        Args:
            db: 数据库会话
            id: 对象 ID
            
        Returns:
            ModelType: 删除的对象实例
        """
        obj = db.get(self.model, id)
        if obj is None:
            raise ValueError(f"{self.model.__name__} with id {id} not found")
        db.delete(obj)
        db.commit()
        return obj
