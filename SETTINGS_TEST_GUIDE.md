# Settings Page 测试指南

## ✅ 已完成的改进

### 1. **完全重写Settings.tsx**
- ✅ 集成所有真实的后端API
- ✅ 移除所有硬编码的假数据
- ✅ 添加完整的加载、错误、保存状态
- ✅ 添加Toast通知系统
- ✅ 添加权限控制

### 2. **个人资料 Tab**
- ✅ 从 `/api/v1/users/me` 获取真实用户数据
- ✅ 头像上传功能（调用 `POST /api/v1/users/me/avatar`）
- ✅ 头像删除功能（调用 `DELETE /api/v1/users/me/avatar`）
- ✅ 默认头像显示（`GET /api/v1/users/me/avatar/default`）
- ✅ 个人信息修改（调用 `PUT /api/v1/users/me`）
- ✅ 真实角色显示（admin/manager/staff/tester）

### 3. **仓库配置 Tab**
- ✅ 从 `/api/v1/warehouse/config` 获取配置
- ✅ 保存配置（调用 `PUT /api/v1/warehouse/config`）
- ✅ 权限控制（只有 admin/manager/tester 可以修改）
- ✅ 低库存阈值联动到真实配置

### 4. **通知设置 Tab**
- ✅ 本地存储通知偏好
- ⚠️ 标记为"后端API即将推出"

### 5. **外观设置 Tab**
- ✅ 主题切换（light/dark/system）
- ✅ 界面选项（动效、侧边栏、提示）
- ✅ 与全局zustand store同步

### 6. **安全设置 Tab**
- ✅ 密码修改功能（调用 `POST /api/v1/users/me/change-password`）
- ✅ 移除假数据（两步验证、活跃会话、API密钥）
- ⚠️ 标记为"即将推出"

### 7. **已移除的部分**
- ❌ AI助手 Tab（后端无API）
- ❌ 第三方集成 Tab（功能未实现）
- ❌ 假的会话管理
- ❌ 假的API密钥管理
- ❌ 假的AI使用统计

---

## 🔧 静态文件404问题修复

### 问题描述
上传头像后，文件保存到 `src/Backend/app/static/avatars/`，但访问 `http://localhost:8003/static/avatars/xxx.jpg` 返回404。

### 根本原因
FastAPI 的静态文件挂载路径是相对于**运行时的工作目录**，不是相对于源代码目录。

### 解决方案

#### 方法1：确保从正确的目录启动服务器
```bash
# 正确的启动方式
cd /home/user/Product_Warehouse/src/Backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

#### 方法2：修改main.py使用绝对路径（推荐）
main.py已经使用了正确的路径：
```python
static_dir = Path(__file__).parent / "static"  # 相对于main.py所在目录
```

#### 方法3：检查static目录是否存在
```bash
ls -la /home/user/Product_Warehouse/src/Backend/app/static/avatars/
```

如果目录不存在，main.py会在启动时自动创建。

### 测试静态文件访问

1. **启动服务器**
```bash
cd /home/user/Product_Warehouse/src/Backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

2. **上传测试图片**
```bash
curl -X POST http://localhost:8003/api/v1/users/me/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/test.jpg"
```

3. **访问上传的图片**
```
http://localhost:8003/static/avatars/4_8fc3f8b8.jpg
```

---

## 🧪 功能测试清单

### 1. 个人资料测试

#### 测试步骤
1. 登录系统
2. 进入设置页面
3. 查看个人资料是否显示真实数据
4. 修改姓名、电话等信息
5. 点击"保存个人资料"
6. 查看是否显示成功提示

#### 预期结果
- ✅ 显示真实用户数据（不是"张仓管"等假数据）
- ✅ 角色显示正确（中文：管理员/仓库经理/员工/测试员）
- ✅ 修改后显示"个人资料已保存"
- ✅ 刷新页面后数据保持

### 2. 头像上传测试

#### 测试步骤
1. 点击"上传头像"按钮
2. 选择图片文件（< 2MB，JPG/PNG/WEBP）
3. 等待上传完成
4. 查看头像是否更新
5. 点击头像右上角的删除按钮
6. 确认头像恢复为默认头像

#### 预期结果
- ✅ 上传成功显示"头像上传成功"
- ✅ 头像立即显示新图片
- ✅ 删除后显示"头像已删除"
- ✅ 显示默认SVG头像（基于用户名首字母）

