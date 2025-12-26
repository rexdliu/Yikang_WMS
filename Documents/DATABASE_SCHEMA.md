# Product Warehouse - 数据库 Schema 设计

## 业务场景
物流公司仓库管理系统 - 专门处理 Cummins（康明斯）零件、发动机、机油等产品

---

## 📋 数据表设计

### 1. users (用户表)
存储系统用户信息

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| username | String(50) | 用户名 | Unique, Not Null |
| email | String(100) | 邮箱 | Unique, Not Null |
| phone | String(20) | 手机号 | - |
| full_name | String(100) | 全名 | - |
| hashed_password | String(255) | 密码哈希 | Not Null |
| role | String(20) | 角色 | Default: 'staff' |
| avatar_url | String(255) | 用户头像URL | - |
| language | String(10) | 界面语言 | Default: 'zh-CN' |
| is_active | Boolean | 是否激活 | Default: True |
| is_superuser | Boolean | 是否超级管理员 | Default: False |
| created_at | DateTime | 创建时间 | Auto |
| updated_at | DateTime | 更新时间 | Auto |

**角色 (role)**:
- `staff`: 员工（只读权限）
- `manager`: 仓库管理员（管理订单和库存）
- `admin`: 系统管理员（完全访问）
- `tester`: 测试账号

**新增字段说明**:
- `avatar_url`: 用户头像图片URL
- `language`: 用户界面语言设置（zh-CN/en-US）

**索引**: username, email

---

### 2. product_categories (产品分类表)
产品分类（如：零件、发动机、机油、滤芯等）

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| name | String(100) | 分类名称 | Unique, Not Null |
| code | String(50) | 分类代码 | Unique |
| description | Text | 描述 | - |
| parent_id | Integer | 父分类ID | FK (self) |
| is_active | Boolean | 是否启用 | Default: True |
| created_at | DateTime | 创建时间 | Auto |
| updated_at | DateTime | 更新时间 | Auto |

**新增字段说明**:
- `parent_id`: 支持分类层级结构，可设置父分类
- `is_active`: 是否启用该分类
- `updated_at`: 记录分类信息最后更新时间

**示例数据**:
- 发动机 (ENGINE)
- 零配件 (PARTS)
- 机油 (OIL)
- 滤芯 (FILTER)
- 传感器 (SENSOR)

---

### 3. products (产品表)
Cummins 产品信息

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| name | String(200) | 产品名称 | Not Null |
| sku | String(100) | SKU编码 | Unique, Not Null |
| part_number | String(100) | Cummins零件号 | Unique, Index |
| engine_model | String(50) | 适用发动机型号 | Index |
| manufacturer | String(100) | 制造商 | Default: 'Cummins' |
| description | Text | 产品描述 | - |
| category_id | Integer | 分类ID | FK |
| price | Decimal(12,2) | 售价 | Not Null |
| cost | Decimal(12,2) | 成本价 | - |
| unit | String(20) | 单位 | Default: 'pcs' |
| image_url | String(255) | 产品图片URL | - |
| min_stock_level | Integer | 最低库存预警 | Default: 10 |
| is_active | Boolean | 是否启用 | Default: True |
| created_at | DateTime | 创建时间 | Auto |
| updated_at | DateTime | 更新时间 | Auto |

**字段说明**:
- `part_number`: Cummins官方零件号，如 "3803682", "4937065"
- `engine_model`: 适用的发动机型号，如 "6BT5.9", "ISF2.8"
- `manufacturer`: 制造商，默认 Cummins
- `unit`: 单位（pcs=件, box=箱, liter=升, 台=台, 桶=桶）
- `image_url`: 产品图片URL路径
- `min_stock_level`: 最低库存预警线，低于此值会触发警报

**索引**: name, sku, part_number, engine_model, category_id

---

### 4. warehouses (仓库表)
仓库信息

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| name | String(100) | 仓库名称 | Not Null |
| code | String(50) | 仓库代码 | Unique |
| location | String(255) | 位置/地址 | - |
| capacity | Decimal(12,2) | 总容量（立方米） | - |
| current_usage | Decimal(12,2) | 当前使用量 | Default: 0 |
| manager_name | String(100) | 仓库管理员 | - |
| phone | String(20) | 联系电话 | - |
| is_active | Boolean | 是否启用 | Default: True |
| created_at | DateTime | 创建时间 | Auto |
| updated_at | DateTime | 更新时间 | Auto |

**字段说明**:
- `code`: 仓库代码，如 "WH001", "WH002"
- `capacity`: 仓库总容量（立方米）
- `current_usage`: 当前使用的容量，用于计算使用率
- `manager_name`: 仓库管理员姓名
- `phone`: 联系电话

