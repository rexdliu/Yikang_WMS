//  // 在实际应用中，这里还应该调用后端API来使token失效 (logout)
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  User,
  Sun,
  Moon,
  Settings,
  LogOut,
  X,
  Loader2
} from 'lucide-react';
import { useUIStore, useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { apiService, type SearchResult, type NotificationResponse } from '@/services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const AppHeader: React.FC = () => {
  const { theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 加载通知
  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const [notifs, countData] = await Promise.all([
        apiService.getNotifications(0, 10, false),
        apiService.getUnreadNotificationCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(countData.unread_count);
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // 初始加载通知
  useEffect(() => {
    loadNotifications();
    // 每30秒刷新一次通知
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 搜索处理
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearchLoading(true);
      const results = await apiService.globalSearch(query, 10);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 防抖搜索
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  // 删除通知
  const handleDeleteNotification = async (id: number) => {
    try {
      await apiService.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
      if (notifications.find(n => n.id === id && !n.is_read)) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  // 标记通知为已读
  const handleMarkAsRead = async (id: number) => {
    try {
      await apiService.markNotificationAsRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('标记通知失败:', error);
    }
  };

  // 获取通知类型徽章颜色
  const getNotificationBadgeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      order: 'bg-blue-500',
      inventory: 'bg-yellow-500',
      alert: 'bg-red-500',
      product: 'bg-green-500',
      system: 'bg-gray-500',
    };
    return colorMap[type] || 'bg-gray-500';
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="flex items-center space-x-4 flex-1 max-w-md relative">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索产品、订单、经销商..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    navigate(result.url);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="w-full px-4 py-3 hover:bg-accent text-left border-b last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">
                      {result.type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-9 p-0"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">通知</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadNotifications}
                    disabled={notificationsLoading}
                  >
                    {notificationsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '刷新'
                    )}
                  </Button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">暂无通知</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start space-x-2 rounded-lg border p-3 ${
                          !notification.is_read ? 'bg-accent/50' : ''
                        }`}
                      >
                        <Badge className={`${getNotificationBadgeColor(notification.notification_type)} text-white mt-1`}>
                          {notification.notification_type}
                        </Badge>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'PPp', { locale: zhCN })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                              title="标记为已读"
                            >
                              ✓
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="h-6 w-6 p-0"
                            title="删除"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                设置
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};