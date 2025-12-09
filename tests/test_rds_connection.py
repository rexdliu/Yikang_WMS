#!/usr/bin/env python3
"""
测试阿里云RDS MySQL数据库连接
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 修复导入路径
import src.Backend.app.core.config
import src.Backend.app.core.database
from src.Backend.app.core.config import settings
from src.Backend.app.core.database import engine, SessionLocal
from sqlalchemy import text

def test_database_connection():
    print("测试阿里云RDS MySQL数据库连接...")
    print(f"数据库URL: {settings.SQLALCHEMY_DATABASE_URL}")
    
    try:
        # 测试数据库引擎连接
        with engine.connect() as connection:
            # MySQL数据库查询
            result = connection.execute(text("SELECT VERSION()"))
            version = result.fetchone()
            if version:
                print(f"MySQL版本: {version[0]}")
            else:
                print("无法获取MySQL版本。")

            result = connection.execute(text("SELECT DATABASE()"))
            database = result.fetchone()
            if database:
                print(f"当前数据库: {database[0]}")
            else:
                print("无法获取当前数据库。")
            
        print("✅ 数据库引擎连接成功!")
        
        # 测试会话创建
        session = SessionLocal()
        result = session.execute(text("SHOW TABLES"))
        tables = result.fetchall()
        print(f"现有数据表: {[table[0] for table in tables]}")
        session.close()
        print("✅ 数据库会话测试成功!")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        # 提供一些故障排除建议
        if "nodename nor servname provided" in str(e):
            print("🔧 故障排除提示:")
            print("  1. 检查数据库主机名是否正确")
            print("  2. 确保网络连接正常")
            print("  3. 检查RDS实例是否已启动")
            print("  4. 确认安全组设置允许当前IP访问")
        return False

if __name__ == "__main__":
    print("=== 阿里云RDS MySQL数据库连接测试 ===")
    success = test_database_connection()
    if success:
        print("\n🎉 所有测试通过，数据库连接配置正确!")
    else:
        print("\n💥 数据库连接存在问题，请检查配置!")
        print("📝 建议检查以下内容:")
        print("   - 数据库端点是否正确")
        print("   - 用户名和密码是否正确")
        print("   - 安全组是否允许访问")
        print("   - RDS实例是否正在运行")
    print("=== 测试完成 ===")