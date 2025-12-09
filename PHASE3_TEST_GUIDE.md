# Phase 3 测试指南 - 通知系统

## ✅ 已完成的功能

### 1. 通知数据模型
- [x] Notification 数据库模型（7天自动过期）
- [x] 通知类型：order, inventory, alert, product, system
- [x] 支持关联实体（reference_id, reference_type）
- [x] 已读/未读状态跟踪

### 2. 通知 CRUD 操作
- [x] 创建通知（自动设置过期时间）
- [x] 获取用户通知列表（分页、筛选未读）
- [x] 获取未读通知数量
- [x] 标记通知为已读
- [x] 标记所有通知为已读
- [x] 删除通知
- [x] 删除过期通知（7天）

### 3. WebSocket 实时推送
- [x] WebSocket 连接管理器
- [x] 支持多设备同时连接
- [x] 实时推送通知给在线用户
- [x] JWT 认证保护
- [x] 心跳机制（ping/pong）

### 4. 后台任务调度
- [x] 每天凌晨2点清理过期通知
- [x] 每小时检查低库存并发送警报
- [x] APScheduler 调度器集成

### 5. 业务集成
- [x] 订单创建 → 通知所有管理员
- [x] 订单状态变更 → 通知订单创建者
- [x] 产品创建 → 通知所有管理员
- [x] 低库存警报 → 通知所有管理员
- [x] 缺货警报 → 通知所有管理员

---

## 🧪 测试步骤

### 前置条件

1. **安装依赖**:
```bash
cd src/Backend
pip install apscheduler
```

2. **启动后端服务器**:
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. **准备测试账号**:
   - 管理员账号（admin/manager角色）
   - 普通员工账号（staff角色）

4. **获取访问令牌**:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=rextest&password=your_password"
```

---

## 测试1: 获取通知列表 📋

### 请求
```bash
# 获取所有通知
curl -X GET "http://localhost:8000/api/v1/notifications/" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 只获取未读通知
curl -X GET "http://localhost:8000/api/v1/notifications/?unread_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 分页
curl -X GET "http://localhost:8000/api/v1/notifications/?skip=0&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 预期响应
```json
[
  {
    "id": 1,
    "user_id": 4,
    "title": "新订单创建",
    "message": "rextest 创建了新订单 SO202501121001，产品：柴油滤清器，数量：100",
    "notification_type": "order",
    "is_read": false,
    "reference_id": 5,
    "reference_type": "order",
    "created_at": "2025-11-12T10:00:00Z",
    "expires_at": "2025-11-19T10:00:00Z"
  }
]
```

### 验证点
- ✅ 返回当前用户的通知列表
- ✅ unread_only=true 只返回未读通知
- ✅ 分页功能正常
- ✅ expires_at 为创建时间+7天

---

## 测试2: 获取未读通知数量 🔔

### 请求
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 预期响应
```json
{
  "unread_count": 5
}
```

### 验证点
- ✅ 返回未读通知数量
- ✅ 数量与实际未读通知一致

---

## 测试3: 标记通知为已读 ✓

### 请求
```bash
# 标记单个通知为已读
curl -X PUT "http://localhost:8000/api/v1/notifications/1/read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 预期响应
```json
{
  "id": 1,
  "user_id": 4,
  "title": "新订单创建",
  "message": "...",
  "notification_type": "order",
  "is_read": true,  // ← 已更新为 true
  "reference_id": 5,
  "reference_type": "order",
  "created_at": "2025-11-12T10:00:00Z",
  "expires_at": "2025-11-19T10:00:00Z"
}
```

### 验证点
- ✅ is_read 字段更新为 true
- ✅ 未读数量减少
- ✅ 其他字段不变

---

## 测试4: 标记所有通知为已读 ✓✓

### 请求
```bash
curl -X PUT "http://localhost:8000/api/v1/notifications/read-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 预期响应
```json
{
  "message": "所有通知已标记为已读",
  "count": 5
}
```

### 验证点
- ✅ 所有未读通知被标记为已读
- ✅ 未读数量变为 0
- ✅ 返回更新的通知数量

---

## 测试5: 删除通知 🗑️

### 请求
```bash
curl -X DELETE "http://localhost:8000/api/v1/notifications/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 预期响应
```json
{
  "message": "通知已删除"
}
```

### 验证点
- ✅ 通知从数据库删除
- ✅ 再次获取通知列表时不包含该通知
- ✅ 只能删除自己的通知（权限检查）

---

## 测试6: WebSocket 实时推送 ⚡

### JavaScript 客户端示例

```javascript
// 1. 建立 WebSocket 连接
const token = "YOUR_JWT_TOKEN";
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/notifications?token=${token}`);

// 2. 连接成功
ws.onopen = () => {
  console.log('WebSocket 连接已建立');
};

// 3. 接收消息
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);

  if (data.type === 'connection') {
    console.log('连接确认:', data.data.message);
  } else if (data.type === 'notification') {
    console.log('新通知:', data.data);
    // 显示通知弹窗
    showNotification(data.data.title, data.data.message);
  } else if (data.type === 'pong') {
    console.log('心跳响应');
  }
};

// 4. 发送心跳
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send('ping');
  }
}, 30000);  // 每30秒发送一次

// 5. 连接关闭
ws.onclose = () => {
  console.log('WebSocket 连接已关闭');
};

// 6. 错误处理
ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};
```