**索引**: name, code

---

### 5. inventories (库存表)
产品在各仓库的库存数量

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| product_id | Integer | 产品ID | FK, Not Null |
| warehouse_id | Integer | 仓库ID | FK, Not Null |
| quantity | Integer | 可用数量 | Default: 0 |
| reserved_quantity | Integer | 预留数量 | Default: 0 |
| location_code | String(50) | 货位编号 | - |
| created_at | DateTime | 创建时间 | Auto |
| updated_at | DateTime | 更新时间 | Auto |

**字段说明**:
- `quantity`: 当前可用库存数量
- `reserved_quantity`: 已预留数量（如待发货订单）
- `location_code`: 仓库内具体货位，如 "A-01-03", "B-10-15"

**索引**: (product_id, warehouse_id) 联合唯一索引, quantity, location_code

---

### 6. inventory_transactions (库存交易表)
库存变动记录

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| product_id | Integer | 产品ID | FK, Not Null |
| warehouse_id | Integer | 仓库ID | FK, Not Null |
| transaction_type | String(20) | 交易类型 | Not Null |
| quantity | Integer | 数量 | Not Null |
| user_id | Integer | 操作用户 | FK |
| reference | String(100) | 参考单号 | - |
| notes | Text | 备注 | - |
| created_at | DateTime | 创建时间 | Auto |

**交易类型 (transaction_type)**:
- `IN`: 入库
- `OUT`: 出库
- `ADJUST`: 调整（盘点、损坏等）
- `TRANSFER`: 调拨（仓库间转移）

**字段说明**:
- `quantity`: 数量（正数为入库，负数为出库）
- `user_id`: 记录操作人员
- `reference`: 关联单据号，如订单号、采购单号等
- `notes`: 详细备注说明

**索引**: product_id, warehouse_id, transaction_type, created_at

---

### 7. distributors (经销商表)
经销商信息

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| name | String(200) | 经销商名称 | Unique, Not Null |
| code | String(50) | 经销商代码 | Unique |
| contact_person | String(100) | 联系人 | Not Null |
| phone | String(20) | 电话 | Not Null |
| email | String(100) | 邮箱 | - |
| address | String(255) | 地址 | - |
| region | String(100) | 区域 | Not Null |
| credit_limit | Decimal(12,2) | 信用额度 | Default: 0 |
| is_active | Boolean | 是否启用 | Default: True |
| created_at | DateTime | 创建时间 | Auto |
| updated_at | DateTime | 更新时间 | Auto |

**字段说明**:
- `code`: 经销商代码，如 "DIST001", "DIST002"
- `email`: 电子邮箱
- `address`: 详细地址
- `region`: 所属区域（如四川、重庆、云南等）
- `credit_limit`: 信用额度限制
- `is_active`: 是否启用该经销商

**索引**: name, code, region

---

### 8. delivery_persons (交付人表) 🆕
交付人/司机信息

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| name | String(100) | 交付人姓名 | Not Null |
| phone | String(20) | 电话号码 | Not Null |
| email | String(100) | 邮箱 | - |
| vehicle_number | String(20) | 车牌号 | - |
| destination | String(200) | 常用目的地 | - |
| is_active | Boolean | 是否启用 | Default: True |
| created_at | DateTime | 创建时间 | Auto |

**字段说明**:
- `vehicle_number`: 车牌号，如 "川A12345"
- `destination`: 常用配送目的地，用于计算 ETA
- `is_active`: 是否还在职

**索引**: name, phone, vehicle_number

---

### 9. sales_orders (销售订单表)
销售订单信息

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| order_code | String(50) | 订单号 | Unique, Not Null |
| distributor_id | Integer | 经销商ID | FK, Not Null |
| product_id | Integer | 产品ID | FK, Not Null |
| product_name | String(200) | 产品名称 | Not Null |
| quantity | Integer | 数量 | Not Null |
| unit_price | Decimal(12,2) | 单价 | Not Null |
| total_value | Decimal(12,2) | 总金额 | Not Null |
| status | String(20) | 订单状态 | Default: 'pending' |
| warehouse_id | Integer | 出货仓库 | FK |
| delivery_person_id | Integer | 交付人 ID 🆕 | FK |
| order_date | DateTime | 下单日期 | Default: Now |
| delivery_date | DateTime | 计划交货日期 | - |
| estimated_arrival_time | DateTime | 预计到达时间 (ETA) 🆕 | - |
| completed_at | DateTime | 完成时间 | - |
| user_id | Integer | 创建人 | FK |
| notes | Text | 备注 | - |
| created_at | DateTime | 创建时间 | Auto |
| updated_at | DateTime | 更新时间 | Auto |

