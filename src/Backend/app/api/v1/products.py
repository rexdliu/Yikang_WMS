from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
import os
import uuid
from pathlib import Path
from app.core.database import get_db
from app.crud.product import product as product_repo, category as category_repo
from app.schemas.product import (
    ProductCreate,
    ProductCreateRequest,
    ProductUpdate,
    ProductInDB,
    ProductCategoryInDB,
)
from app.schemas.inventory import InventoryCreate
from app.crud.inventory import inventory as inventory_repo, warehouse as warehouse_repo
from app.utils.activity import log_activity
from app.utils.notification import send_notification_to_managers
from app.api.deps import (
    get_current_active_user,
    require_manager_or_above,
    require_admin,
)
from app.models.user import User
from app.models.product import Product
from app.models.inventory import InventoryTransaction

router = APIRouter()

@router.get("/", response_model=List[ProductInDB])
def read_products(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """获取产品列表"""
    products = product_repo.get_multi(db, skip=skip, limit=limit)
    return products

@router.post("/", response_model=ProductInDB)
def create_product(
    *,
    db: Session = Depends(get_db),
    product_in: ProductCreateRequest,
    current_user: User = Depends(require_manager_or_above)
) -> Any:
    """
    创建新产品

    需要 Manager/Admin/Tester 权限
    验证：
    - SKU 唯一性
    - Part number 唯一性（必填）
    - Category ID 存在性
    - Warehouse ID 存在性

    自动创建库存记录并记录活动日志
    """
    # 验证 SKU 唯一性
    existing = db.query(Product).filter(Product.sku == product_in.sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SKU '{product_in.sku}' 已存在"
        )

    # 验证 Part number 唯一性
    existing = db.query(Product).filter(
        Product.part_number == product_in.part_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"零件号 '{product_in.part_number}' 已存在"
        )

    # 验证分类存在
    category = category_repo.get(db, id=product_in.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"分类 ID {product_in.category_id} 不存在"
        )

    # 验证仓库存在
    warehouse = warehouse_repo.get(db, id=product_in.warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"仓库 ID {product_in.warehouse_id} 不存在"
        )

    # 创建产品
    product_data = ProductCreate(
        name=product_in.name,
        sku=product_in.sku,
        part_number=product_in.part_number,
        engine_model=None,  # 不需要填写发动机型号
        manufacturer=product_in.manufacturer,
        description=product_in.description,
        category_id=product_in.category_id,
        price=product_in.price,
        cost=product_in.cost,
        unit=product_in.unit,
        min_stock_level=product_in.min_stock_level,
        image_url=product_in.image_url,
        is_active=product_in.is_active
    )
    product = product_repo.create(db, obj_in=product_data)

    # 自动创建库存记录
    inventory_data = InventoryCreate(
        product_id=product.id,# type: ignore[arg-type]
        warehouse_id=product_in.warehouse_id,
        quantity=product_in.initial_quantity,
        reserved_quantity=0,
        location_code=product_in.location_code
    )
    inventory_repo.create(db, obj_in=inventory_data)

    # 如果有初始库存，创建入库交易记录
    if product_in.initial_quantity > 0:
        transaction = InventoryTransaction(
            product_id=product.id,  # type: ignore[arg-type]
            warehouse_id=product_in.warehouse_id,
            transaction_type="IN",
            quantity=product_in.initial_quantity,
            user_id=current_user.id,  # type: ignore[arg-type]
            reference=f"初始库存 - {product.sku}",  # type: ignore[arg-type]
            notes=f"产品创建时的初始库存"
        )
        db.add(transaction)

    # 记录活动日志
    log_activity(
        db=db,
        activity_type="product",
        action="创建产品",
        item_name=str(product.name),  # type: ignore[arg-type]
        user_id=int(current_user.id),  # type: ignore[arg-type]
        reference_id=int(product.id),  # type: ignore[arg-type]
        reference_type="product"
    )

    # 如果有初始库存，记录入库日志
    if product_in.initial_quantity > 0:
        log_activity(
            db=db,
            activity_type="inventory",
            action="入库",
            item_name=f"{product.name} (初始库存)",  # type: ignore[arg-type]
            user_id=int(current_user.id),  # type: ignore[arg-type]
            reference_id=int(product.id),  # type: ignore[arg-type]
            reference_type="product"
        )

    # 发送通知给所有管理员
    send_notification_to_managers(
        db=db,
        title="新产品创建",
        message=f"{current_user.username} 创建了新产品：{product.name}（{product.sku}），初始库存：{product_in.initial_quantity}",  # type: ignore[arg-type]
        notification_type="product",
        reference_id=int(product.id),  # type: ignore[arg-type]
        reference_type="product"
    )

    db.commit()
    db.refresh(product)
    return product

@router.get("/categories", response_model=List[ProductCategoryInDB])
def read_categories(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """获取产品分类列表"""
    return category_repo.get_multi(db, skip=skip, limit=limit)

@router.get("/{id}", response_model=ProductInDB)
def read_product(
    *,
    db: Session = Depends(get_db),
    id: int
) -> Any:
    """获取特定产品"""
    product = product_repo.get(db, id=id)
    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )
    return product

@router.put("/{id}", response_model=ProductInDB)
def update_product(
    *,
    db: Session = Depends(get_db),
    id: int,
    product_in: ProductUpdate,
    current_user: User = Depends(require_manager_or_above)
) -> Any:
    """
    更新产品信息

    需要 Manager/Admin/Tester 权限
    """
    product = product_repo.get(db, id=id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="产品不存在"
        )

    # 验证 SKU 唯一性（如果修改）
    if product_in.sku and product_in.sku != product.sku:
        existing = db.query(Product).filter(Product.sku == product_in.sku).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{product_in.sku}' 已存在"
            )

    # 验证 Part number 唯一性（如果修改）
    if product_in.part_number and product_in.part_number != product.part_number:
        existing = db.query(Product).filter(
            Product.part_number == product_in.part_number
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"零件号 '{product_in.part_number}' 已存在"
            )

    # 验证分类存在（如果修改）
    if product_in.category_id:
        category = category_repo.get(db, id=product_in.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"分类 ID {product_in.category_id} 不存在"
            )

    product = product_repo.update(db, db_obj=product, obj_in=product_in)
    return product

