//toaster -- for 临时通知
/*
QueryClientProvider：用于管理来自服务器的数据。它自动处理数据的获取、缓存和更新，让你的应用运行速度更快、响应更灵敏。

TooltipProvider：允许在整个应用程序中使用工具提示（将鼠标悬停在元素上时弹出的小信息窗口）。

Toaster&Sonner：用于显示“toast”通知。注释//toaster -- for 临时通知表示“临时通知”，例如弹出一个小窗口，提示“保存成功！”或“发生错误”。

BrowserRouter：这是库中导航系统的核心react-router-dom。它将你的应用连接到浏览器的 URL，让你无需重新加载整个网站即可创建不同的“页面”。
*/

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/stores";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import AIAssistantPage from "./pages/AIAssitantPage";
import Inventory from "./pages/Inventory";
import Analytics from "./pages/Analytics";
import WarehouseMap from "./pages/WarehouseMap";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OrderManagement from "./pages/OrderManagement";
import InventoryManagement from "./pages/InventoryManagement";
const queryClient = new QueryClient();

const App = () => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // 应用启动时初始化认证状态
    initializeAuth();
  }, [initializeAuth]);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* 登录和注册页面 - 不需要布局和认证 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 受保护的路由 - 需要认证和布局 */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/orders" element={<OrderManagement />} />
                    <Route path="/inventory-management" element={<InventoryManagement />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/warehouse" element={<WarehouseMap />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/ai" element={<AIAssistantPage />} />
                    <Route path="/settings" element={<Settings />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
