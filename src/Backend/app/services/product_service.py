from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate

class ProductService:
    def get_products(self, db: Session, skip: int = 0, limit: int = 100) -> List[Product]:
        """获取产品列表"""
        return db.query(Product).offset(skip).limit(limit).all()
    
    def get_product(self, db: Session, product_id: int) -> Optional[Product]:
        """根据ID获取产品"""
        return db.query(Product).filter(Product.id == product_id).first()
    
    def create_product(self, db: Session, product: ProductCreate) -> Product:
        """创建产品"""
        db_product = Product(**product.model_dump())
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    
    def update_product(self, db: Session, product_id: int, product_update: ProductUpdate) -> Optional[Product]:
        """更新产品"""
        db_product = self.get_product(db, product_id)
        if not db_product:
            return None
        
        update_data = product_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_product, field, value)
        
        db.commit()
        db.refresh(db_product)
        return db_product
    
    def delete_product(self, db: Session, product_id: int) -> bool:
        """删除产品"""
        db_product = self.get_product(db, product_id)
        if not db_product:
            return False
        
        db.delete(db_product)
        db.commit()
        return True

# 创建产品服务实例
product_service = ProductService()