@router.delete("/{id}", response_model=ProductInDB)
def delete_product(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: User = Depends(require_admin)
) -> Any:
    """
    删除产品（软删除）

    需要 Admin 或 Tester 权限
    仅设置 is_active = False，不进行物理删除
    """
    product = product_repo.get(db, id=id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="产品不存在"
        )

    # 软删除：设置 is_active = False
    product.is_active = False  # type: ignore[assignment]
    db.add(product)
    db.commit()
    db.refresh(product)

    return product


@router.post("/{product_id}/image")
async def upload_product_image(
    *,
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
) -> Any:
    """
    上传产品图片

    需要 Manager/Admin/Tester 权限
    - 支持的格式: JPG, PNG, WEBP
    - 最大文件大小: 5MB
    - 文件保存在 static/products/ 目录
    - 自动生成唯一文件名
    """
    # 验证产品是否存在
    product = product_repo.get(db, id=product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"产品 ID {product_id} 不存在"
        )

    # 验证文件类型
    if not file.content_type or file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 JPG, PNG, WEBP 格式"
        )

    # 验证文件大小 (5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="图片大小不能超过 5MB"
        )

    # 获取文件扩展名
    file_extension = file.filename.split(".")[-1] if file.filename else "jpg"

    # 生成唯一文件名: product_{id}_{uuid}.{ext}
    unique_filename = f"product_{product_id}_{uuid.uuid4().hex[:8]}.{file_extension}"

    # 确保 static/products 目录存在
    static_dir = Path(__file__).parent.parent.parent / "static" / "products"
    static_dir.mkdir(parents=True, exist_ok=True)

    # 保存文件
    file_path = static_dir / unique_filename
    with open(file_path, "wb") as f:
        f.write(content)

    # 删除旧图片（如果存在且是本地文件）
    if product.image_url and product.image_url.startswith("/static/products/"):
        old_filename = product.image_url.split("/")[-1]
        old_file_path = static_dir / old_filename
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except Exception as e:
                print(f"删除旧图片失败: {e}")

    # 更新数据库中的 image_url
    image_url = f"/static/products/{unique_filename}"
    product.image_url = image_url  # type: ignore[assignment]
    db.add(product)
    db.commit()
    db.refresh(product)

    # 记录活动日志
    await log_activity(
        db=db,
        user_id=current_user.id,
        action="upload_product_image",
        resource_type="product",
        resource_id=product_id,
        details=f"上传产品图片: {unique_filename}"
    )

    return {"image_url": image_url, "message": "图片上传成功"}


@router.delete("/{product_id}/image")
async def delete_product_image(
    *,
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
) -> Any:
    """
    删除产品图片

    需要 Manager/Admin/Tester 权限
    - 删除文件系统中的图片文件
    - 清除数据库中的 image_url
    """
    # 验证产品是否存在
    product = product_repo.get(db, id=product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"产品 ID {product_id} 不存在"
        )

    if not product.image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该产品没有图片"
        )

    # 只删除本地存储的图片，不删除外部URL
    if product.image_url.startswith("/static/products/"):
        filename = product.image_url.split("/")[-1]
        static_dir = Path(__file__).parent.parent.parent / "static" / "products"
        file_path = static_dir / filename

        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"删除图片文件失败: {str(e)}"
                )

    # 清除数据库中的 image_url
    product.image_url = None  # type: ignore[assignment]
    db.add(product)
    db.commit()
    db.refresh(product)

    # 记录活动日志
    await log_activity(
        db=db,
        user_id=current_user.id,
        action="delete_product_image",
        resource_type="product",
        resource_id=product_id,
        details="删除产品图片"
    )

    return {"message": "图片已删除"}
