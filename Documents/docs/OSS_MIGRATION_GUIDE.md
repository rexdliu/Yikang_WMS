# OSS 图片存储迁移方案

## 📋 概述

本文档说明如何将产品和用户头像图片从本地文件存储迁移到对象存储服务（OSS/S3）。

---

## 🎯 当前架构

### 文件存储位置
```
src/Backend/app/static/
├── avatars/          # 用户头像
│   └── avatar_1_abc123.jpg
└── products/         # 产品图片
    └── product_5_def456.jpg
```

### 数据库存储
```sql
-- 用户表
users.avatar_url = "/static/avatars/avatar_1_abc123.jpg"

-- 产品表
products.image_url = "/static/products/product_5_def456.jpg"
```

### 前端访问
- Vite 代理: `/static/*` → `http://127.0.0.1:8001/static/*`
- 浏览器请求: `http://localhost:80/static/avatars/avatar_1_abc123.jpg`

---

## 🔄 迁移方案选择

### 方案 1: 阿里云 OSS（推荐国内用户）

**优势:**
- 国内访问速度快
- 支持CDN加速
- 按量付费，成本低
- 图片处理功能丰富（缩放、裁剪、水印等）

**适用场景:**
- 主要服务中国用户
- 需要CDN加速
- 需要图片实时处理

### 方案 2: AWS S3（推荐海外用户）

**优势:**
- 全球节点覆盖
- 高可用性和耐久性
- 与其他AWS服务集成良好
- 行业标准

**适用场景:**
- 全球化业务
- 已使用AWS其他服务
- 需要高可用性保障

### 方案 3: MinIO（推荐中期方案）

**优势:**
- 开源免费
- S3 兼容API
- Docker部署简单
- 完全自主控制

**适用场景:**
- 私有云部署
- 有一定运维能力
- 控制成本
- 数据安全要求高

---

## 🚀 实施步骤

### 阶段 1: 创建存储抽象层

#### 1.1 创建存储接口

