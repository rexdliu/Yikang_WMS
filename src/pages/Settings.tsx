import React, { useEffect, useState } from 'react';
import {
  User, Shield, Bell, Palette, Brain, Database,
  Link2, Package, Moon, Sun, Monitor, Smartphone,
  Mail, MessageSquare, Zap, Key, Download,
  Upload, Globe, Wifi, WifiOff, Check, ChevronRight,
  Building2, MapPin, BarChart3, Lock, Sparkles, Loader2,
  AlertCircle, X, Trash2
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {useUIStore, useAuthStore} from "@/stores";
import { apiService, UserResponse, WarehouseConfig as WarehouseConfigType } from '@/services/api';
const Settings = () => {
  const {
    theme: globalTheme,
    setTheme: setGlobalTheme,
    sidebarOpen,
    toggleSidebar,
    aiSettings,
    setAISettings
  } = useUIStore();

  const { user: authUser } = useAuthStore();

  // 加载状态
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 用户数据
  const [userData, setUserData] = useState<UserResponse | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    phone: '',
    full_name: '',
    language: 'zh-CN'
  });

  // 仓库配置
  const [warehouseConfig, setWarehouseConfig] = useState<WarehouseConfigType | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({
    warehouse_name: '',
    location: '',
    timezone: 'Asia/Shanghai',
    temperature_unit: 'celsius',
    low_stock_threshold: 10
  });

  // 密码修改
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // 保持本地状态，但确保与全局状态同步
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(
    globalTheme
  );

  interface Notifications {
    email: boolean;
    push: boolean;
    sms: boolean;
    lowStock: boolean;
    orderUpdates: boolean;
    systemAlerts: boolean;
  }

  // 通知设置（暂时本地存储）
  const [notifications, setNotifications] = useState<Notifications>({
    email: true,
    push: true,
    sms: false,
    lowStock: true,
    orderUpdates: true,
    systemAlerts: true,
  });

  // 头像上传
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

  // 界面选项
  const [showAnimations, setShowAnimations] = useState<boolean>(true);
  const [compactSidebar, setCompactSidebar] = useState<boolean>(false);
  const [showTooltips, setShowTooltips] = useState<boolean>(true);

  // Toast通知
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // 显示Toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  // 初始加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 并行加载用户数据和仓库配置
        const [userRes, warehouseRes] = await Promise.all([
          apiService.getCurrentUser(),
          apiService.getWarehouseConfig().catch(() => null) // 仓库配置可能不存在
        ]);

        // 设置用户数据
        setUserData(userRes);
        setProfileForm({
          username: userRes.username,
          email: userRes.email,
          phone: userRes.phone || '',
          full_name: userRes.full_name || '',
          language: userRes.language || 'zh-CN'
        });
        setAvatarUrl(userRes.avatar_url || '');

        // 设置仓库配置
        if (warehouseRes) {
          setWarehouseConfig(warehouseRes);
          setWarehouseForm({
            warehouse_name: warehouseRes.warehouse_name,
            location: warehouseRes.location,
            timezone: warehouseRes.timezone,
            temperature_unit: warehouseRes.temperature_unit,
            low_stock_threshold: warehouseRes.low_stock_threshold
          });
        }

      } catch (err) {
        console.error('加载设置失败:', err);
        setError(err instanceof Error ? err.message : '加载设置失败');
        showToast('加载设置失败，请刷新重试', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 主题切换副作用
  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: 'light' | 'dark') => {
      if (mode === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    };

    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mql.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } else {
      apply(theme);
    }
  }, [theme]);

  // 当全局主题变化时，更新本地状态
  useEffect(() => {
    setTheme(globalTheme);
  }, [globalTheme]);

  useEffect(() => {
    document.body.classList.toggle('no-animations', !showAnimations);
  }, [showAnimations]);

  useEffect(() => {
    document.body.classList.toggle('no-tooltips', !showTooltips);
  }, [showTooltips]);

  useEffect(() => {
    if (compactSidebar !== !sidebarOpen) toggleSidebar();
  }, [compactSidebar, sidebarOpen, toggleSidebar]);

  // 处理通知切换
  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 处理AI设置切换
  const handleAIToggle = (key: keyof typeof aiSettings) => {
    const newSettings = { ...aiSettings, [key]: !aiSettings[key] };
    setAISettings(newSettings);
  };

  // 处理头像上传
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 文件大小限制（5MB）
    if (file.size > 5 * 1024 * 1024) {
      showToast('图片大小不能超过 5MB', 'error');
      return;
    }

    // 文件类型检查
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('仅支持 JPG, PNG, WEBP 格式', 'error');
      return;
    }

    try {
      setUploadingAvatar(true);
      const result = await apiService.uploadAvatar(file);
      setAvatarUrl(result.avatar_url);

      // 更新userData
      if (userData) {
        setUserData({ ...userData, avatar_url: result.avatar_url });
      }

      showToast('头像上传成功', 'success');
    } catch (err) {
      console.error('上传头像失败:', err);
      showToast(err instanceof Error ? err.message : '上传头像失败', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 处理头像删除
  const handleDeleteAvatar = async () => {
    try {
      setUploadingAvatar(true);
      await apiService.deleteAvatar();
      setAvatarUrl('');

      // 更新userData
      if (userData) {
        setUserData({ ...userData, avatar_url: null });
      }

      showToast('头像已删除', 'success');
    } catch (err) {
      console.error('删除头像失败:', err);
      showToast(err instanceof Error ? err.message : '删除头像失败', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 保存个人资料
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updatedUser = await apiService.updateUserProfile(profileForm);
      setUserData(updatedUser);
      showToast('个人资料已保存', 'success');
    } catch (err) {
      console.error('保存失败:', err);
      showToast(err instanceof Error ? err.message : '保存个人资料失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 保存仓库配置
  const handleSaveWarehouse = async () => {
    if (!userData || !['admin', 'manager', 'tester'].includes(userData.role)) {
      showToast('您没有权限修改仓库配置', 'error');
      return;
    }

    try {
      setSaving(true);
      const updatedConfig = await apiService.updateWarehouseConfig(warehouseForm);
      setWarehouseConfig(updatedConfig);
      showToast('仓库配置已保存', 'success');
    } catch (err) {
      console.error('保存失败:', err);
      showToast(err instanceof Error ? err.message : '保存仓库配置失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      showToast('新密码长度至少8位', 'error');
      return;
    }

    try {
      setSaving(true);
      await apiService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });

      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });

      showToast('密码修改成功', 'success');
    } catch (err) {
      console.error('修改密码失败:', err);
      showToast(err instanceof Error ? err.message : '修改密码失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 保存外观设置
  const handleSaveAppearance = () => {
    const desiredTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    setGlobalTheme(desiredTheme);
    showToast('外观设置已保存', 'success');
  };

  // 获取用户头像URL或默认头像
  const getAvatarUrl = () => {
    if (avatarUrl) {
      return avatarUrl;
    }
    // 返回默认头像SVG endpoint
    return '/api/v1/users/me/avatar/default';
  };

  // 获取用户角色显示文本
  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: '管理员',
      manager: '仓库经理',
      staff: '员工',
      tester: '测试员'
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载设置中...</p>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              设置
            </h1>
            <p className="text-muted-foreground mt-1">
              管理仓库策略、界面偏好与智能服务
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <Wifi className="w-3 h-3" />
              已连接
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden lg:inline">个人资料</span>
            </TabsTrigger>
            <TabsTrigger value="warehouse" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden lg:inline">仓库</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden lg:inline">AI助手</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden lg:inline">通知</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden lg:inline">外观</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden lg:inline">安全</span>
            </TabsTrigger>
          </TabsList>

          {/* 个人资料 */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>个人信息</CardTitle>
                <CardDescription>更新你的基本信息与偏好</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-primary/10">
                      <AvatarImage src={getAvatarUrl()} />
                      <AvatarFallback>
                        {userData?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {avatarUrl && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                          {uploadingAvatar ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>上传头像</span>
                        </div>
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                      <span className="text-sm text-muted-foreground">
                        支持 PNG / JPG / WEBP，最大 5MB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">电话</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">姓名</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">角色</Label>
                    <Input
                      id="role"
                      value={getRoleText(userData?.role || '')}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    保存个人资料
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 仓库设置 */}
          <TabsContent value="warehouse" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>仓库配置</CardTitle>
                <CardDescription>管理仓库基础参数与偏好</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!warehouseConfig ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>仓库配置不存在，请联系管理员</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="warehouse-name">仓库名称</Label>
                        <Input
                          id="warehouse-name"
                          value={warehouseForm.warehouse_name}
                          onChange={(e) => setWarehouseForm({...warehouseForm, warehouse_name: e.target.value})}
                          disabled={!userData || !['admin', 'manager', 'tester'].includes(userData.role)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="warehouse-location">位置</Label>
                        <Input
                          id="warehouse-location"
                          value={warehouseForm.location}
                          onChange={(e) => setWarehouseForm({...warehouseForm, location: e.target.value})}
                          disabled={!userData || !['admin', 'manager', 'tester'].includes(userData.role)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        位置与时区
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>时区</Label>
                          <Select
                            value={warehouseForm.timezone}
                            onValueChange={(value) => setWarehouseForm({...warehouseForm, timezone: value})}
                            disabled={!userData || !['admin', 'manager', 'tester'].includes(userData.role)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Asia/Shanghai">中国时间（CST）</SelectItem>
                              <SelectItem value="America/New_York">北美东部时间（EST）</SelectItem>
                              <SelectItem value="America/Chicago">北美中部时间（CST）</SelectItem>
                              <SelectItem value="America/Denver">北美山地时间（MST）</SelectItem>
                              <SelectItem value="America/Los_Angeles">北美太平洋时间（PST）</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>温度单位</Label>
                          <RadioGroup
                            value={warehouseForm.temperature_unit}
                            onValueChange={(value) => setWarehouseForm({...warehouseForm, temperature_unit: value})}
                            disabled={!userData || !['admin', 'manager', 'tester'].includes(userData.role)}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="celsius" id="celsius" />
                              <Label htmlFor="celsius">摄氏（°C）</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fahrenheit" id="fahrenheit" />
                              <Label htmlFor="fahrenheit">华氏（°F）</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        库存策略
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>低库存告警阈值</Label>
                            <p className="text-sm text-muted-foreground">当库存低于该数量时提醒</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[warehouseForm.low_stock_threshold]}
                              max={100}
                              step={5}
                              className="w-32"
                              onValueChange={(v) => setWarehouseForm({...warehouseForm, low_stock_threshold: v[0]})}
                              disabled={!userData || !['admin', 'manager', 'tester'].includes(userData.role)}
                            />
                            <span className="text-sm font-medium w-12 text-right">{warehouseForm.low_stock_threshold}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveWarehouse}
                        disabled={saving || !userData || !['admin', 'manager', 'tester'].includes(userData.role)}
                      >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        保存仓库配置
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI助手 */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI助手设置</CardTitle>
                <CardDescription>配置智能助手的行为与偏好</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Brain className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <Label className="text-base">启用AI助手</Label>
                        <p className="text-sm text-muted-foreground">开启/关闭智能助手功能</p>
                      </div>
                    </div>
                    <Switch
                      checked={aiSettings.enabled}
                      onCheckedChange={() => handleAIToggle('enabled')}
                    />
                  </div>
                </div>

                <Separator />

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    更多AI功能（自动建议、语音输入、上下文记忆等）正在开发中，敬请期待
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 通知 */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>通知偏好</CardTitle>
                <CardDescription>选择你的通知方式与类型（暂时本地存储）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">通知渠道</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label className="text-base">邮箱</Label>
                          <p className="text-sm text-muted-foreground">通过电子邮件接收更新</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={() => handleNotificationToggle('email')}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label className="text-base">推送</Label>
                          <p className="text-sm text-muted-foreground">浏览器与移动端推送通知</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={() => handleNotificationToggle('push')}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label className="text-base">短信</Label>
                          <p className="text-sm text-muted-foreground">为关键告警发送短信</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.sms}
                        onCheckedChange={() => handleNotificationToggle('sms')}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">通知类型</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>低库存告警</Label>
                        <p className="text-sm text-muted-foreground">当库存低于阈值时</p>
                      </div>
                      <Switch
                        checked={notifications.lowStock}
                        onCheckedChange={() => handleNotificationToggle('lowStock')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>订单更新</Label>
                        <p className="text-sm text-muted-foreground">新订单与状态变更</p>
                      </div>
                      <Switch
                        checked={notifications.orderUpdates}
                        onCheckedChange={() => handleNotificationToggle('orderUpdates')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>系统告警</Label>
                        <p className="text-sm text-muted-foreground">维护与系统更新</p>
                      </div>
                      <Switch
                        checked={notifications.systemAlerts}
                        onCheckedChange={() => handleNotificationToggle('systemAlerts')}
                      />
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    通知设置当前仅保存在本地，后端API支持即将推出
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 外观 */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>外观设置</CardTitle>
                <CardDescription>自定义仪表盘的外观与风格</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">主题</h3>
                  <RadioGroup value={theme} onValueChange={(v) => setTheme(v as 'system' | 'light' | 'dark')}>
                    <div className="grid grid-cols-3 gap-4">
                      <Label
                        htmlFor="light"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <RadioGroupItem value="light" id="light" className="sr-only" />
                        <Sun className="mb-3 h-6 w-6" />
                        <span>浅色</span>
                      </Label>
                      <Label
                        htmlFor="dark"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <RadioGroupItem value="dark" id="dark" className="sr-only" />
                        <Moon className="mb-3 h-6 w-6" />
                        <span>深色</span>
                      </Label>
                      <Label
                        htmlFor="system"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <RadioGroupItem value="system" id="system" className="sr-only" />
                        <Monitor className="mb-3 h-6 w-6" />
                        <span>跟随系统</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">界面选项</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>显示动效</Label>
                      <Switch checked={showAnimations} onCheckedChange={setShowAnimations} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>紧凑侧边栏</Label>
                      <Switch checked={compactSidebar} onCheckedChange={setCompactSidebar} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>显示工具提示</Label>
                       <Switch checked={showTooltips} onCheckedChange={setShowTooltips} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveAppearance}>
                    保存外观设置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 安全 */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>安全设置</CardTitle>
                <CardDescription>管理账户安全与访问</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">修改密码</h3>
                  <div className="space-y-3 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">当前密码</Label>
                      <Input
                        id="current_password"
                        type="password"
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new_password">新密码</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">确认新密码</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleChangePassword} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Key className="w-4 h-4 mr-2" />
                      修改密码
                    </Button>
                  </div>
                </div>

                <Separator />

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    两步验证、活跃会话管理、API密钥功能即将推出
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Toast 通知 */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className={`rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-green-600 text-white'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast({ visible: false, message: '', type: 'success' })}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
