from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.inventory import Inventory, Warehouse
from app.schemas.inventory import InventoryCreate, InventoryUpdate

class InventoryService:
    def get_inventory_items(self, db: Session, skip: int = 0, limit: int = 100) -> List[Inventory]:
        """获取库存项目列表"""
        return db.query(Inventory).offset(skip).limit(limit).all()
    
    def get_inventory_item(self, db: Session, item_id: int) -> Optional[Inventory]:
        """根据ID获取库存项目"""
        return db.query(Inventory).filter(Inventory.id == item_id).first()
    
    def create_inventory_item(self, db: Session, item: InventoryCreate) -> Inventory:
        """创建库存项目"""
        db_item = Inventory(**item.model_dump())
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item
    
    def update_inventory_item(self, db: Session, item_id: int, item_update: InventoryUpdate) -> Optional[Inventory]:
        """更新库存项目"""
        db_item = self.get_inventory_item(db, item_id)
        if not db_item:
            return None
        
        update_data = item_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_item, field, value)
        
        db.commit()
        db.refresh(db_item)
        return db_item
    
    def get_low_stock_items(self, db: Session, threshold: int = 10) -> List[Inventory]:
        """获取低库存项目"""
        return db.query(Inventory).filter(Inventory.quantity <= threshold).all()

# 创建库存服务实例
inventory_service = InventoryService()