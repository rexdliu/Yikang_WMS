# Phase 1 测试指南 - Avatar功能

## ✅ 已完成的功能

### 1. 静态文件服务配置
- [x] FastAPI已挂载 `/static` 路由
- [x] 自动创建 `src/Backend/app/static/avatars/` 目录
- [x] 支持通过HTTP访问上传的图片

### 2. Avatar上传功能修复
- [x] 修复文件保存路径问题（使用绝对路径）
- [x] 支持JPG/PNG/WEBP格式
- [x] 自动调整为200x200像素
- [x] 最大文件大小2MB

### 3. Avatar删除功能
- [x] 删除自定义头像
- [x] 清理物理文件
- [x] 清空数据库记录

### 4. 默认头像生成
- [x] 基于用户名首字母生成SVG
- [x] 10种配色方案（基于用户ID一致性）
- [x] 即时生成，无需存储

---

## 🧪 测试步骤

### 前置条件
1. 确保后端服务器正在运行：
```bash
cd src/Backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. 确保你已登录并有有效的token

---

### 测试1: 上传Avatar ⭐⭐⭐

#### 方法1: 使用Postman/Insomnia/Thunder Client

**请求**:
```http
POST http://localhost:8000/api/v1/users/me/avatar
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data

Body (form-data):
- file: [选择一个图片文件]
```

**预期响应**:
```json
{
  "avatar_url": "/static/avatars/4_a1b2c3d4.jpg"
}
```

#### 方法2: 使用curl

```bash
# 替换YOUR_TOKEN和your-image.jpg
curl -X POST "http://localhost:8000/api/v1/users/me/avatar" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@your-image.jpg"
```

#### 验证
1. **检查响应**：应该返回avatar_url
2. **访问图片**：在浏览器打开 `http://localhost:8000/static/avatars/4_a1b2c3d4.jpg`
3. **检查文件系统**：
```bash
ls -la src/Backend/app/static/avatars/
# 应该看到新上传的文件
```

4. **检查数据库**：
```bash
# 如果使用MySQL
mysql -u root -p warehouse_test_data
SELECT id, username, avatar_url FROM users WHERE id=4;

# 应该看到avatar_url已更新
```

---

### 测试2: 查看个人资料（验证Avatar显示）

**请求**:
```http
GET http://localhost:8000/api/v1/users/me
Authorization: Bearer YOUR_TOKEN
```

**预期响应**:
```json
{
  "id": 4,
  "username": "rextest",
  "email": "rex@test.com",
  "full_name": "Rex 测试账号",
  "phone": "13900001111",
  "role": "admin",
  "avatar_url": "/static/avatars/4_a1b2c3d4.jpg",  // ← 应显示上传的头像
  "language": "zh-CN",
  "is_active": true,
  "is_superuser": true,
  "created_at": "2024-11-10T10:00:00Z"
}
```

#### 验证
- ✅ `avatar_url` 字段存在
- ✅ URL格式正确：`/static/avatars/{user_id}_{random}.jpg`
- ✅ 其他个人信息正确显示（非mock数据）

---

### 测试3: 获取默认头像 🎨

**请求**:
```http
GET http://localhost:8000/api/v1/users/me/avatar/default
Authorization: Bearer YOUR_TOKEN
```

**预期响应**:
- Content-Type: `image/svg+xml`
- 一个SVG图片，显示用户名首字母

#### 在浏览器中测试
直接访问（需要先登录获取token）：
```
http://localhost:8000/api/v1/users/me/avatar/default
```

#### 验证
1. **查看SVG内容**：应该看到一个彩色圆形头像
2. **首字母正确**：显示的字母是用户名首字母（如 "R" for "rextest"）
3. **颜色一致性**：同一用户每次访问颜色相同

---

### 测试4: 删除Avatar 🗑️

**请求**:
```http
DELETE http://localhost:8000/api/v1/users/me/avatar
Authorization: Bearer YOUR_TOKEN
```

**预期响应**:
```json
{
  "message": "头像已删除",
  "avatar_url": null
}
```

#### 验证
1. **检查响应**：avatar_url应为null
2. **文件已删除**：
```bash
ls -la src/Backend/app/static/avatars/
# 之前的头像文件应该被删除
```

3. **数据库已清空**：
```sql
SELECT avatar_url FROM users WHERE id=4;
# 应该返回 NULL
```

4. **再次获取个人资料**：
```http
GET http://localhost:8000/api/v1/users/me
```
应该返回 `"avatar_url": null`