### 测试步骤

1. **打开浏览器控制台**，粘贴上述代码并执行

2. **创建订单触发通知**:
```bash
curl -X POST "http://localhost:8000/api/v1/sales/orders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "distributor_id": 1,
    "product_id": 1,
    "product_name": "测试产品",
    "quantity": 10,
    "unit_price": 100,
    "total_value": 1000
  }'
```

3. **观察浏览器控制台**，应该实时收到通知消息

### 预期行为
- ✅ WebSocket 连接成功
- ✅ 收到连接确认消息
- ✅ 创建订单后，所有管理员实时收到通知
- ✅ 心跳机制正常（ping → pong）
- ✅ 支持多设备同时连接

---

## 测试7: 订单创建通知 📦

### 测试步骤

1. **以管理员身份登录**，建立 WebSocket 连接

2. **创建新订单**:
```bash
curl -X POST "http://localhost:8000/api/v1/sales/orders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "distributor_id": 1,
    "product_id": 1,
    "product_name": "柴油滤清器",
    "quantity": 100,
    "unit_price": 50,
    "total_value": 5000
  }'
```

3. **检查通知**:
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 预期结果
- ✅ 所有管理员收到"新订单创建"通知
- ✅ 通知包含订单号、产品名称、数量
- ✅ notification_type 为 "order"
- ✅ reference_id 为订单ID
- ✅ 如果管理员在线，实时收到 WebSocket 推送

---

## 测试8: 订单状态变更通知 🔄

### 测试步骤

1. **以普通用户身份创建订单**

2. **以管理员身份更新订单状态**:
```bash
curl -X PUT "http://localhost:8000/api/v1/sales/orders/1" \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped"
  }'
```

3. **以创建订单的用户身份检查通知**:
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/" \
  -H "Authorization: Bearer USER_TOKEN"
```

### 预期结果
- ✅ 订单创建者收到"订单状态更新"通知
- ✅ 通知包含新的状态（已发货）
- ✅ 如果创建者在线，实时收到 WebSocket 推送
- ✅ 管理员不会收到自己操作的通知

---

## 测试9: 产品创建通知 📦

### 测试步骤

1. **创建新产品**:
```bash
curl -X POST "http://localhost:8000/api/v1/products/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新产品测试",
    "sku": "TEST-001",
    "part_number": "PN-TEST-001",
    "category_id": 1,
    "warehouse_id": 1,
    "initial_quantity": 50,
    "price": 100,
    "cost": 80,
    "unit": "件",
    "min_stock_level": 10
  }'
```

2. **检查管理员通知**:
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 预期结果
- ✅ 所有管理员收到"新产品创建"通知
- ✅ 通知包含产品名称、SKU、初始库存
- ✅ notification_type 为 "product"
- ✅ reference_id 为产品ID

---

## 测试10: 低库存警报通知 ⚠️

### 测试步骤

1. **手动触发低库存检查**:
```bash
curl -X POST "http://localhost:8000/api/v1/alerts/check-low-stock" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **检查管理员通知**:
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/?unread_only=true" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 预期结果
- ✅ 每个低库存产品生成一条通知
- ✅ 所有管理员收到通知
- ✅ 通知标题为"低库存警报"或"缺货警报"
- ✅ 通知包含产品名称、仓库、当前数量、缺货数量
- ✅ notification_type 为 "alert"

---

## 测试11: 7天自动清理 🗑️

### 测试步骤

1. **创建测试通知**（手动修改数据库）:
```sql
-- 创建一个8天前的过期通知
INSERT INTO notifications (
  user_id, title, message, notification_type,
  is_read, created_at, expires_at
) VALUES (
  4, '过期通知', '这是一个用于测试的过期通知', 'system',
  false, DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)
);
```

2. **手动触发清理任务**（在Python环境中）:
```python
from app.core.scheduler import cleanup_expired_notifications
cleanup_expired_notifications()
```

3. **检查通知列表**:
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 预期结果
- ✅ 过期通知被删除
- ✅ 未过期通知保留
- ✅ 后台任务每天凌晨2点自动执行

---

## 测试12: 后台任务调度 ⏰

### 验证调度器启动

1. **查看服务器日志**，应该看到：
```
INFO:     后台任务调度器已启动
```

2. **检查调度任务**（在Python环境中）:
```python
from app.core.scheduler import scheduler
print("运行中的任务:")
for job in scheduler.get_jobs():
    print(f"  - {job.name}: {job.next_run_time}")
```

### 预期输出
```
运行中的任务:
  - 清理过期通知: 2025-11-13 02:00:00
  - 检查低库存: 2025-11-12 11:00:00
```

---

## 🎯 前端集成测试清单

### 通知中心组件

- [ ] **通知列表显示**
  - [ ] 显示通知标题、消息、时间
  - [ ] 区分已读/未读状态（样式不同）
  - [ ] 显示通知类型图标（订单、库存、警报、产品）
  - [ ] 支持分页或无限滚动