**订单状态 (status)**:
- `pending`: 待处理
- `processing`: 处理中
- `shipped`: 已发货
- `in_transit`: 运输中 🆕
- `completed`: 已完成
- `cancelled`: 已取消

**字段说明**:
- `order_code`: 自动生成订单号，格式 "SO-YYYYMMDD-XXXX"
- `unit_price`: 单价
- `total_value`: 总金额 = unit_price * quantity
- `status`: 订单状态，用于 Dashboard 统计
- `warehouse_id`: 出货仓库
- `delivery_person_id`: 关联的交付人/司机
- `delivery_date`: 计划交货日期
- `estimated_arrival_time`: AI/算法计算的预计到达时间
- `completed_at`: 实际完成时间
- `user_id`: 创建订单的用户
- `notes`: 订单备注

**ETA 计算方法**:
1. **基础公式**: `ETA = 出发时间 + (距离 / 平均速度) + 装卸时间`
2. **AI 优化**: 考虑历史运输数据、交通状况、天气因素

**索引**: order_code, distributor_id, delivery_person_id, status, order_date

---

### 9. activity_logs (活动日志表)
统一的活动日志，用于 Dashboard 显示

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| activity_type | String(20) | 活动类型 | Not Null |
| action | String(100) | 操作描述 | Not Null |
| item_name | String(200) | 项目名称 | Not Null |
| user_id | Integer | 操作用户 | FK |
| reference_id | Integer | 关联ID | - |
| reference_type | String(50) | 关联类型 | - |
| created_at | DateTime | 创建时间 | Auto |

**活动类型 (activity_type)**:
- `inventory`: 库存操作（入库、出库、调整、调拨）
- `order`: 订单处理（创建、更新、完成、取消）
- `product`: 产品操作（添加、更新、停用）
- `alert`: 系统警报（低库存、缺货）

**字段说明**:
- `action`: 具体操作，如 "入库", "出库", "创建订单", "更新产品"
- `item_name`: 相关项目名称
- `reference_id`: 关联记录的ID
- `reference_type`: 关联记录的类型，如 "product", "order", "inventory"

**索引**: activity_type, created_at, user_id

**示例数据**:
```
活动类型: inventory, 操作: "入库", 项目: "Cummins 6BT5.9 发动机总成", 时间: 2分钟前
活动类型: order, 操作: "订单完成", 项目: "订单 SO202411011001", 时间: 15分钟前
活动类型: alert, 操作: "低库存警报", 项目: "燃油滤清器 - 昆明分仓库", 时间: 1小时前
```

---

### 10. warehouse_config (仓库配置表)
系统全局仓库配置

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| warehouse_name | String(100) | 仓库名称 | Default: '主仓库' |
| location | String(255) | 仓库位置 | Default: '未设置' |
| timezone | String(50) | 时区 | Default: 'Asia/Shanghai' |
| temperature_unit | String(20) | 温度单位 | Default: 'celsius' |
| low_stock_threshold | Integer | 低库存阈值 | Default: 10 |
| created_at | DateTime | 创建时间 | Auto |
| updated_at | DateTime | 更新时间 | Auto |

**字段说明**:
- `warehouse_name`: 主仓库名称
- `location`: 仓库所在位置
- `timezone`: 系统使用的时区设置
- `temperature_unit`: 温度单位（celsius=摄氏度, fahrenheit=华氏度）
- `low_stock_threshold`: 全局低库存警报阈值

---

### 11. waves (波次表) 🆕
波次管理，用于订单批量处理

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| wave_code | String(50) | 波次编号 | Unique, Not Null |
| carrier | String(100) | 承运商 | - |
| region | String(100) | 区域 | - |
| warehouse_id | Integer | 仓库ID | FK |
| order_count | Integer | 订单数量 | Default: 0 |
| total_quantity | Integer | 总数量 | Default: 0 |
| priority | String(20) | 优先级 | Default: 'normal' |
| status | String(20) | 状态 | Default: 'pending' |
| notes | Text | 备注 | - |
| created_at | DateTime | 创建时间 | Auto |
| released_at | DateTime | 释放时间 | - |
| completed_at | DateTime | 完成时间 | - |

**状态 (status)**:
- `pending`: 待处理
- `processing`: 处理中
- `completed`: 已完成
- `cancelled`: 已取消

**优先级 (priority)**:
- `normal`: 普通
- `urgent`: 紧急

**索引**: wave_code, status, warehouse_id