```python
# src/Backend/app/core/storage.py

from abc import ABC, abstractmethod
from typing import BinaryIO, Optional
from pathlib import Path

class StorageBackend(ABC):
    """存储后端抽象接口"""

    @abstractmethod
    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        folder: str = ""
    ) -> str:
        """
        上传文件

        Args:
            file: 文件对象
            filename: 文件名
            content_type: MIME类型
            folder: 文件夹路径

        Returns:
            文件的访问URL
        """
        pass

    @abstractmethod
    async def delete(self, file_url: str) -> bool:
        """删除文件"""
        pass

    @abstractmethod
    async def exists(self, file_url: str) -> bool:
        """检查文件是否存在"""
        pass


class LocalStorageBackend(StorageBackend):
    """本地文件系统存储（当前实现）"""

    def __init__(self, base_path: Path, base_url: str = "/static"):
        self.base_path = base_path
        self.base_url = base_url

    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        folder: str = ""
    ) -> str:
        # 确保目录存在
        upload_dir = self.base_path / folder
        upload_dir.mkdir(parents=True, exist_ok=True)

        # 保存文件
        file_path = upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(file.read())

        # 返回URL
        return f"{self.base_url}/{folder}/{filename}"

    async def delete(self, file_url: str) -> bool:
        if not file_url.startswith(self.base_url):
            return False

        # 提取文件路径
        relative_path = file_url[len(self.base_url):].lstrip("/")
        file_path = self.base_path / relative_path

        if file_path.exists():
            file_path.unlink()
            return True
        return False

    async def exists(self, file_url: str) -> bool:
        if not file_url.startswith(self.base_url):
            return False

        relative_path = file_url[len(self.base_url):].lstrip("/")
        file_path = self.base_path / relative_path
        return file_path.exists()


class OSSStorageBackend(StorageBackend):
    """阿里云OSS存储"""

    def __init__(
        self,
        access_key_id: str,
        access_key_secret: str,
        endpoint: str,
        bucket_name: str,
        cdn_domain: Optional[str] = None
    ):
        import oss2
        self.auth = oss2.Auth(access_key_id, access_key_secret)
        self.bucket = oss2.Bucket(self.auth, endpoint, bucket_name)
        self.cdn_domain = cdn_domain or f"https://{bucket_name}.{endpoint}"

    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        folder: str = ""
    ) -> str:
        # OSS路径
        object_key = f"{folder}/{filename}" if folder else filename

        # 上传到OSS
        self.bucket.put_object(
            object_key,
            file.read(),
            headers={'Content-Type': content_type}
        )

        # 返回CDN URL
        return f"{self.cdn_domain}/{object_key}"

    async def delete(self, file_url: str) -> bool:
        # 从URL提取object_key
        object_key = file_url.replace(self.cdn_domain + "/", "")

        try:
            self.bucket.delete_object(object_key)
            return True
        except Exception as e:
            print(f"删除OSS文件失败: {e}")
            return False

    async def exists(self, file_url: str) -> bool:
        object_key = file_url.replace(self.cdn_domain + "/", "")
        return self.bucket.object_exists(object_key)


class S3StorageBackend(StorageBackend):
    """AWS S3存储"""

    def __init__(
        self,
        access_key_id: str,
        secret_access_key: str,
        region: str,
        bucket_name: str,
        cdn_domain: Optional[str] = None
    ):
        import boto3
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region
        )
        self.bucket_name = bucket_name
        self.cdn_domain = cdn_domain or f"https://{bucket_name}.s3.{region}.amazonaws.com"

    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        folder: str = ""
    ) -> str:
        object_key = f"{folder}/{filename}" if folder else filename

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=object_key,
            Body=file.read(),
            ContentType=content_type
        )

        return f"{self.cdn_domain}/{object_key}"

    async def delete(self, file_url: str) -> bool:
        object_key = file_url.replace(self.cdn_domain + "/", "")

        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            return True
        except Exception as e:
            print(f"删除S3文件失败: {e}")
            return False

    async def exists(self, file_url: str) -> bool:
        object_key = file_url.replace(self.cdn_domain + "/", "")

        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            return True
        except:
            return False


class MinIOStorageBackend(StorageBackend):
    """MinIO存储（S3兼容）"""

    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket_name: str,
        secure: bool = False
    ):
        from minio import Minio
        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure
        )
        self.bucket_name = bucket_name
        self.endpoint = f"{'https' if secure else 'http'}://{endpoint}"

        # 确保bucket存在
        if not self.client.bucket_exists(bucket_name):
            self.client.make_bucket(bucket_name)

    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        folder: str = ""
    ) -> str:
        object_key = f"{folder}/{filename}" if folder else filename

        # 获取文件大小
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)

        self.client.put_object(
            self.bucket_name,
            object_key,
            file,
            file_size,
            content_type=content_type
        )

        return f"{self.endpoint}/{self.bucket_name}/{object_key}"

    async def delete(self, file_url: str) -> bool:
        object_key = file_url.replace(f"{self.endpoint}/{self.bucket_name}/", "")

        try:
            self.client.remove_object(self.bucket_name, object_key)
            return True
        except Exception as e:
            print(f"删除MinIO文件失败: {e}")
            return False

    async def exists(self, file_url: str) -> bool:
        object_key = file_url.replace(f"{self.endpoint}/{self.bucket_name}/", "")

        try:
            self.client.stat_object(self.bucket_name, object_key)
            return True
        except:
            return False
```

#### 1.2 配置管理

```python
# src/Backend/app/core/config.py

from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # ... 现有配置 ...

    # 存储配置
    STORAGE_BACKEND: Literal["local", "oss", "s3", "minio"] = "local"

    # 本地存储配置
    LOCAL_STORAGE_PATH: str = "./static"
    LOCAL_STORAGE_URL: str = "/static"

    # 阿里云OSS配置
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    OSS_ENDPOINT: str = "oss-cn-hangzhou.aliyuncs.com"
    OSS_BUCKET_NAME: str = ""
    OSS_CDN_DOMAIN: str = ""

    # AWS S3配置
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = ""
    S3_CDN_DOMAIN: str = ""

    # MinIO配置
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "warehouse"
    MINIO_SECURE: bool = False

settings = Settings()


# 存储工厂函数
def get_storage_backend() -> StorageBackend:
    """根据配置返回对应的存储后端"""
    from pathlib import Path
    from app.core.storage import (
        LocalStorageBackend,
        OSSStorageBackend,
        S3StorageBackend,
        MinIOStorageBackend
    )

    if settings.STORAGE_BACKEND == "oss":
        return OSSStorageBackend(
            access_key_id=settings.OSS_ACCESS_KEY_ID,
            access_key_secret=settings.OSS_ACCESS_KEY_SECRET,
            endpoint=settings.OSS_ENDPOINT,
            bucket_name=settings.OSS_BUCKET_NAME,
            cdn_domain=settings.OSS_CDN_DOMAIN or None
        )

    elif settings.STORAGE_BACKEND == "s3":
        return S3StorageBackend(
            access_key_id=settings.S3_ACCESS_KEY_ID,
            secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            region=settings.S3_REGION,
            bucket_name=settings.S3_BUCKET_NAME,
            cdn_domain=settings.S3_CDN_DOMAIN or None
        )

    elif settings.STORAGE_BACKEND == "minio":
        return MinIOStorageBackend(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            bucket_name=settings.MINIO_BUCKET_NAME,
            secure=settings.MINIO_SECURE
        )

    else:  # local (default)
        return LocalStorageBackend(
            base_path=Path(settings.LOCAL_STORAGE_PATH),
            base_url=settings.LOCAL_STORAGE_URL
        )
```

