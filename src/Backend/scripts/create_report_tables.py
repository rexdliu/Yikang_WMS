#!/usr/bin/env python3
"""
创建报告和洞察表

运行: cd src/Backend && python scripts/create_report_tables.py
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# 加载环境变量
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env')
load_dotenv(env_path)

from app.core.database import engine, Base
from app.models.report import Report, AIInsight

def create_tables():
    """创建报告相关的表"""
    # 只创建 Report 和 AIInsight 表
    Report.__table__.create(engine, checkfirst=True)
    AIInsight.__table__.create(engine, checkfirst=True)
    print("✅ 报告表创建成功！")
    print("   - reports")
    print("   - ai_insights")

if __name__ == "__main__":
    create_tables()
