// 页面：库存总览 + 经销商销售查询
// 重构：使用后端API筛选，支持大数据量场景

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useInventoryStore, Distributor, SalesOrder } from '@/stores';
import { apiService } from '@/services/api';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { User, DollarSign, Package, Calendar as CalendarIcon, Phone, Boxes, Search } from 'lucide-react';
import { SalesHistoryFilter } from '@/components/inventory/SalesHistoryFilter';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

// 组件：经销商详情卡片
const DistributorDetails = ({ distributor }: { distributor: Distributor | null }) => {
  if (!distributor) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{distributor.name}</CardTitle>
        <CardDescription>{distributor.region}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p className="flex items-center"><User className="h-4 w-4 mr-2 text-muted-foreground" />联系人: {distributor.contactPerson}</p>
        <p className="flex items-center"><Phone className="h-4 w-4 mr-2 text-muted-foreground" />联系电话: {distributor.phone}</p>
      </CardContent>
    </Card>
  );
};

type SalesFilters = {
  dateRange?: DateRange;
  productName?: string;
};

// 主页面组件
const Inventory: React.FC = () => {
  // 从 zustand store 获取库存数据
  const {
    products,
    loading: inventoryLoading,
    error: inventoryError,
    loadInventory,
  } = useInventoryStore();

  // 页面级本地状态
  const [selectedDistributorId, setSelectedDistributorId] = useState<number | null>(null);
  const [filters, setFilters] = useState<SalesFilters>({});
  const [distributorSearch, setDistributorSearch] = useState('');
  const [searchInput, setSearchInput] = useState(''); // 经销商搜索输入框的临时值

  // 使用React Query加载经销商列表（支持搜索）
  const {
    data: distributors = [],
    isLoading: distributorsLoading,
    error: distributorsError
  } = useQuery({
    queryKey: ['distributors', distributorSearch],
    queryFn: () => apiService.getDistributors(distributorSearch),
  });

  // 使用React Query加载销售订单（支持筛选）
  const {
    data: salesHistory = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: [
      'sales-orders',
      selectedDistributorId,
      filters.productName,
      filters.dateRange?.from,
      filters.dateRange?.to,
    ],
    queryFn: () => {
      if (!selectedDistributorId) {
        return Promise.resolve([]);
      }

      return apiService.getSalesOrders({
        distributorId: selectedDistributorId,
        productName: filters.productName,
        startDate: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
      });
    },
    enabled: selectedDistributorId !== null, // 只在选择了经销商时才查询
  });

  // 计算总库存指标
  const totalStockQuantity = useMemo(() => products.reduce((sum, p) => sum + p.quantity, 0), [products]);
  const totalStockValue = useMemo(() => products.reduce((sum, p) => sum + p.quantity * p.price, 0), [products]);
  const totalCategories = useMemo(() => new Set(products.map(p => p.category)).size, [products]);

  const isLoading = inventoryLoading || distributorsLoading;
  const errorMessage = inventoryError || (distributorsError as Error)?.message || (ordersError as Error)?.message;

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // 当前选中的经销商信息
  const selectedDistributor = useMemo(
    () => distributors.find((d) => d.id === selectedDistributorId) || null,
    [distributors, selectedDistributorId]
  );

  // 当前筛选下的销售总额
  const totalSalesValue = useMemo(
    () => salesHistory.reduce((acc, o) => acc + o.totalValue, 0),
    [salesHistory]
  );

  // 处理经销商搜索
  const handleDistributorSearch = () => {
    setDistributorSearch(searchInput);
  };

  // 处理筛选条件变更
  const handleFilterChange = (newFilters: SalesFilters) => {
    setFilters(newFilters);
  };

  // 清除筛选条件
  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      {/* ====== 1) 库存总览卡片 ====== */}
      <h1 className="text-3xl font-bold">库存与销售总览</h1>

      {errorMessage && (
        <div className="rounded-md border px-4 py-2 text-sm border-destructive/40 bg-destructive/10 text-destructive">
          {errorMessage}
        </div>
      )}

      {isLoading && products.length === 0 && distributors.length === 0 && (
        <div className="rounded-md border px-4 py-2 text-sm border-muted bg-muted/40 text-muted-foreground">
          数据加载中，请稍候...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 总库存数量 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              库存总数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalStockQuantity.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* 库存总价值 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              库存总价值
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${totalStockValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* 品类数 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              产品种类
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCategories}</p>
          </CardContent>
        </Card>
      </div>

      {/* ====== 2) 经销商选择 + 筛选器 ====== */}
      <Card>
        <CardHeader>
          <CardTitle>经销商销售业绩查询</CardTitle>
          <CardDescription>
            选择一个经销商以查看其详细的销售历史和总额。支持按订单日期和产品名称筛选。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 经销商搜索框 */}
          <div className="flex gap-2 items-center">
            <Input
              placeholder="搜索经销商（名称、代码、联系人、地区）..."
              className="flex-1"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDistributorSearch();
                }
              }}
            />
            <Button onClick={handleDistributorSearch} size="icon" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* 经销商选择列表 */}
          {distributorsLoading ? (
            <div className="text-sm text-muted-foreground">加载经销商列表...</div>
          ) : distributors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {distributors.map((d) => (
                <Card
                  key={d.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedDistributorId === d.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedDistributorId(d.id)}
                >
                  <CardContent className="p-4">
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm text-muted-foreground">{d.region}</div>
                    <div className="text-xs text-muted-foreground mt-1">{d.contactPerson}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {distributorSearch ? '未找到匹配的经销商' : '暂无经销商数据'}
            </div>
          )}

          {/* 选中经销商后展示筛选器（产品名 + 日期范围） */}
          {selectedDistributorId && (
            <>
              {/* 独立筛选器组件：只负责输入与回传 */}
              <SalesHistoryFilter onFilterChange={handleFilterChange} />

              {/* 一键清空筛选条件 */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                清除筛选
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ====== 3) 经销商详情 + 销售历史表格 ====== */}
      {selectedDistributor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：经销商信息 + 当前筛选下总销售额 */}
          <div className="lg:col-span-1 space-y-6">
            <DistributorDetails distributor={selectedDistributor} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  总销售额
                </CardTitle>
                <CardDescription>
                  {filters.dateRange || filters.productName ? '（当前筛选条件下）' : '（全部订单）'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${totalSalesValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：销售历史表格 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  销售历史记录
                </CardTitle>
                <CardDescription>
                  {salesHistory.length} 条订单记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载订单数据...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>订单号</TableHead>
                        <TableHead>产品</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                        <TableHead className="text-right">总金额</TableHead>
                        <TableHead>订单日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesHistory.length ? (
                        salesHistory.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">{order.orderCode}</TableCell>
                            <TableCell className="font-medium">{order.productName}</TableCell>
                            <TableCell className="text-right">{order.quantity}</TableCell>
                            <TableCell className="text-right">${order.totalValue.toFixed(2)}</TableCell>
                            <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">
                            {filters.dateRange || filters.productName
                              ? '当前筛选条件下没有找到订单记录'
                              : '该经销商暂无销售记录'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
