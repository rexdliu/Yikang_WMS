# 3PL WMS 系统分析与改进建议

## 一、现有系统功能概览

### ✅ 已实现功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 用户管理 | 多角色权限（admin/manager/staff） | ✅ |
| 产品管理 | CRUD、分类、图片上传 | ✅ |
| 库存管理 | 库存查看、入库、出库、调整 | ✅ |
| 仓库管理 | 多仓库、容量监控 | ✅ |
| 订单管理 | 创建、状态更新、查询 | ✅ |
| 经销商管理 | CRUD、区域分类 | ✅ |
| 交付人管理 | CRUD、车牌号、目的地 | ✅ 新增 |
| Dashboard | 统计、图表、警报 | ✅ |
| AI 助手 | RAG 知识问答 | ✅ |

---

## 二、3PL WMS 核心功能缺口分析

### 🔴 高优先级缺失功能

#### 1. 运输管理 (TMS Integration)
**现状**: 无运输跟踪功能
**建议**:
- [ ] **运输单管理**: 创建运输单，关联多个订单
- [ ] **GPS 实时追踪**: 集成第三方 GPS 服务
- [ ] **ETA 预测**: 基于距离、历史数据、交通状况
- [ ] **运输成本核算**: 油费、过路费、司机工资

```sql
-- 建议新增表: shipments (运输单)
CREATE TABLE shipments (
    id INT PRIMARY KEY,
    shipment_code VARCHAR(50),      -- 运输单号
    driver_id INT,                   -- 司机/交付人
    vehicle_id INT,                  -- 车辆
    origin_warehouse_id INT,         -- 起点仓库
    destination_address VARCHAR(500),-- 目的地
    departure_time DATETIME,         -- 出发时间
    estimated_arrival DATETIME,      -- 预计到达
    actual_arrival DATETIME,         -- 实际到达
    status ENUM('planned','loading','in_transit','delivered','cancelled'),
    total_distance DECIMAL(10,2),    -- 总距离(km)
    total_cost DECIMAL(12,2)         -- 运输成本
);
```

#### 2. 计费管理 (Billing)
**现状**: 无仓储费、服务费计算
**建议**:
- [ ] **仓储费**: 按面积/体积/天数计算
- [ ] **操作费**: 入库、出库、拣货、包装
- [ ] **增值服务费**: 质检、贴标、组套
- [ ] **账单生成**: 按客户生成月度账单

#### 3. 收货管理 (Receiving)
**现状**: 简单入库，无收货检验流程
**建议**:
- [ ] **预约收货**: 供应商提前预约
- [ ] **ASN 对接**: 提前收货通知
- [ ] **质检流程**: 良品/不良品分类
- [ ] **批次管理**: 生产批次、有效期

#### 4. 波次拣货 / 订单池化 (Wave Batching / Order Pooling) 🆕
**现状**: 无订单合并处理
**建议**: 实现完整的波次拣货系统

**第一步：建立"订单池" (Order Pooling)**
所有订单进入 WMS 后，先进入等待池。定时任务（如每30分钟）扫描池中积累的待处理订单。

**第二步：应用"过滤规则" (Filtering Rules)**
按规则将相似订单分组合并：
- 按承运商：同一快运公司的订单合并
- 按区域/路线：发往同一区域的订单合并
- 按货物特性：冷链、常温分开处理
- 按紧急程度：加急订单单独优先处理

**第三步：统筹与库存分配 (Allocation Algorithm)**
- 库存预占 (Hard Allocation)：锁定所需库存，防止其他波次使用
- 路径优化 (Path Optimization)：计算最优拣货路线
- 任务策略：
  - 摘果式 (Pick-to-Order)：一人负责一个订单
  - 播种式 (Batch Picking)：批量拣货后再分播到各订单

**第四步：释放波次与执行 (Wave Release)**
调度员释放波次，系统将计算结果转化为具体任务指令发送到工人终端。

```sql
-- 建议新增表: waves (波次)
CREATE TABLE waves (
    id INT PRIMARY KEY,
    wave_code VARCHAR(50),           -- 波次号 WAVE-20231027-01
    status ENUM('pending','processing','completed'),
    carrier_id INT,                  -- 承运商
    region VARCHAR(100),             -- 目标区域
    order_count INT,                 -- 包含订单数
    priority ENUM('normal','urgent'),
    created_at TIMESTAMP,
    released_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 订单与波次关联
ALTER TABLE sales_orders ADD COLUMN wave_id INT NULL;
```

---

### 🟠 中优先级缺失功能

#### 5. 库位管理 (Location Management)
**现状**: 有 location_code 但未充分使用
**建议**:
- [ ] **库位可视化**: 仓库平面图展示
- [ ] **库位分配策略**: ABC 分类、热度优化
- [ ] **上架建议**: 智能推荐最优库位

#### 6. 盘点管理 (Cycle Counting)
**现状**: 仅有库存调整功能
**建议**:
- [ ] **计划盘点**: 定期盘点计划
- [ ] **抽样盘点**: ABC 分类抽检
- [ ] **差异处理**: 自动生成调整单

#### 7. 退货管理 (Returns)
**现状**: 无退货流程
**建议**:
- [ ] **退货申请**: 客户发起退货
- [ ] **退货收货**: 验货入库
- [ ] **质量检验**: 可售/报废判定

