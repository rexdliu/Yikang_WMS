"""
FastAPI v1 模块兼容层

历史上路由直接从 ``app.api.deps`` 导入依赖项。为了
避免重复实现，这里简单地重新导出 core 层的依赖函数。
"""

from app.core.dependencies import (  # noqa: F401
    oauth2_scheme,
    get_current_user,
    get_current_active_user,
    get_current_active_superuser,
    require_admin,
    require_manager_or_above,
    require_staff_or_above,
)

__all__ = [
    "oauth2_scheme",
    "get_current_user",
    "get_current_active_user",
    "get_current_active_superuser",
    "require_admin",
    "require_manager_or_above",
    "require_staff_or_above",
]
