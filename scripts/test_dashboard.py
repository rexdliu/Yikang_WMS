#!/usr/bin/env python3
"""
测试 dashboard stats API
"""
import sys
sys.path.insert(0, '/home/user/Product_Warehouse/src/Backend')

from app.core.database import SessionLocal
from app.services.dashboard_service import DashboardService

def test_dashboard_stats():
    """测试dashboard stats"""
    db = SessionLocal()
    try:
        print("测试 Dashboard Stats...")
        print("="*60)

        try:
            stats = DashboardService.get_dashboard_stats(db)
            print("✓ 成功获取stats")
            print(f"  产品总数: {stats.total_products}")
            print(f"  库存总量: {stats.total_inventory}")
            print(f"  低库存商品数: {stats.low_stock_items}")
            print(f"  缺货商品数: {stats.out_of_stock}")
            print(f"  仓库总数: {stats.total_warehouses}")
            print(f"  待处理订单: {stats.pending_orders}")
            print(f"  库存总价值: ¥{stats.total_inventory_value:,.2f}")
        except Exception as e:
            print(f"✗ 获取stats失败:")
            print(f"  错误类型: {type(e).__name__}")
            print(f"  错误信息: {str(e)}")
            import traceback
            print("\n完整错误堆栈:")
            traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    test_dashboard_stats()