#### 1.3 修改上传API使用存储抽象层

```python
# src/Backend/app/api/v1/products.py

from app.core.config import get_storage_backend

@router.post("/{product_id}/image")
async def upload_product_image(
    *,
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
) -> Any:
    """上传产品图片（支持多种存储后端）"""

    # 验证产品存在
    product = product_repo.get(db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="产品不存在")

    # 验证文件
    if not file.content_type or file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="仅支持 JPG, PNG, WEBP 格式")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片大小不能超过 5MB")

    # 生成文件名
    file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
    unique_filename = f"product_{product_id}_{uuid.uuid4().hex[:8]}.{file_extension}"

    # 获取存储后端
    storage = get_storage_backend()

    # 删除旧图片
    if product.image_url:
        try:
            await storage.delete(product.image_url)
        except Exception as e:
            print(f"删除旧图片失败: {e}")

    # 上传新图片
    from io import BytesIO
    file_obj = BytesIO(content)
    image_url = await storage.upload(
        file=file_obj,
        filename=unique_filename,
        content_type=file.content_type,
        folder="products"
    )

    # 更新数据库
    product.image_url = image_url
    db.add(product)
    db.commit()
    db.refresh(product)

    # 记录日志
    await log_activity(
        db=db,
        user_id=current_user.id,
        action="upload_product_image",
        resource_type="product",
        resource_id=product_id,
        details=f"上传产品图片: {unique_filename}"
    )

    return {"image_url": image_url, "message": "图片上传成功"}
```

### 阶段 2: 环境配置

#### 2.1 开发环境（使用本地存储）

```bash
# .env.development
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./static
LOCAL_STORAGE_URL=/static
```

#### 2.2 测试环境（使用MinIO）

```bash
# .env.staging
STORAGE_BACKEND=minio
MINIO_ENDPOINT=minio.staging.example.com:9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET_NAME=warehouse-staging
MINIO_SECURE=false
```

**Docker Compose 配置:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    container_name: warehouse_minio
    ports:
      - "9000:9000"
      - "9001:9001"  # MinIO Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    networks:
      - warehouse_network

  backend:
    # ... 现有配置 ...
    depends_on:
      - minio
    environment:
      STORAGE_BACKEND: minio
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET_NAME: warehouse
      MINIO_SECURE: "false"

volumes:
  minio_data:

networks:
  warehouse_network:
```

#### 2.3 生产环境（使用阿里云OSS）

```bash
# .env.production
STORAGE_BACKEND=oss
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=warehouse-prod
OSS_CDN_DOMAIN=https://cdn.example.com
```

### 阶段 3: 数据迁移

#### 3.1 创建迁移脚本

```python
# scripts/migrate_images_to_oss.py

import asyncio
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import get_storage_backend
from app.models.user import User
from app.models.product import Product

