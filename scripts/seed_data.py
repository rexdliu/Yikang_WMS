#!/usr/bin/env python3
"""
种子数据脚本 - 清除并重新填充测试数据

使用高德地图地理编码 API 获取精确坐标
清除所有数据（保留 users 表）
插入康明斯中国真实工厂数据

使用方法:
    cd src/Backend
    python -m scripts.seed_data
"""

import os
import sys
import requests
from datetime import datetime, timedelta
from decimal import Decimal
import random

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
AMAP_KEY = os.getenv("AMAP_KEY", "bb3e8a4683c802988d09dfa93cfaf787")

if not DATABASE_URL:
    print("错误: 未找到 DATABASE_URL 环境变量")
    sys.exit(1)


def geocode_address(address: str) -> tuple:
    """
    使用高德地图地理编码 API 获取地址坐标
    
    Args:
        address: 地址字符串
        
    Returns:
        (lat, lng) 坐标元组，失败返回 (None, None)
    """
    try:
        url = "https://restapi.amap.com/v3/geocode/geo"
        params = {
            "key": AMAP_KEY,
            "address": address,
            "output": "JSON"
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get("status") == "1" and data.get("geocodes"):
            location = data["geocodes"][0].get("location", "")
            if location:
                lng, lat = location.split(",")
                print(f"  ✓ {address[:30]}... -> ({lat}, {lng})")
                return (Decimal(lat), Decimal(lng))
        
        print(f"  ✗ 无法获取坐标: {address[:30]}...")
        return (None, None)
    except Exception as e:
        print(f"  ✗ 地理编码错误: {e}")
        return (None, None)


# 康明斯中国工厂数据
CUMMINS_WAREHOUSES = [
    {
        "name": "东风康明斯（襄阳）",
        "code": "WH-DFCM-XY",
        "location": "湖北省襄阳市高新技术产业开发区",
        "manager_name": "张经理",
        "phone": "86-710-3399100",
        "capacity": 50000.0,
    },
    {
        "name": "重庆康明斯",
        "code": "WH-CQC",
        "location": "重庆市两江新区礼环南路100号",
        "manager_name": "李经理",
        "phone": "86-23-65335888",
        "capacity": 45000.0,
    },
    {
        "name": "西安康明斯",
        "code": "WH-XAC",
        "location": "陕西西安市经济技术开发区泾渭工业园西金路18号",
        "manager_name": "王经理",
        "phone": "86-29-68932222",
        "capacity": 40000.0,
    },
    {
        "name": "北京福田康明斯",
        "code": "WH-BFCM",
        "location": "北京昌平区沙河镇沙阳路",
        "manager_name": "赵经理",
        "phone": "86-10-80736888",
        "capacity": 55000.0,
    },
    {
        "name": "广西康明斯（柳州）",
        "code": "WH-GXCM-LZ",
        "location": "广西柳州市柳江县新兴工业园恒业路8号",
        "manager_name": "刘经理",
        "phone": "86-772-7503333",
        "capacity": 35000.0,
    },
    {
        "name": "安徽康明斯（合肥）",
        "code": "WH-AHCM-HF",
        "location": "安徽省合肥市经济技术开发区云谷路1218号",
        "manager_name": "陈经理",
        "phone": "86-551-62318888",
        "capacity": 30000.0,
    },
    {
        "name": "无锡发电机技术",
        "code": "WH-WXGT-XR",
        "location": "江苏省无锡市新区新荣路2号",
        "manager_name": "周经理",
        "phone": "86-510-81108088",
        "capacity": 25000.0,
    },
    {
        "name": "武汉发电机组工厂",
        "code": "WH-WHCPG",
        "location": "武汉经济技术开发区全力南路118号",
        "manager_name": "吴经理",
        "phone": "86-27-84214800",
        "capacity": 35000.0,
    },
    {
        "name": "无锡涡轮增压",
        "code": "WH-WXTB",
        "location": "江苏省无锡市新区新锡路28号",
        "manager_name": "郑经理",
        "phone": "86-510-85200800",
        "capacity": 20000.0,
    },
    {
        "name": "武汉燃油系统",
        "code": "WH-WHFS",
        "location": "湖北省武汉经济技术开发区科技园东路1号",
        "manager_name": "孙经理",
        "phone": "86-27-68847188",
        "capacity": 28000.0,
    },
]

# 产品分类
CATEGORIES = [
    {"name": "发动机", "code": "ENGINE", "description": "柴油发动机、天然气发动机"},
    {"name": "零配件", "code": "PARTS", "description": "发动机零配件"},
    {"name": "机油", "code": "OIL", "description": "润滑油、机油"},
    {"name": "滤芯", "code": "FILTER", "description": "空气滤芯、机油滤芯、燃油滤芯"},
    {"name": "传感器", "code": "SENSOR", "description": "温度传感器、压力传感器"},
    {"name": "涡轮增压器", "code": "TURBO", "description": "涡轮增压器及配件"},
]

# 产品
PRODUCTS = [
    {"name": "6BT5.9 发动机总成", "sku": "ENG-6BT59-001", "part_number": "3903797", "engine_model": "6BT5.9", "category_code": "ENGINE", "price": 85000.0, "cost": 65000.0},
    {"name": "ISF2.8 发动机总成", "sku": "ENG-ISF28-001", "part_number": "5258744", "engine_model": "ISF2.8", "category_code": "ENGINE", "price": 45000.0, "cost": 35000.0},
    {"name": "ISL9.5 发动机总成", "sku": "ENG-ISL95-001", "part_number": "4324632", "engine_model": "ISL9.5", "category_code": "ENGINE", "price": 120000.0, "cost": 95000.0},
    {"name": "燃油滤清器", "sku": "FIL-FUEL-001", "part_number": "3931063", "engine_model": "6BT/ISB", "category_code": "FILTER", "price": 120.0, "cost": 80.0},
    {"name": "机油滤清器", "sku": "FIL-OIL-001", "part_number": "3937743", "engine_model": "6BT/ISB", "category_code": "FILTER", "price": 85.0, "cost": 55.0},
    {"name": "空气滤芯", "sku": "FIL-AIR-001", "part_number": "3918986", "engine_model": "6BT", "category_code": "FILTER", "price": 180.0, "cost": 120.0},
    {"name": "康明斯专用机油 15W-40", "sku": "OIL-15W40-001", "part_number": "4318997", "engine_model": "ALL", "category_code": "OIL", "price": 320.0, "cost": 220.0},
    {"name": "水温传感器", "sku": "SEN-TEMP-001", "part_number": "3979176", "engine_model": "ISB/ISC", "category_code": "SENSOR", "price": 280.0, "cost": 180.0},
    {"name": "机油压力传感器", "sku": "SEN-PRES-001", "part_number": "4921493", "engine_model": "ISB/ISC", "category_code": "SENSOR", "price": 350.0, "cost": 220.0},
    {"name": "HE200WG 涡轮增压器", "sku": "TRB-HE200-001", "part_number": "5328159", "engine_model": "ISF2.8", "category_code": "TURBO", "price": 3500.0, "cost": 2500.0},
    {"name": "HX35W 涡轮增压器", "sku": "TRB-HX35-001", "part_number": "4038597", "engine_model": "6BT5.9", "category_code": "TURBO", "price": 4200.0, "cost": 3000.0},
    {"name": "喷油器总成", "sku": "INJ-001", "part_number": "4026222", "engine_model": "ISC/ISL", "category_code": "PARTS", "price": 1800.0, "cost": 1200.0},
]

# 经销商
DISTRIBUTORS = [
    {"name": "成都康明斯服务中心", "code": "DIST-CD", "contact_person": "张三", "phone": "028-85551234", "region": "四川", "address": "成都市武侯区科华北路99号"},
    {"name": "重庆发动机经销商", "code": "DIST-CQ", "contact_person": "李四", "phone": "023-63335678", "region": "重庆", "address": "重庆市渝北区金开大道88号"},
    {"name": "昆明康明斯代理", "code": "DIST-KM", "contact_person": "王五", "phone": "0871-65889988", "region": "云南", "address": "昆明市官渡区关兴路168号"},
    {"name": "贵阳机械设备公司", "code": "DIST-GY", "contact_person": "赵六", "phone": "0851-85886688", "region": "贵州", "address": "贵阳市南明区花果园大街128号"},
    {"name": "西安陕汽配件商", "code": "DIST-XA", "contact_person": "钱七", "phone": "029-88776655", "region": "陕西", "address": "西安市未央区经济技术开发区"},
]

# 司机/交付人
DELIVERY_PERSONS = [
    {"name": "李四", "phone": "13800138001", "vehicle_number": "沪A-88888", "destination": "苏州、无锡"},
    {"name": "张三", "phone": "13800138002", "vehicle_number": "川A-66666", "destination": "成都、重庆"},
    {"name": "王五", "phone": "13800138003", "vehicle_number": "鄂A-55555", "destination": "武汉、襄阳"},
    {"name": "赵六", "phone": "13800138004", "vehicle_number": "陕A-77777", "destination": "西安、咸阳"},
    {"name": "孙七", "phone": "13800138005", "vehicle_number": "京A-99999", "destination": "北京"},
]


def clear_data(session):
    """清除所有数据（保留 users 表）"""
    print("\n🗑️  清除现有数据...")
    
    # 按外键依赖顺序删除
    tables = [
        "notifications",
        "activity_logs",
        "inventory_transactions",
        "inventories",
        "sales_orders",
        "shipments",
        "waves",
        "products",
        "product_categories",
        "warehouses",
        "distributors",
        "delivery_persons",
    ]
    
    for table in tables:
        try:
            session.execute(text(f"DELETE FROM {table}"))
            print(f"  ✓ 清除 {table}")
        except Exception as e:
            print(f"  ✗ 清除 {table} 失败: {e}")
    
    session.commit()


def seed_warehouses(session):
    """插入仓库数据（使用高德地理编码）"""
    print("\n🏭 插入仓库数据（获取坐标中...）")
    
    for wh in CUMMINS_WAREHOUSES:
        lat, lng = geocode_address(wh["location"])
        
        session.execute(text("""
            INSERT INTO warehouses (name, code, location, manager_name, phone, capacity, current_usage, lat, lng, is_active)
            VALUES (:name, :code, :location, :manager_name, :phone, :capacity, :current_usage, :lat, :lng, 1)
        """), {
            **wh,
            "current_usage": random.uniform(5000, wh["capacity"] * 0.6),
            "lat": lat,
            "lng": lng,
        })
    
    session.commit()
    print(f"  ✓ 插入 {len(CUMMINS_WAREHOUSES)} 个仓库")


def seed_categories(session):
    """插入产品分类"""
    print("\n📦 插入产品分类...")
    
    for cat in CATEGORIES:
        session.execute(text("""
            INSERT INTO product_categories (name, code, description, is_active)
            VALUES (:name, :code, :description, 1)
        """), cat)
    
    session.commit()
    print(f"  ✓ 插入 {len(CATEGORIES)} 个分类")


def seed_products(session):
    """插入产品"""
    print("\n🔧 插入产品...")
    
    # 获取分类 ID 映射
    result = session.execute(text("SELECT id, code FROM product_categories"))
    cat_map = {row[1]: row[0] for row in result.fetchall()}
    
    for prod in PRODUCTS:
        cat_id = cat_map.get(prod["category_code"], 1)
        session.execute(text("""
            INSERT INTO products (name, sku, part_number, engine_model, category_id, price, cost, manufacturer, unit, min_stock_level, is_active)
            VALUES (:name, :sku, :part_number, :engine_model, :category_id, :price, :cost, 'Cummins', 'pcs', 10, 1)
        """), {**prod, "category_id": cat_id})
    
    session.commit()
    print(f"  ✓ 插入 {len(PRODUCTS)} 个产品")


def seed_distributors(session):
    """插入经销商"""
    print("\n🏪 插入经销商...")
    
    for dist in DISTRIBUTORS:
        session.execute(text("""
            INSERT INTO distributors (name, code, contact_person, phone, region, address, credit_limit, is_active)
            VALUES (:name, :code, :contact_person, :phone, :region, :address, 500000, 1)
        """), dist)
    
    session.commit()
    print(f"  ✓ 插入 {len(DISTRIBUTORS)} 个经销商")


def seed_delivery_persons(session):
    """插入司机/交付人"""
    print("\n🚚 插入司机...")
    
    for dp in DELIVERY_PERSONS:
        session.execute(text("""
            INSERT INTO delivery_persons (name, phone, vehicle_number, destination, is_active)
            VALUES (:name, :phone, :vehicle_number, :destination, 1)
        """), dp)
    
    session.commit()
    print(f"  ✓ 插入 {len(DELIVERY_PERSONS)} 个司机")


def seed_inventory(session):
    """插入库存数据"""
    print("\n📊 插入库存数据...")
    
    # 获取产品和仓库 ID
    products = session.execute(text("SELECT id FROM products")).fetchall()
    warehouses = session.execute(text("SELECT id FROM warehouses")).fetchall()
    
    count = 0
    for wh in warehouses:
        for prod in products:
            if random.random() < 0.7:  # 70% 概率有库存
                session.execute(text("""
                    INSERT INTO inventories (product_id, warehouse_id, quantity, reserved_quantity, location_code)
                    VALUES (:product_id, :warehouse_id, :quantity, :reserved, :location)
                """), {
                    "product_id": prod[0],
                    "warehouse_id": wh[0],
                    "quantity": random.randint(5, 200),
                    "reserved": random.randint(0, 10),
                    "location": f"{chr(65 + random.randint(0, 5))}-{random.randint(1, 20):02d}-{random.randint(1, 10):02d}"
                })
                count += 1
    
    session.commit()
    print(f"  ✓ 插入 {count} 条库存记录")


def seed_waves(session):
    """插入波次数据"""
    print("\n🌊 插入波次数据...")
    
    wave_codes = []
    for i in range(5):
        wave_code = f"WAVE-{datetime.now().strftime('%Y%m%d')}-{i+1:03d}"
        wave_codes.append(wave_code)
        
        session.execute(text("""
            INSERT INTO waves (wave_code, carrier, region, order_count, total_quantity, priority, status)
            VALUES (:code, :carrier, :region, 0, 0, :priority, :status)
        """), {
            "code": wave_code,
            "carrier": random.choice(["顺丰", "德邦", "中通", "自有车队"]),
            "region": random.choice(["四川", "重庆", "湖北", "陕西"]),
            "priority": random.choice(["normal", "urgent"]),
            "status": random.choice(["pending", "processing", "completed"]),
        })
    
    session.commit()
    print(f"  ✓ 插入 {len(wave_codes)} 个波次")


def seed_orders(session):
    """插入销售订单"""
    print("\n📝 插入销售订单...")
    
    # 获取相关 ID
    distributors = session.execute(text("SELECT id FROM distributors")).fetchall()
    products = session.execute(text("SELECT id, name, price FROM products")).fetchall()
    warehouses = session.execute(text("SELECT id FROM warehouses")).fetchall()
    waves = session.execute(text("SELECT id FROM waves")).fetchall()
    
    count = 0
    for i in range(20):
        prod = random.choice(products)
        qty = random.randint(1, 10)
        unit_price = float(prod[2])
        
        order_code = f"SO-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}"
        wave_id = random.choice(waves)[0] if waves and random.random() < 0.8 else None
        
        session.execute(text("""
            INSERT INTO sales_orders 
            (order_code, distributor_id, product_id, product_name, quantity, unit_price, total_value, 
             status, warehouse_id, wave_id, order_date)
            VALUES (:order_code, :dist_id, :prod_id, :prod_name, :qty, :unit_price, :total, 
                    :status, :wh_id, :wave_id, :order_date)
        """), {
            "order_code": order_code,
            "dist_id": random.choice(distributors)[0],
            "prod_id": prod[0],
            "prod_name": prod[1],
            "qty": qty,
            "unit_price": unit_price,
            "total": unit_price * qty,
            "status": random.choice(["pending", "processing", "shipped", "completed"]),
            "wh_id": random.choice(warehouses)[0],
            "wave_id": wave_id,
            "order_date": datetime.now() - timedelta(days=random.randint(0, 30)),
        })
        count += 1
    
    session.commit()
    print(f"  ✓ 插入 {count} 个订单")
    
    # 更新波次订单数
    session.execute(text("""
        UPDATE waves w 
        SET order_count = (SELECT COUNT(*) FROM sales_orders WHERE wave_id = w.id),
            total_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM sales_orders WHERE wave_id = w.id)
    """))
    session.commit()


def seed_shipments(session):
    """插入运输单"""
    print("\n🚛 插入运输单...")
    
    warehouses = session.execute(text("SELECT id, location FROM warehouses")).fetchall()
    delivery_persons = session.execute(text("SELECT id FROM delivery_persons")).fetchall()
    
    for i in range(5):
        wh = random.choice(warehouses)
        dp = random.choice(delivery_persons)
        
        shipment_code = f"TMS-SH-{i+1:03d}"
        
        session.execute(text("""
            INSERT INTO shipments 
            (shipment_code, delivery_person_id, origin_warehouse_id, origin_address, destination_address,
             total_distance, eta_minutes, status)
            VALUES (:code, :dp_id, :wh_id, :origin, :dest, :distance, :eta, :status)
        """), {
            "code": shipment_code,
            "dp_id": dp[0],
            "wh_id": wh[0],
            "origin": wh[1],
            "dest": random.choice(["成都市武侯区", "重庆市渝北区", "昆明市官渡区", "西安市未央区"]),
            "distance": random.uniform(100, 800),
            "eta": random.randint(120, 600),
            "status": random.choice(["planned", "loading", "in_transit", "delivered"]),
        })
    
    session.commit()
    print(f"  ✓ 插入 5 个运输单")


def main():
    """主函数"""
    print("=" * 60)
    print("🌱 WMS 种子数据脚本")
    print("=" * 60)
    
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        clear_data(session)
        seed_warehouses(session)
        seed_categories(session)
        seed_products(session)
        seed_distributors(session)
        seed_delivery_persons(session)
        seed_inventory(session)
        seed_waves(session)
        seed_orders(session)
        seed_shipments(session)
        
        print("\n" + "=" * 60)
        print("✅ 种子数据生成完成！")
        print("=" * 60)
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ 错误: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
