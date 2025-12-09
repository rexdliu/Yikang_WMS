import React, { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  Warehouse,
  TrendingUp,
  Clock,
  Brain
} from 'lucide-react';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores';
import { apiService, type DashboardStats, type ActivityLog } from '@/services/api';
import warehouseHero from '@/assets/warehouse-hero.jpg';


const Dashboard: React.FC = () => {
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'daily' | 'monthly'>('weekly');
  const { addNotification } = useUIStore();

  // Dashboard data state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行加载所有数据
      const [statsData, activitiesData] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getRecentActivities(10),
      ]);

      setStats(statsData);
      setRecentActivities(activitiesData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载数据失败';
      setError(errorMsg);
      addNotification({
        title: '加载失败',
        message: errorMsg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // 格式化时间
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}秒前`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
    return `${Math.floor(seconds / 86400)}天前`;
  };

  // 根据活动类型返回对应的 CSS 类
  const getActivityTypeClass = (type: string) => {
    switch (type) {
      case 'alert':
        return 'bg-warning';
      case 'order':
        return 'bg-success';
      case 'inventory':
        return 'bg-primary';
      default:
        return 'bg-muted';
    }
  };

  const metricsLoading = loading;
  const totalProductsValue = metricsLoading ? '...' : (stats?.total_products ?? 0).toString();
  const lowStockValue = metricsLoading ? '...' : (stats?.low_stock_items ?? 0).toString();
  const pendingOrdersValue = metricsLoading ? '...' : (stats?.pending_orders ?? 0).toString();

  // 计算仓库容量使用率
  const warehouseCapacity = stats
    ? Math.min(Math.round((stats.total_inventory / (stats.total_products * 100)) * 100), 100)
    : 0;
  const capacityValue = metricsLoading ? '...' : `${warehouseCapacity}%`;

  const aiInsights = [
    {
      title: '库存预警',
      message: `当前有 ${stats?.low_stock_items ?? 0} 个产品低于最低库存水平`,
      confidence: 95
    },
    {
      title: '订单统计',
      message: `待处理订单: ${stats?.pending_orders ?? 0} 个`,
      confidence: 100
    },
    {
      title: '库存总值',
      message: `当前库存总价值: ¥${stats?.total_inventory_value?.toFixed(2) ?? '0.00'}`,
      confidence: 100
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-lg overflow-hidden">
        <img 
          src={warehouseHero} 
          alt="Warehouse"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/60 flex items-center">
          <div className="text-white p-6">
            <h1 className="text-3xl font-bold mb-2">仓库 AI 仪表盘</h1>
            <p className="text-lg opacity-90">
              实时洞察与 AI 驱动的仓库管理
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="产品总数"
          value={totalProductsValue}
          icon={Package}
          variant="default"
        />
        <MetricsCard
          title="低库存警报"
          value={lowStockValue}
          icon={AlertTriangle}
          variant="warning"
        />
        <MetricsCard
          title="待处理订单"
          value={pendingOrdersValue}
          icon={ShoppingCart}
          variant="default"
        />
        <MetricsCard
          title="仓库容量使用率"
          value={capacityValue}
          icon={Warehouse}
          variant={warehouseCapacity > 90 ? 'error' : warehouseCapacity > 75 ? 'warning' : 'success'}
        />
      </div>

     {/* 2. 将图表用 Card 包裹，并添加切换按钮 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>销售与库存趋势</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant={timePeriod === 'daily' ? 'secondary' : 'outline'} size="sm" onClick={() => setTimePeriod('daily')}>
              按天
            </Button>
            <Button variant={timePeriod === 'weekly' ? 'secondary' : 'outline'} size="sm" onClick={() => setTimePeriod('weekly')}>
              按周
            </Button>
            <Button variant={timePeriod === 'monthly' ? 'secondary' : 'outline'} size="sm" onClick={() => setTimePeriod('monthly')}>
              按月
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pl-2 pt-6">
          <DashboardCharts timePeriod={timePeriod} />
        </CardContent>
      </Card>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>最近活动</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无活动记录</p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`h-2 w-2 rounded-full ${getActivityTypeClass(activity.activity_type)}`} />
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.item_name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI 洞察</span>
            </CardTitle>
            <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-accent/10">
              <TrendingUp className="h-3 w-3 mr-1" />
              实时
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiInsights.map((insight, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{insight.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      置信度 {insight.confidence}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.message}</p>
                  <div className="w-full bg-muted rounded-full h-1">
                    <div 
                      className="bg-gradient-to-r from-primary to-accent h-1 rounded-full transition-all duration-500"
                      style={{ width: `${insight.confidence}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