---

### 12. shipments (运输单表) 🆕
TMS 运输单管理

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | Integer | 主键 | PK, Auto |
| shipment_code | String(50) | 运输单号 | Unique, Not Null |
| delivery_person_id | Integer | 司机ID | FK |
| origin_warehouse_id | Integer | 起点仓库ID | FK, Not Null |
| origin_address | String(255) | 起点地址 | - |
| destination_address | String(255) | 目的地址 | Not Null |
| departure_time | DateTime | 出发时间 | - |
| estimated_arrival | DateTime | 预计到达 | - |
| actual_arrival | DateTime | 实际到达 | - |
| total_distance | Float | 总距离(km) | - |
| eta_minutes | Integer | 预计用时(分钟) | - |
| status | String(20) | 状态 | Default: 'planned' |
| notes | Text | 备注 | - |
| created_at | DateTime | 创建时间 | Auto |

**状态 (status)**:
- `planned`: 计划中
- `loading`: 装货中
- `in_transit`: 运输中
- `delivered`: 已送达
- `cancelled`: 已取消

**关系**:
- 与 SalesOrder 是一对多关系（一个运输单包含多个订单）
- 与 DeliveryPerson 是多对一关系

**索引**: shipment_code, status, delivery_person_id, origin_warehouse_id

---

## 📊 ER 图关系

```
User (1) ----< (M) SalesOrder
User (1) ----< (M) InventoryTransaction
User (1) ----< (M) ActivityLog

ProductCategory (1) ----< (M) Product

Product (1) ----< (M) Inventory
Product (1) ----< (M) SalesOrder
Product (1) ----< (M) InventoryTransaction

Warehouse (1) ----< (M) Inventory
Warehouse (1) ----< (M) InventoryTransaction
Warehouse (1) ----< (M) SalesOrder
Warehouse (1) ----< (M) Shipment 🆕

Distributor (1) ----< (M) SalesOrder

DeliveryPerson (1) ----< (M) SalesOrder
DeliveryPerson (1) ----< (M) Shipment 🆕

Wave (1) ----< (M) SalesOrder 🆕
Shipment (1) ----< (M) SalesOrder 🆕
```

---

## 🔄 数据迁移计划

### 第一步：添加新字段到现有表

1. **products 表**:
   - 添加: part_number, engine_model, manufacturer, unit, min_stock_level

2. **warehouses 表**:
   - 添加: code, current_usage, manager_name, phone

3. **sales_orders 表**:
   - 添加: status, unit_price, warehouse_id, delivery_date, completed_at, user_id, notes, updated_at
   - 添加: delivery_person_id, estimated_arrival_time 🆕

4. **distributors 表**:
   - 添加: code, email, address, credit_limit, is_active

5. **inventories 表**:
   - 添加: location_code

6. **inventory_transactions 表**:
   - 添加: user_id

7. **users 表**:
   - 添加: full_name, role

### 第二步：创建新表

1. **activity_logs 表**: 新建活动日志表
2. **delivery_persons 表**: 新建交付人表 🆕

---

## 📝 Dashboard API 数据来源

1. **pendingOrders** (待处理订单数):
   ```sql
   SELECT COUNT(*) FROM sales_orders 
   WHERE status IN ('pending', 'processing')
   ```

2. **warehouseCapacity** (仓库容量使用率):
   ```sql
   SELECT 
     SUM(current_usage) / SUM(capacity) * 100 
   FROM warehouses 
   WHERE is_active = true
   ```

3. **recentActivities** (最近活动):
   ```sql
   SELECT * FROM activity_logs 
   ORDER BY created_at DESC 
   LIMIT 10
   ```

4. **aiInsights** (AI洞察):
   基于规则生成：
   - 低库存预警: `quantity < min_stock_level`
   - 热销产品分析
   - 异常订单检测
   - ETA 预测与实际到达时间对比 🆕

---

## 📝 数据迁移状态

所有表结构已完成优化和实施：
- ✅ 所有VARCHAR字段已添加长度参数（MySQL兼容）
- ✅ 所有timestamp字段已配置server_default和onupdate
- ✅ users表已添加avatar_url和language字段
- ✅ products表已添加image_url字段
- ✅ product_categories表已添加parent_id、is_active和updated_at字段
- ✅ inventories表已添加created_at字段
- ✅ 所有表的updated_at字段已正确配置
- ✅ warehouse_config表已创建
- ✅ delivery_persons表已创建 🆕
- ✅ sales_orders表已添加delivery_person_id和estimated_arrival_time字段 🆕

---

**最后更新**: 2025-12-09