- [ ] **未读通知数量显示**
  - [ ] 在顶部导航栏显示红点或数字
  - [ ] 实时更新（WebSocket）
  - [ ] 点击后打开通知中心

- [ ] **通知操作**
  - [ ] 点击通知标记为已读
  - [ ] "全部标记为已读"按钮
  - [ ] 删除单个通知
  - [ ] 点击通知跳转到相关页面（订单详情、产品详情等）

### WebSocket 集成

- [ ] **连接管理**
  - [ ] 用户登录后自动建立 WebSocket 连接
  - [ ] 连接断开后自动重连（指数退避）
  - [ ] 页面切换时保持连接
  - [ ] 用户登出时关闭连接

- [ ] **实时推送**
  - [ ] 收到新通知时显示弹窗/Toast
  - [ ] 自动更新未读数量
  - [ ] 自动更新通知列表
  - [ ] 支持浏览器原生通知（需要用户授权）

### 代码示例

```typescript
// NotificationService.ts
import { useEffect, useState } from 'react';

export const useNotifications = (token: string) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // 获取通知列表
  const fetchNotifications = async () => {
    const response = await fetch('/api/v1/notifications/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setNotifications(data);
    setUnreadCount(data.filter(n => !n.is_read).length);
  };

  // 建立 WebSocket 连接
  useEffect(() => {
    const websocket = new WebSocket(
      `ws://localhost:8000/api/v1/ws/notifications?token=${token}`
    );

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        // 显示通知
        showToast(data.data.title, data.data.message);
        // 刷新通知列表
        fetchNotifications();
      }
    };

    setWs(websocket);

    return () => websocket.close();
  }, [token]);

  // 标记为已读
  const markAsRead = async (id: number) => {
    await fetch(`/api/v1/notifications/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchNotifications();
  };

  // 全部标记为已读
  const markAllAsRead = async () => {
    await fetch('/api/v1/notifications/read-all', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchNotifications();
  };

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  };
};
```

---

## ❌ 常见问题排查

### 问题1: WebSocket 连接失败（401 Unauthorized）

**可能原因**:
- JWT token 无效或过期
- token 未包含在查询参数中

**解决方案**:
```javascript
// 确保 token 正确传递
const token = localStorage.getItem('access_token');
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/notifications?token=${token}`);
```

### 问题2: 通知未实时推送

**检查**:
1. WebSocket 连接是否成功
2. 用户角色是否正确（管理员接收所有通知）
3. 查看服务器日志是否有错误

**调试**:
```python
# 在 send_notification 函数中添加日志
import logging
logger = logging.getLogger(__name__)
logger.info(f"发送通知给用户 {user_id}: {title}")
```

### 问题3: APScheduler 未启动

**检查服务器日志**，应该看到：
```
INFO:     后台任务调度器已启动
```

**如果没有启动**:
```bash
# 检查是否安装 apscheduler
pip install apscheduler

# 检查 main.py 中的 startup 事件
# 确保调用了 start_scheduler()
```

### 问题4: 通知未保存到数据库

**检查**:
1. 数据库表是否创建（notifications）
2. 用户ID是否有效
3. expires_at 是否正确设置

**验证数据库**:
```sql
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 性能测试

### WebSocket 并发连接测试

使用工具如 `wscat` 或自定义脚本测试多个并发连接：

```bash
# 安装 wscat
npm install -g wscat

# 测试连接
wscat -c "ws://localhost:8000/api/v1/ws/notifications?token=YOUR_TOKEN"
```

### 预期性能指标
- ✅ 支持 1000+ 并发 WebSocket 连接
- ✅ 消息推送延迟 < 100ms
- ✅ 数据库查询响应时间 < 50ms

---

## 📝 测试结果记录

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 获取通知列表 | ⬜ 通过 / ⬜ 失败 |  |
| 获取未读数量 | ⬜ 通过 / ⬜ 失败 |  |
| 标记为已读 | ⬜ 通过 / ⬜ 失败 |  |
| 标记全部已读 | ⬜ 通过 / ⬜ 失败 |  |
| 删除通知 | ⬜ 通过 / ⬜ 失败 |  |
| WebSocket 推送 | ⬜ 通过 / ⬜ 失败 |  |
| 订单创建通知 | ⬜ 通过 / ⬜ 失败 |  |
| 订单状态变更通知 | ⬜ 通过 / ⬜ 失败 |  |
| 产品创建通知 | ⬜ 通过 / ⬜ 失败 |  |
| 低库存警报通知 | ⬜ 通过 / ⬜ 失败 |  |
| 7天自动清理 | ⬜ 通过 / ⬜ 失败 |  |
| 后台任务调度 | ⬜ 通过 / ⬜ 失败 |  |

---

## 🚀 下一步

Phase 3 测试通过后，系统所有核心功能已完成：
- ✅ Phase 1: Avatar功能
- ✅ Phase 2: API验证
- ✅ Phase 3: 通知系统

可以开始进行：
- 前端完整集成
- 生产环境部署准备
- 性能优化和压力测试

有任何问题请及时反馈！
