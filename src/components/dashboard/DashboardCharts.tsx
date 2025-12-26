import React, { useEffect, useState, useMemo } from 'react';
import { Chart, Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiService } from '@/services/api';

// Register all necessary components for Chart.js
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

// --- COMPONENT ---
interface DashboardChartsProps {
  timePeriod: 'daily' | 'monthly' | 'yearly';
}

type TrendViewMode = 'all' | 'inventory' | 'sales';

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ timePeriod }) => {
  const [loading, setLoading] = useState(true);
  const [rawTrendData, setRawTrendData] = useState<any>(null);
  const [rawMovementData, setRawMovementData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [trendViewMode, setTrendViewMode] = useState<TrendViewMode>('all');

  // 检测深色模式
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // 初始检查
    checkDarkMode();

    // 监听 class 变化
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // 根据实际数据计算 Y 轴范围（动态计算，添加 10% 缓冲区）
  const getYAxisConfig = useMemo(() => {
    // 计算产品动向最大值
    let movementMax = 100;
    if (rawMovementData) {
      const inboundMax = Math.max(...(rawMovementData.inbound_data || [0]));
      const outboundMax = Math.max(...(rawMovementData.outbound_data || rawMovementData.movement_data || [0]));
      movementMax = Math.max(inboundMax, outboundMax, 10) * 1.1; // 添加 10% 缓冲
    }

    // 计算库存和销售最大值
    let inventoryMax = 500;
    let salesMax = 10000;
    if (rawTrendData) {
      const invMax = Math.max(...(rawTrendData.inventory_levels || [0]));
      const sMax = Math.max(...(rawTrendData.sales_data || [0]));
      inventoryMax = Math.max(invMax, 100) * 1.1;
      salesMax = Math.max(sMax, 1000) * 1.1;
    }

    // 根据时间周期应用不同的最小基准值
    const periodMultiplier = timePeriod === 'yearly' ? 3 : timePeriod === 'monthly' ? 1.5 : 1;

    return {
      movementMax: Math.ceil(movementMax * periodMultiplier / 10) * 10, // 圆整到整十
      inventoryMax: Math.ceil(inventoryMax / 100) * 100, // 圆整到整百
      salesMax: Math.ceil(salesMax / 1000) * 1000, // 圆整到整千
    };
  }, [timePeriod, rawTrendData, rawMovementData]);

  // 单 Y 轴图表选项 - 产品动向使用
  const singleAxisOptions = useMemo((): ChartOptions<'line' | 'bar'> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#374151',
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
        },
      },
      y: {
        beginAtZero: true,
        suggestedMax: getYAxisConfig.movementMax,
        grid: { color: isDarkMode ? '#374151' : '#e5e7eb' },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          callback: function (value) {
            return value.toLocaleString();
          },
        },
      }
    }
  }), [isDarkMode, getYAxisConfig]);

  // 混合图表选项 - 支持双 Y 轴
  const mixedChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#374151',
          usePointStyle: true,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        suggestedMax: getYAxisConfig.inventoryMax,
        title: {
          display: true,
          text: '库存量',
          color: 'rgb(59, 130, 246)',
        },
        grid: { color: isDarkMode ? '#374151' : '#e5e7eb' },
        ticks: {
          color: 'rgb(59, 130, 246)',
          callback: function (value) {
            return value.toLocaleString();
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        suggestedMax: getYAxisConfig.salesMax,
        title: {
          display: true,
          text: '销售额 (¥)',
          color: 'rgb(34, 197, 94)',
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgb(34, 197, 94)',
          callback: function (value) {
            if (typeof value === 'number') {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          },
        },
      }
    }
  }), [isDarkMode]);

  // 环形图选项 - 改进的样式
  const doughnutOptions = useMemo((): ChartOptions<'doughnut'> => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%', // 中心空心比例
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#374151',
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const dataset = context.dataset.data as number[];
            const total = dataset.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  }), [isDarkMode]);

  useEffect(() => {
    loadChartData();
  }, [timePeriod]);

  const loadChartData = async () => {
    try {
      setLoading(true);

      // 根据周期设置天数
      let days = 30;
      if (timePeriod === 'daily') days = 7;
      else if (timePeriod === 'monthly') days = 180;

      // 并行加载所有图表数据
      const [trendData, movement, categories] = await Promise.all([
        apiService.getInventorySalesTrend(timePeriod, days),
        apiService.getProductMovement(timePeriod, days),
        apiService.getCategoryDistribution(),
      ]);

      // 保存原始趋势数据
      setRawTrendData(trendData);

      // 保存原始动向数据（包含入库/出库）
      setRawMovementData(movement);

      // 设置分类分布数据
      setCategoryData({
        labels: categories.labels,
        datasets: [
          {
            data: categories.data,
            backgroundColor: [
              'rgb(59, 130, 246)',
              'rgb(239, 68, 68)',
              'rgb(34, 197, 94)',
              'rgb(245, 158, 11)',
              'rgb(168, 85, 247)',
              'rgb(236, 72, 153)',
              'rgb(20, 184, 166)',
            ],
            borderWidth: 0,
          },
        ],
      });
    } catch (error) {
      console.error('加载图表数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 根据视图模式生成趋势图表数据
  const inventoryTrendData = useMemo(() => {
    if (!rawTrendData) return null;

    const datasets = [];

    if (trendViewMode === 'all' || trendViewMode === 'inventory') {
      datasets.push({
        type: 'line' as const,
        label: '库存量',
        data: rawTrendData.inventory_levels,
        borderColor: 'rgb(59, 130, 246)', // 蓝色
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: trendViewMode === 'inventory',
        yAxisID: trendViewMode === 'all' ? 'y' : 'y',
      });
    }

    if (trendViewMode === 'all' || trendViewMode === 'sales') {
      datasets.push({
        type: 'bar' as const,
        label: '销售额 (¥)',
        data: rawTrendData.sales_data,
        backgroundColor: 'rgba(34, 197, 94, 0.7)', // 绿色
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: trendViewMode === 'all' ? 'y1' : 'y',
      });
    }

    return {
      labels: rawTrendData.labels,
      datasets,
    };
  }, [rawTrendData, trendViewMode]);

  // 产品动向数据 - 显示入库和出库
  const movementChartData = useMemo(() => {
    if (!rawMovementData) return null;

    return {
      labels: rawMovementData.labels,
      datasets: [
        {
          label: '入库',
          data: rawMovementData.inbound_data || rawMovementData.movement_data?.map(() => 0) || [],
          backgroundColor: 'rgba(34, 197, 94, 0.7)', // 绿色
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: '出库',
          data: rawMovementData.outbound_data || rawMovementData.movement_data || [],
          backgroundColor: 'rgba(239, 68, 68, 0.7)', // 红色
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [rawMovementData]);

  // 获取当前趋势图表使用的选项
  const currentTrendOptions = useMemo(() => {
    if (trendViewMode === 'all') {
      return mixedChartOptions;
    }
    // 单独显示时使用单 Y 轴
    return {
      ...singleAxisOptions,
      plugins: {
        ...singleAxisOptions.plugins,
        legend: {
          ...singleAxisOptions.plugins?.legend,
          display: false, // 单独显示时隐藏图例
        },
      },
    };
  }, [trendViewMode, mixedChartOptions, singleAxisOptions]);

  if (loading || !inventoryTrendData || !movementChartData || !categoryData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="h-[250px] flex items-center justify-center">
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="h-[250px] flex items-center justify-center">
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>库存/销售趋势</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={trendViewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTrendViewMode('all')}
            >
              全部
            </Button>
            <Button
              variant={trendViewMode === 'inventory' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTrendViewMode('inventory')}
              className={trendViewMode === 'inventory' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            >
              库存量
            </Button>
            <Button
              variant={trendViewMode === 'sales' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTrendViewMode('sales')}
              className={trendViewMode === 'sales' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              销售额
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {trendViewMode === 'all' ? (
              <Chart type="bar" data={inventoryTrendData} options={currentTrendOptions as any} />
            ) : trendViewMode === 'inventory' ? (
              <Line data={inventoryTrendData as any} options={currentTrendOptions as any} />
            ) : (
              <Bar data={inventoryTrendData as any} options={currentTrendOptions as any} />
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>产品动向（入库/出库）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <Bar data={movementChartData} options={singleAxisOptions} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>库存种类</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <Doughnut data={categoryData} options={doughnutOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
