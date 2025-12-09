"""Backend app package initializer."""

from __future__ import annotations

import sys

# 允许使用顶层 `app.*` 导入，兼容现有代码与运行脚本
sys.modules.setdefault("app", sys.modules[__name__])
