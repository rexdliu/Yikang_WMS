import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  BarChart3,
  MapPin,
  FileText,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Warehouse
} from 'lucide-react';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: '仪表盘', href: '/', icon: LayoutDashboard },
  { name: '订单管理', href: '/orders', icon: ShoppingCart },
  { name: '库存调整', href: '/inventory-management', icon: Warehouse },
  { name: '库存查询', href: '/inventory', icon: Package },
  { name: '智能分析', href: '/analytics', icon: BarChart3 },
  { name: '仓库地图', href: '/warehouse', icon: MapPin },
  { name: '智能报告', href: '/reports', icon: FileText },
  { name: 'AI 助手', href: '/ai', icon: Bot },
  { name: '系统设置', href: '/settings', icon: Settings },
];

export const AppSidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  return (
    <div className={cn(
      "fixed left-0 top-0 z-50 h-full bg-card border-r border-border transition-all duration-300",
      sidebarOpen ? "w-64" : "w-16"
    )}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-4">
          {sidebarOpen ? (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                智能仓储中心
              </span>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  !sidebarOpen && "mx-auto"
                )} />
                {sidebarOpen && (
                  <span className="ml-3">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "w-full",
              !sidebarOpen && "px-2"
            )}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                收起菜单
              </>
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