#### 8. 多租户/多客户 (Multi-tenant)
**现状**: 单一客户视角
**建议**:
- [ ] **客户账户**: 每个货主独立账户
- [ ] **库存隔离**: 按客户隔离库存
- [ ] **权限隔离**: 客户只能看自己数据

---

### 🟢 低优先级/未来功能

#### 9. BI 报表
- [ ] 库存周转率报表
- [ ] 仓库效率报表
- [ ] 客户利润分析

#### 10. 集成能力
- [ ] EDI/API 对接电商平台
- [ ] ERP 系统对接
- [ ] 财务系统对接

---

## 三、ETA 预测实现方案

### 方案 A: 基础公式计算

```python
def calculate_eta(origin: str, destination: str, departure_time: datetime) -> datetime:
    """
    基础 ETA 计算
    
    ETA = 出发时间 + 行驶时间 + 装卸时间
    行驶时间 = 距离 / 平均速度
    """
    distance = get_distance(origin, destination)  # 调用地图 API
    avg_speed = 60  # 平均时速 km/h
    loading_time = timedelta(hours=1)  # 装卸时间
    
    travel_time = timedelta(hours=distance / avg_speed)
    eta = departure_time + travel_time + loading_time
    
    return eta
```

**优点**: 简单快速
**缺点**: 不考虑实际路况

### 方案 B: Linear Regression (推荐首选) 🆕

```python
from sklearn.linear_model import LinearRegression
import numpy as np

def train_linear_eta_model(historical_data: list[dict]):
    """
    使用线性回归预测 ETA
    
    特征: 距离、出发时间
    目标: 实际行驶时长(分钟)
    """
    X = np.array([[d['distance_km'], d['departure_hour']] for d in historical_data])
    y = np.array([d['actual_duration_minutes'] for d in historical_data])
    
    model = LinearRegression()
    model.fit(X, y)
    
    return model

def predict_eta(model, distance_km: float, departure_hour: int) -> int:
    """预测 ETA (分钟)"""
    return int(model.predict([[distance_km, departure_hour]])[0])
```

**优点**: 简单、可解释、快速启动
**缺点**: 不考虑非线性因素

### 方案 C: GradientBoosting (未来改进)

```python
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor

def train_eta_model(historical_data: pd.DataFrame):
    """
    使用历史运输数据训练 ETA 模型
    
    特征:
    - 距离
    - 出发时间（小时）
    - 星期几
    - 是否节假日
    - 天气条件
    - 车辆类型
    - 货物重量
    """
    features = ['distance', 'hour', 'weekday', 'is_holiday', 
                'weather_code', 'vehicle_type', 'cargo_weight']
    
    X = historical_data[features]
    y = historical_data['actual_duration_minutes']
    
    model = GradientBoostingRegressor()
    model.fit(X, y)
    
    return model
```

**优点**: 准确度高，持续优化
**缺点**: 需要历史数据积累

### 方案 C: 第三方 API 集成

- **高德地图**: 路线规划 + 实时路况
- **百度地图**: 货车导航 API
- **腾讯地图**: 路况预测

```python
import requests

def get_amap_eta(origin: str, destination: str) -> int:
    """调用高德地图 API 获取预计行驶时间"""
    url = "https://restapi.amap.com/v3/direction/driving"
    params = {
        "key": AMAP_KEY,
        "origin": origin,  # "116.481028,39.989643"
        "destination": destination,
        "strategy": 10,  # 考虑实时路况
    }
    resp = requests.get(url, params=params)
    data = resp.json()
    
    duration = int(data['route']['paths'][0]['duration'])  # 秒
    return duration
```

---

## 四、推荐改进路线图

### Phase 1 (1-2周) - 立即可做
1. ✅ 完成交付人管理
2. ✅ 完成订单详情弹窗
3. [ ] 添加 ETA 基础计算（公式方式）
4. [ ] 完成搜索状态持久化
5. [ ] 订单创建自动填充

### Phase 2 (2-4周) - 运输增强
1. [ ] 创建 shipments 表
2. [ ] 运输单管理 CRUD
3. [ ] 订单与运输单关联
4. [ ] 运输状态追踪页面
5. [ ] 集成地图 API 获取距离/ETA

### Phase 3 (1-2月) - 3PL 核心
1. [ ] 多客户/货主管理
2. [ ] 仓储费计算逻辑
3. [ ] 账单管理模块
4. [ ] 收货质检流程
5. [ ] 拣货任务管理

### Phase 4 (长期) - 智能化
1. [ ] AI ETA 预测模型
2. [ ] 库位智能分配
3. [ ] 需求预测
4. [ ] 异常检测告警

---

## 五、技术债务清单

| 问题 | 优先级 | 影响 |
|------|--------|------|
| 无数据库迁移工具 (Alembic) | 高 | 生产部署困难 |
| 前端搜索状态不持久 | 中 | 用户体验差 |
| min_stock_level 硬编码 | 中 | 功能不完整 |
| 无单元测试 | 高 | 代码质量风险 |
| 无 API 文档 (Swagger) | 低 | 开发效率 |
| 无日志监控系统 | 中 | 生产问题定位困难 |

---

**文档版本**: v1.0
**最后更新**: 2025-12-09