#### 测试错误处理
- 上传超过2MB的文件 → 显示"图片大小不能超过 2MB"
- 上传非图片文件 → 显示"仅支持 JPG, PNG, WEBP 格式"

### 3. 仓库配置测试

#### 测试步骤（需要 manager/admin/tester 权限）
1. 进入"仓库"Tab
2. 修改仓库名称、位置
3. 调整低库存阈值滑块
4. 点击"保存仓库配置"
5. 刷新页面验证

#### 预期结果
- ✅ 显示真实仓库配置（不是"主配送中心"等假数据）
- ✅ 权限正确：staff角色输入框被禁用
- ✅ 保存成功显示"仓库配置已保存"

### 4. 密码修改测试

#### 测试步骤
1. 进入"安全"Tab
2. 输入当前密码
3. 输入新密码（至少8位）
4. 确认新密码
5. 点击"修改密码"

#### 预期结果
- ✅ 修改成功显示"密码修改成功"
- ✅ 输入框清空
- ✅ 可以用新密码重新登录

#### 测试错误处理
- 当前密码错误 → 显示"当前密码不正确"
- 两次新密码不一致 → 显示"两次输入的新密码不一致"
- 新密码少于8位 → 显示"新密码长度至少8位"

### 5. 外观设置测试

#### 测试步骤
1. 进入"外观"Tab
2. 切换主题（浅色/深色/跟随系统）
3. 切换"显示动效"开关
4. 切换"紧凑侧边栏"开关
5. 点击"保存外观设置"

#### 预期结果
- ✅ 主题立即生效
- ✅ 侧边栏展开/收起
- ✅ 刷新后设置保持

---

## 🔑 Token 获取说明

### 如何获取 Authorization Bearer Token？

#### 方法1：通过浏览器开发者工具
1. 登录系统
2. 打开浏览器开发者工具（F12）
3. 进入 Application → Local Storage
4. 查找 `access_token` key
5. 复制其值

#### 方法2：通过登录API
```bash
curl -X POST http://localhost:8003/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=password123"
```

返回：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### 方法3：前端自动管理
前端的 `apiService` 会自动：
- 登录成功后保存 token 到 localStorage
- 每个请求自动添加 `Authorization: Bearer <token>` 头
- Token 失效时清除并跳转到登录页

### Token 存储位置
```
localStorage.getItem('access_token')
```

### Token 有效期
默认：1440 分钟（24小时）

---

## 🐛 已知问题

### 1. 静态文件404
- **状态**: 待确认
- **原因**: 可能是服务器启动目录不正确
- **解决**: 确保从 `src/Backend` 目录启动服务器

### 2. 通知设置无后端API
- **状态**: 预期行为
- **说明**: 通知设置当前仅本地存储，后端API待实现

### 3. AI设置无后端API
- **状态**: 预期行为
- **说明**: AI设置Tab已移除，设置保存在zustand store

---

## 📋 API端点总结

### 已集成的API
- `GET /api/v1/users/me` - 获取当前用户
- `PUT /api/v1/users/me` - 更新用户资料
- `POST /api/v1/users/me/avatar` - 上传头像
- `DELETE /api/v1/users/me/avatar` - 删除头像
- `GET /api/v1/users/me/avatar/default` - 获取默认头像
- `POST /api/v1/users/me/change-password` - 修改密码
- `GET /api/v1/warehouse/config` - 获取仓库配置
- `PUT /api/v1/warehouse/config` - 更新仓库配置

### 待实现的API
- `GET /api/v1/users/me/notification-settings` - 获取通知设置
- `PUT /api/v1/users/me/notification-settings` - 更新通知设置
- `GET /api/v1/users/me/sessions` - 获取活跃会话
- `DELETE /api/v1/users/me/sessions/{id}` - 删除会话

---

## 🎯 下一步计划

1. **验证静态文件访问** - 确保头像上传后可以正常访问
2. **测试所有功能** - 按照测试清单逐一验证
3. **修复发现的bug** - 根据测试结果修复问题
4. **添加更多错误处理** - 处理网络错误、超时等边缘情况
5. **优化用户体验** - 添加加载动画、优化布局等
6. **实现通知设置后端API** - 将通知设置持久化到数据库
7. **添加会话管理功能** - 实现活跃会话查看和远程登出

---

**最后更新**: 2025-11-12
**作者**: Claude Code Assistant
