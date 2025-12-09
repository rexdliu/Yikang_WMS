/**
 * 订单管理页面
 *
 * 功能：
 * 1. 显示所有订单列表
 * 2. 按状态筛选订单
 * 3. 更新订单状态（仅管理员和仓库管理员）
 * 4. 查看订单详情
 * 5. 权限控制
 */
import React, { useState, useEffect } from 'react';
import { apiService, type SalesOrder } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Package, RefreshCw, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';

const ORDER_STATUSES = [
  { value: 'pending', label: '待处理', color: 'bg-yellow-500' },
  { value: 'processing', label: '处理中', color: 'bg-blue-500' },
  { value: 'shipped', label: '已发货', color: 'bg-purple-500' },
  { value: 'completed', label: '已完成', color: 'bg-green-500' },
  { value: 'cancelled', label: '已取消', color: 'bg-red-500' },
];

const getStatusBadge = (status: string) => {
  const statusConfig = ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
  return (
    <Badge className={`${statusConfig.color} text-white`}>
      {statusConfig.label}
    </Badge>
  );
};

const OrderManagement: React.FC = () => {
  const { canManageOrders, isReadOnly } = usePermissions();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // 搜索筛选（订单号和产品名称）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderCode.toLowerCase().includes(query) ||
        order.productName.toLowerCase().includes(query)
      );
    }

    setFilteredOrders(filtered);
  }, [statusFilter, searchQuery, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSalesOrders();
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      console.error('加载订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    try {
      setUpdating(true);
      await apiService.updateOrderStatus(selectedOrder.id, newStatus, notes);
      await loadOrders();
      setUpdateDialogOpen(false);
      setSelectedOrder(null);
      setNewStatus('');
      setNotes('');
    } catch (error) {
      console.error('更新订单状态失败:', error);
      alert('更新订单状态失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateDialog = (order: SalesOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setNotes(order.notes || '');
    setUpdateDialogOpen(true);
  };

  if (!canManageOrders && !isReadOnly) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">您没有权限访问订单管理</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          订单管理
        </h1>
        <div className="flex items-center gap-2">
          <CreateOrderDialog />
          <Button onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>订单列表</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索订单号或产品名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="筛选状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {ORDER_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">加载中...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">暂无订单数据</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单编号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>总价值</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>订单日期</TableHead>
                  {canManageOrders && <TableHead>操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderCode}</TableCell>
                    <TableCell>{order.productName}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>¥{order.totalValue.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {format(new Date(order.orderDate), 'PPP', { locale: zhCN })}
                    </TableCell>
                    {canManageOrders && (
                      <TableCell>
                        <Dialog open={updateDialogOpen && selectedOrder?.id === order.id} onOpenChange={(open) => {
                          if (!open) {
                            setUpdateDialogOpen(false);
                            setSelectedOrder(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(order)}
                            >
                              更新状态
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>更新订单状态</DialogTitle>
                              <DialogDescription>
                                订单编号: {selectedOrder?.orderCode}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>订单状态</Label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择状态" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ORDER_STATUSES.map(status => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>备注</Label>
                                <Textarea
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="添加备注（可选）"
                                  rows={3}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setUpdateDialogOpen(false);
                                  setSelectedOrder(null);
                                }}
                                disabled={updating}
                              >
                                取消
                              </Button>
                              <Button onClick={handleUpdateStatus} disabled={updating}>
                                {updating ? '更新中...' : '确认更新'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>订单统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {ORDER_STATUSES.map(status => {
              const count = orders.filter(o => o.status === status.value).length;
              return (
                <div key={status.value} className="text-center p-4 border rounded-lg">
                  <div className={`text-2xl font-bold ${status.color.replace('bg-', 'text-')}`}>
                    {count}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{status.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderManagement;