---

### 测试5: 更新个人资料 📝

**请求**:
```http
PUT http://localhost:8000/api/v1/users/me
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "full_name": "Rex Liu Updated",
  "phone": "13900009999",
  "language": "en-US"
}
```

**预期响应**:
```json
{
  "id": 4,
  "username": "rextest",
  "email": "rex@test.com",
  "full_name": "Rex Liu Updated",  // ← 已更新
  "phone": "13900009999",           // ← 已更新
  "role": "admin",
  "avatar_url": null,
  "language": "en-US",              // ← 已更新
  ...
}
```

#### 验证
- ✅ 允许更新的字段被成功修改
- ✅ 敏感字段（role, is_superuser）不能通过此接口修改

---

## 🎯 前端集成测试清单

### Settings页面 - 个人资料部分

- [ ] **API调用验证**
  ```typescript
  // 检查是否调用真实API
  const response = await fetch('/api/v1/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  ```

- [ ] **数据显示验证**
  - [ ] 显示真实的username（不是hardcoded）
  - [ ] 显示真实的email
  - [ ] 显示真实的phone
  - [ ] 显示真实的full_name

- [ ] **Avatar显示逻辑**
  ```typescript
  // 伪代码
  const avatarSrc = user.avatar_url
    ? `${API_BASE}${user.avatar_url}`  // 自定义头像
    : `${API_BASE}/api/v1/users/me/avatar/default`;  // 默认头像
  ```

### Settings页面 - Avatar上传

- [ ] **上传功能**
  - [ ] 可以选择文件
  - [ ] 上传后立即显示新头像
  - [ ] 显示上传进度/loading状态
  - [ ] 错误处理（文件太大、格式不对）

- [ ] **删除功能**
  - [ ] 有"删除头像"按钮
  - [ ] 删除后显示默认头像
  - [ ] 确认对话框

### Settings页面 - 仓库配置

- [ ] **API调用验证**
  ```typescript
  const config = await fetch('/api/v1/warehouse/config', {
    headers: { Authorization: `Bearer ${token}` }
  });
  ```

- [ ] **数据显示**
  - [ ] warehouse_name显示真实值（不是mock）
  - [ ] location显示真实值
  - [ ] 其他配置项正确显示

- [ ] **更新功能**
  - [ ] 可以修改配置
  - [ ] 调用PUT /api/v1/warehouse/config
  - [ ] 保存后立即生效

---

## ❌ 常见问题排查

### 问题1: 上传成功但前端显示不了图片

**可能原因**:
1. 前端没有正确拼接URL
2. CORS问题
3. 代理配置问题

**解决方案**:
```typescript
// 正确的URL拼接
const avatarUrl = user.avatar_url; // "/static/avatars/4_abc.jpg"
const fullUrl = `http://localhost:8000${avatarUrl}`;

// 或者如果使用代理
const fullUrl = avatarUrl; // 直接使用，代理会处理
```

### 问题2: 404 Not Found

**检查**:
```bash
# 1. 检查文件是否存在
ls -la src/Backend/app/static/avatars/

# 2. 检查服务器日志
# 应该看到类似：
# INFO: "GET /static/avatars/4_abc.jpg HTTP/1.1" 200 OK

# 3. 直接在浏览器访问
http://localhost:8000/static/avatars/4_abc.jpg
```

### 问题3: CORS错误

**检查main.py的CORS配置**:
```python
allow_origins=settings.BACKEND_CORS_ORIGINS,
# 确保包含前端URL，如 "http://localhost:3000"
```

### 问题4: 默认头像显示不出来

**检查**:
1. 是否包含Authorization header
2. SVG是否被正确解析
3. 浏览器控制台是否有错误

---

## 📊 测试结果记录

请在测试后填写：

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 上传Avatar | ⬜ 通过 / ⬜ 失败 |  |
| 查看个人资料 | ⬜ 通过 / ⬜ 失败 |  |
| 获取默认头像 | ⬜ 通过 / ⬜ 失败 |  |
| 删除Avatar | ⬜ 通过 / ⬜ 失败 |  |
| 更新个人资料 | ⬜ 通过 / ⬜ 失败 |  |
| 静态文件访问 | ⬜ 通过 / ⬜ 失败 |  |

---

## 🚀 下一步

Phase 1 测试通过后，我们将进入：
- **Phase 2**: 验证现有功能（个人资料、仓库配置）
- **Phase 3**: 实现通知系统（WebSocket + 7天保留）

有任何问题请及时反馈！