async def migrate_images():
    """迁移所有图片到新的存储后端"""

    db: Session = SessionLocal()
    storage = get_storage_backend()

    # 本地存储路径
    static_dir = Path("./static")

    try:
        # 1. 迁移用户头像
        print("开始迁移用户头像...")
        users = db.query(User).filter(User.avatar_url.isnot(None)).all()

        for user in users:
            if not user.avatar_url or not user.avatar_url.startswith("/static/"):
                continue

            # 读取本地文件
            filename = user.avatar_url.split("/")[-1]
            file_path = static_dir / "avatars" / filename

            if not file_path.exists():
                print(f"文件不存在: {file_path}")
                continue

            # 上传到新存储
            with open(file_path, "rb") as f:
                new_url = await storage.upload(
                    file=f,
                    filename=filename,
                    content_type="image/jpeg",
                    folder="avatars"
                )

            # 更新数据库
            user.avatar_url = new_url
            db.add(user)
            print(f"✓ 迁移用户 {user.id} 的头像: {new_url}")

        # 2. 迁移产品图片
        print("\n开始迁移产品图片...")
        products = db.query(Product).filter(Product.image_url.isnot(None)).all()

        for product in products:
            if not product.image_url or not product.image_url.startswith("/static/"):
                continue

            filename = product.image_url.split("/")[-1]
            file_path = static_dir / "products" / filename

            if not file_path.exists():
                print(f"文件不存在: {file_path}")
                continue

            with open(file_path, "rb") as f:
                new_url = await storage.upload(
                    file=f,
                    filename=filename,
                    content_type="image/jpeg",
                    folder="products"
                )

            product.image_url = new_url
            db.add(product)
            print(f"✓ 迁移产品 {product.id} 的图片: {new_url}")

        # 提交所有更改
        db.commit()
        print("\n✅ 迁移完成！")

    except Exception as e:
        db.rollback()
        print(f"\n❌ 迁移失败: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(migrate_images())
```

#### 3.2 运行迁移

```bash
# 1. 备份数据库
mysqldump -u root -p warehouse > backup_$(date +%Y%m%d).sql

# 2. 备份静态文件
tar -czf static_backup_$(date +%Y%m%d).tar.gz src/Backend/app/static/

# 3. 设置新的存储后端环境变量
export STORAGE_BACKEND=oss
export OSS_ACCESS_KEY_ID=your_key
export OSS_ACCESS_KEY_SECRET=your_secret
# ... 其他配置 ...

# 4. 运行迁移脚本
python scripts/migrate_images_to_oss.py

# 5. 验证迁移结果
# 检查数据库中的URL是否已更新
# 访问几个图片URL确认可以访问

# 6. 部署新代码
git pull
# 重启应用

# 7. 删除本地静态文件（可选，建议保留一段时间）
# rm -rf src/Backend/app/static/
```

### 阶段 4: 前端调整

#### 4.1 移除Vite代理（如果使用CDN）

```typescript
// vite.config.ts

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 80,
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
      // ❌ 移除 /static 代理（因为图片已在OSS）
      // '/static': {
      //   target: 'http://127.0.0.1:8001',
      //   changeOrigin: true,
      //   secure: false,
      // },
    }
  },
  // ...
}));
```

---

## 📊 成本估算

### 阿里云OSS

**存储费用:**
- 标准存储: ¥0.12/GB/月
- 示例: 10GB图片 = ¥1.2/月

**流量费用:**
- CDN回源流量: ¥0.15/GB
- 示例: 100GB/月 = ¥15/月

**总计:** 约 ¥16-20/月（小型项目）

### AWS S3

**存储费用:**
- 标准存储: $0.023/GB/月
- 示例: 10GB = $0.23/月

**流量费用:**
- 数据传输: $0.09/GB（前1GB免费）
- 示例: 100GB = $9/月

**总计:** 约 $9-12/月（小型项目）

### MinIO（自托管）

**服务器成本:**
- 云服务器: ¥50-100/月（1核2G）
- 存储: ¥0.5/GB/月

**总计:** 约 ¥55-110/月（包含10GB存储）

---

## ⚠️ 注意事项

1. **CORS配置:** 确保OSS/S3 bucket配置了正确的CORS规则
2. **CDN配置:** 建议配置CDN加速访问
3. **备份策略:** 定期备份OSS数据
4. **权限管理:** 使用最小权限原则配置访问密钥
5. **URL签名:** 对敏感文件使用签名URL
6. **监控告警:** 配置流量和费用告警

---

## 🔍 故障排查

### 图片上传失败

```bash
# 检查存储后端配置
python -c "from app.core.config import settings; print(settings.STORAGE_BACKEND)"

# 测试OSS连接
python -c "from app.core.storage import get_storage_backend; storage = get_storage_backend(); print(storage)"

# 查看错误日志
tail -f logs/app.log
```

### 图片无法访问

1. 检查URL格式是否正确
2. 检查OSS/S3 bucket公共读权限
3. 检查CDN配置
4. 使用浏览器开发者工具查看请求详情

---

## 📚 相关资源

- [阿里云OSS Python SDK](https://help.aliyun.com/document_detail/32026.html)
- [AWS S3 Python SDK (boto3)](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [MinIO Python SDK](https://docs.min.io/docs/python-client-quickstart-guide.html)
- [FastAPI File Upload](https://fastapi.tiangolo.com/tutorial/request-files/)

---

## 📞 支持

如有问题，请查看项目文档或提交Issue。
