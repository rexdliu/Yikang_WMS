from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(title="Product Warehouse API", version="1.0.0")

# 添加CORS中间件以允许前端连接
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该指定具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录（前端构建后的文件）
# 如果存在前端构建目录，则挂载静态文件服务
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")

@app.get("/api/")
def read_root():
    return {"message": "Welcome to Product Warehouse API"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/products")
def get_products():
    # 模拟产品数据
    products = [
        {"id": 1, "name": "Product 1", "quantity": 10},
        {"id": 2, "name": "Product 2", "quantity": 20},
        {"id": 3, "name": "Product 3", "quantity": 30},
    ]
    return {"products": products}

@app.get("/Cummins_logo.svg")
async def favicon():
    # 如果public目录下有favicon.ico文件，则提供它
    if os.path.exists("public/Cummins_logo.svg"):
        return FileResponse("public/Cummins_logo.svg")
    # 否则返回一个默认的图标或404
    return FileResponse("404")

# 为所有未匹配到的路径提供前端应用（支持前端路由）
# 注意：这个端点应该放在所有API路由之后
if os.path.exists("dist"):
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # 返回前端应用的入口文件
        return FileResponse("dist/index.html")