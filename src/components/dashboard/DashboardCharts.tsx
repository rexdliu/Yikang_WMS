import React, { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
import { apiService } from '@/services/api';

// Register all necessary components for Chart.js
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

// --- CHART OPTIONS (Simplified) ---
const chartOptions: ChartOptions<'line' | 'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'hsl(var(--border))' } }
  }
};

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
};

// --- COMPONENT ---
interface DashboardChartsProps {
  timePeriod: 'daily' | 'weekly' | 'monthly';
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ timePeriod }) => {
  const [loading, setLoading] = useState(true);
  const [inventoryTrendData, setInventoryTrendData] = useState<any>(null);
  const [movementData, setMovementData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any>(null);

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

      // 设置库存/销售趋势数据
      setInventoryTrendData({
        labels: trendData.labels,
        datasets: [
          {
            label: '库存量',
            data: trendData.inventory_levels,
            borderColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--primary) / 0.1)',
            tension: 0.4,
            fill: false,
          },
          {
            label: '销售额',
            data: trendData.sales_data,
            borderColor: 'hsl(var(--accent))',
            backgroundColor: 'hsl(var(--accent) / 0.1)',
            tension: 0.4,
            fill: false,
          },
        ],
      });

      // 设置产品动向数据
      setMovementData({
        labels: movement.labels,
        datasets: [
          {
            label: '移动物品数',
            data: movement.movement_data,
            backgroundColor: 'hsl(var(--primary))',
            borderRadius: 4,
          },
        ],
      });

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

  if (loading || !inventoryTrendData || !movementData || !categoryData) {
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
        <CardHeader>
          <CardTitle>库存/销售趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Line data={inventoryTrendData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>产品动向</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <Bar data={movementData} options={chartOptions} />
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
