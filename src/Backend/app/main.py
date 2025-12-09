"""
WarehouseAI 后端主应用入口文件

该文件包含 FastAPI 应用的初始化、配置和路由注册。
主要功能：
1. 初始化 FastAPI 应用实例
2. 配置 CORS 中间件以支持跨域请求
3. 注册 API 路由
4. 提供健康检查端点
5. 配置静态文件服务（用于头像等资源）
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .api.v1 import api_router
from app.core.config import settings
from app.core.database import Base, engine
# 导入模型以确保元数据注册
from app.models import user as user_models  # noqa: F401
from app.models import product as product_models  # noqa: F401
from app.models import inventory as inventory_models  # noqa: F401
from app.models import sales as sales_models  # noqa: F401
from app.models import notification as notification_models  # noqa: F401
import os

app = FastAPI(
    title="WarehouseAI API",
    description="API for Warehouse Management with AI capabilities",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含API路由
app.include_router(api_router, prefix="/api/v1")

# 配置静态文件服务
# 获取static目录的绝对路径
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)  # 确保static目录存在
(static_dir / "avatars").mkdir(exist_ok=True)  # 确保avatars子目录存在

# 挂载静态文件服务
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
async def root():
    """根路径，返回欢迎信息"""
    return {"message": "Welcome to WarehouseAI API"}

@app.get("/api/v1/health")
async def api_health_check():
    """版本化健康检查端点，便于前端统一代理"""
    return {"status": "healthy"}

@app.get("/health")
async def health_check():
    """健康检查端点，用于监控服务状态"""
    return {"status": "healthy"}

@app.get("/favicon.ico")
async def favicon():
    """Favicon图标"""
    # 使用绝对路径或相对路径查找favicon文件
    favicon_path = os.path.join("..", "..", "public", "favicon.ico")
    logo_path = os.path.join("..", "..", "public", "cummins_logo.png")
    
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    elif os.path.exists(logo_path):
        return FileResponse(logo_path)
    else:
        return {"message": "Favicon not found"}

@app.on_event("startup")
def on_startup() -> None:
    """应用启动时初始化数据库表（本地开发）。

    未连接外部数据库时，使用 SQLite 自动建表，方便前端联调。
    同时启动后台任务调度器。
    """
    Base.metadata.create_all(bind=engine)

    # 启动后台任务调度器
    from app.core.scheduler import start_scheduler
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown() -> None:
    """应用关闭时清理资源。

    关闭后台任务调度器。
    """
    from app.core.scheduler import shutdown_scheduler
    shutdown_scheduler()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
