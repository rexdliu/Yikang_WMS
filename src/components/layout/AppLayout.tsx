import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { DraggableAI } from '../ai/DraggableAI';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  // 从 store 中获取所有需要的状态
  const { sidebarOpen, theme, showAnimations, showTooltips } = useUIStore();

  // Effect for applying theme
  useEffect(() => {
    const root = document.documentElement; // <html>
    const applyTheme = (t: 'light' | 'dark' | 'system') => {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const newTheme = t === 'system' ? systemTheme : t;
      
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    // 如果设置为'system'，需要监听操作系统主题的变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme(theme);
    
    mediaQuery.addEventListener('change', handleChange);
    
    // 清理监听器
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  
  // Effect for applying other UI options (animations, tooltips)
  useEffect(() => {
    document.body.classList.toggle('no-animations', !showAnimations);
    document.body.classList.toggle('no-tooltips', !showTooltips);
  }, [showAnimations, showTooltips]);

  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AppSidebar />
        
        <div className={cn(
          "flex-1 transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-16"
        )}>
          <AppHeader />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>

      <DraggableAI hidden={location.pathname === '/ai'} />
    </div>
  );
};