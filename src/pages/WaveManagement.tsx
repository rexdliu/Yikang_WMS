/**
 * 波次管理页面
 * 
 * 功能：
 * 1. 显示波次列表
 * 2. 自动生成波次
 * 3. 释放/完成波次
 * 4. 查看波次包含的订单
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiService, Wave, WaveWithOrders } from '@/services/api';
import { Layers, RefreshCw, Play, CheckCircle, Package, Clock, AlertTriangle } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const WAVE_STATUSES = [
    { value: 'pending', label: '待处理', color: 'bg-yellow-500' },
    { value: 'processing', label: '执行中', color: 'bg-blue-500' },
    { value: 'completed', label: '已完成', color: 'bg-green-500' },
    { value: 'cancelled', label: '已取消', color: 'bg-red-500' },
];

const getStatusBadge = (status: string) => {
    const statusInfo = WAVE_STATUSES.find(s => s.value === status);
    return (
        <Badge className={`${statusInfo?.color || 'bg-gray-500'} text-white`}>
            {statusInfo?.label || status}
        </Badge>
    );
};

const WaveManagement: React.FC = () => {
    const { toast } = useToast();
    const [waves, setWaves] = useState<Wave[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // 波次详情弹窗
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedWave, setSelectedWave] = useState<WaveWithOrders | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // 订单详情弹窗
    const [orderDetailOpen, setOrderDetailOpen] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<{
        id: number;
        orderCode: string;
        productName: string;
        quantity: number;
        status: string;
        distributorName?: string;
        warehouseName?: string;
        orderDate?: string;
        notes?: string;
    } | null>(null);

    // 待处理订单池 (左右布局)
    const [pendingOrders, setPendingOrders] = useState<Array<{
        id: number;
        orderCode: string;
        productName: string;
        distributorName: string;
        warehouseId: number;
        warehouseName: string;
    }>>([]);
    const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // 筛选条件
    const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
    const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);

    useEffect(() => {
        loadWaves();
        loadPendingOrders();
        loadWarehouses();
    }, [statusFilter]);

    // 自动刷新 (每30秒)
    useEffect(() => {
        const interval = setInterval(() => {
            loadWaves();
            loadPendingOrders();
        }, 30000);
        return () => clearInterval(interval);
    }, [statusFilter, warehouseFilter]);

    const loadWaves = async () => {
        try {
            setLoading(true);
            const status = statusFilter === 'all' ? undefined : statusFilter;
            const data = await apiService.getWaves(status);
            setWaves(data);
        } catch (error) {
            toast({
                title: '加载失败',
                description: '无法加载波次列表',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadWarehouses = async () => {
        try {
            const data = await apiService.getWarehouses();
            setWarehouses(data.map(w => ({ id: w.id, name: w.name })));
        } catch (error) {
            console.error('加载仓库失败:', error);
        }
    };

    const loadPendingOrders = async () => {
        try {
            setLoadingOrders(true);
            // 获取待处理且未分配波次的订单
            const orders = await apiService.getSalesOrders();
            const filtered = orders
                .filter((o: any) => o.status === 'pending')  // 待处理
                .filter((o: any) => !o.waveId)  // 未分配波次的
                .filter((o: any) => warehouseFilter === 'all' || o.warehouseId === parseInt(warehouseFilter))
                .map((o: any) => ({
                    id: o.id,
                    orderCode: o.orderCode,
                    productName: o.productName,
                    distributorName: o.distributorName,
                    warehouseId: o.warehouseId,
                    warehouseName: warehouses.find(w => w.id === o.warehouseId)?.name || '未知仓库',
                }));
            setPendingOrders(filtered);
        } catch (error) {
            console.error('加载待处理订单失败:', error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleCreateWaveFromSelected = async () => {
        if (selectedOrderIds.length === 0) {
            toast({
                title: '请选择订单',
                description: '请先选择要加入波次的订单',
                variant: 'destructive',
            });
            return;
        }

        // 检查是否跨仓库
        const selectedOrders = pendingOrders.filter(o => selectedOrderIds.includes(o.id));
        const warehouseIds = new Set(selectedOrders.map(o => o.warehouseId));

        if (warehouseIds.size > 1) {
            toast({
                title: '跨仓库订单',
                description: '选中的订单来自不同仓库，将按仓库自动分组生成多个波次',
            });
        }

        try {
            setGenerating(true);
            const newWaves = await apiService.generateWaves({
                orderIds: selectedOrderIds,
                maxOrdersPerWave: 50,
            });

            toast({
                title: '波次生成成功',
                description: `已生成 ${newWaves.length} 个波次`,
            });

            setSelectedOrderIds([]);
            loadWaves();
            loadPendingOrders();
        } catch (error: any) {
            toast({
                title: '生成失败',
                description: error.message || '无法生成波次',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };


    const handleGenerateWaves = async () => {
        try {
            setGenerating(true);
            const newWaves = await apiService.generateWaves({
                maxOrdersPerWave: 50,
            });

            if (newWaves.length === 0) {
                toast({
                    title: '没有待处理订单',
                    description: '当前没有可以生成波次的订单',
                });
            } else {
                toast({
                    title: '波次生成成功',
                    description: `已生成 ${newWaves.length} 个波次`,
                });
                loadWaves();
            }
        } catch (error) {
            toast({
                title: '生成失败',
                description: '无法自动生成波次',
                variant: 'destructive',
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleRelease = async (waveId: number) => {
        try {
            await apiService.releaseWave(waveId);
            toast({
                title: '波次已释放',
                description: '订单开始处理',
            });
            loadWaves();
        } catch (error) {
            toast({
                title: '释放失败',
                variant: 'destructive',
            });
        }
    };

    const handleComplete = async (waveId: number) => {
        try {
            await apiService.completeWave(waveId);
            toast({
                title: '波次已完成',
            });
            loadWaves();
        } catch (error) {
            toast({
                title: '完成失败',
                variant: 'destructive',
            });
        }
    };

    const openDetails = async (waveId: number) => {
        try {
            setLoadingDetails(true);
            setDetailsOpen(true);
            const data = await apiService.getWave(waveId);
            setSelectedWave(data);
        } catch (error) {
            toast({
                title: '加载详情失败',
                variant: 'destructive',
            });
        } finally {
            setLoadingDetails(false);
        }
    };

    const filteredWaves = waves;

    // 统计
    const stats = {
        total: waves.length,
        pending: waves.filter(w => w.status === 'pending').length,
        processing: waves.filter(w => w.status === 'processing').length,
        completed: waves.filter(w => w.status === 'completed').length,
    };

    return (
        <div className="space-y-6 p-6">
            {/* 页面头部 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Layers className="h-6 w-6" />
                        波次管理
                    </h1>
                    <p className="text-muted-foreground">订单批量处理与拣货管理</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadWaves} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        刷新
                    </Button>
                    <Button onClick={handleGenerateWaves} disabled={generating}>
                        <Play className="mr-2 h-4 w-4" />
                        {generating ? '生成中...' : '自动生成波次'}
                    </Button>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">总波次</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <Layers className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">待处理</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">执行中</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">已完成</p>
                                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 左右布局: 筛选规则 + 待处理订单池 */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 左侧: 筛选规则 */}
                <Card className="lg:col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">筛选规则</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">仓库</label>
                            <Select value={warehouseFilter} onValueChange={(v) => {
                                setWarehouseFilter(v);
                                loadPendingOrders();
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择仓库" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部仓库</SelectItem>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            className="w-full"
                            onClick={handleCreateWaveFromSelected}
                            disabled={generating || selectedOrderIds.length === 0}
                        >
                            <Play className="mr-2 h-4 w-4" />
                            生成波次 ({selectedOrderIds.length})
                        </Button>
                    </CardContent>
                </Card>

                {/* 右侧: 待处理订单池 */}
                <Card className="lg:col-span-3">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                待处理订单池
                                {loadingOrders && <RefreshCw className="h-4 w-4 animate-spin" />}
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (selectedOrderIds.length === pendingOrders.length) {
                                            setSelectedOrderIds([]);
                                        } else {
                                            setSelectedOrderIds(pendingOrders.map(o => o.id));
                                        }
                                    }}
                                >
                                    {selectedOrderIds.length === pendingOrders.length ? '取消全选' : '全选'}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {pendingOrders.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">暂无待处理订单</p>
                        ) : (
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {pendingOrders.map(order => (
                                    <div
                                        key={order.id}
                                        className={`flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-accent ${selectedOrderIds.includes(order.id) ? 'bg-accent border-primary' : ''
                                            }`}
                                        onClick={() => {
                                            if (selectedOrderIds.includes(order.id)) {
                                                setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                                            } else {
                                                setSelectedOrderIds([...selectedOrderIds, order.id]);
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedOrderIds.includes(order.id)}
                                            onChange={() => { }}
                                            className="h-4 w-4"
                                        />
                                        <Button
                                            variant="link"
                                            className="p-0 h-auto font-mono text-sm text-blue-600 hover:underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOrderDetail({
                                                    id: order.id,
                                                    orderCode: order.orderCode,
                                                    productName: order.productName,
                                                    quantity: 0,
                                                    status: 'pending',
                                                    distributorName: order.distributorName,
                                                    warehouseName: order.warehouseName,
                                                });
                                                setOrderDetailOpen(true);
                                            }}
                                        >
                                            {order.orderCode}
                                        </Button>
                                        <span className="text-sm truncate flex-1">{order.productName}</span>
                                        <Badge variant="outline" className="text-xs">{order.warehouseName}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 波次列表 */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle>波次列表</CardTitle>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="筛选状态" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部状态</SelectItem>
                                {WAVE_STATUSES.map(status => (
                                    <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">加载中...</div>
                    ) : filteredWaves.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            暂无波次数据
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>波次号</TableHead>
                                    <TableHead>订单数</TableHead>
                                    <TableHead>总数量</TableHead>
                                    <TableHead>优先级</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>创建时间</TableHead>
                                    <TableHead>操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredWaves.map(wave => (
                                    <TableRow key={wave.id}>
                                        <TableCell
                                            className="font-medium cursor-pointer text-blue-600 hover:underline"
                                            onClick={() => openDetails(wave.id)}
                                        >
                                            {wave.waveCode}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Package className="h-4 w-4" />
                                                {wave.orderCount}
                                            </div>
                                        </TableCell>
                                        <TableCell>{wave.totalQuantity}</TableCell>
                                        <TableCell>
                                            <Badge variant={wave.priority === 'urgent' ? 'destructive' : 'secondary'}>
                                                {wave.priority === 'urgent' ? '加急' : '普通'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(wave.status)}</TableCell>
                                        <TableCell>
                                            {format(new Date(wave.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {wave.status === 'pending' && (
                                                    <Button size="sm" onClick={() => handleRelease(wave.id)}>
                                                        释放
                                                    </Button>
                                                )}
                                                {wave.status === 'processing' && (
                                                    <Button size="sm" variant="outline" onClick={() => handleComplete(wave.id)}>
                                                        完成
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* 波次详情弹窗 */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>波次详情 - {selectedWave?.waveCode}</DialogTitle>
                        <DialogDescription>
                            包含 {selectedWave?.orderCount} 个订单
                        </DialogDescription>
                    </DialogHeader>
                    {loadingDetails ? (
                        <div className="text-center py-8">加载中...</div>
                    ) : selectedWave ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">状态</p>
                                    <p>{getStatusBadge(selectedWave.status)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">优先级</p>
                                    <p>{selectedWave.priority === 'urgent' ? '加急' : '普通'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">总商品数量</p>
                                    <p className="font-medium">{selectedWave.totalQuantity}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">创建时间</p>
                                    <p>{format(new Date(selectedWave.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">订单列表</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>订单号</TableHead>
                                            <TableHead>产品</TableHead>
                                            <TableHead>数量</TableHead>
                                            <TableHead>状态</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedWave.orders.map(order => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono">
                                                    <Button
                                                        variant="link"
                                                        className="p-0 h-auto text-blue-600 hover:underline"
                                                        onClick={() => {
                                                            setSelectedOrderDetail({
                                                                id: order.id,
                                                                orderCode: order.orderCode,
                                                                productName: order.productName,
                                                                quantity: order.quantity,
                                                                status: order.status,
                                                            });
                                                            setOrderDetailOpen(true);
                                                        }}
                                                    >
                                                        {order.orderCode}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{order.productName}</TableCell>
                                                <TableCell>{order.quantity}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{order.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            {/* 订单详情弹窗 */}
            <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>订单详情</DialogTitle>
                        <DialogDescription>订单号: {selectedOrderDetail?.orderCode}</DialogDescription>
                    </DialogHeader>
                    {selectedOrderDetail && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">产品名称</p>
                                    <p className="font-medium">{selectedOrderDetail.productName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">数量</p>
                                    <p className="font-medium">{selectedOrderDetail.quantity}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">状态</p>
                                    <Badge variant="outline">{selectedOrderDetail.status}</Badge>
                                </div>
                                {selectedOrderDetail.distributorName && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">经销商</p>
                                        <p className="font-medium">{selectedOrderDetail.distributorName}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WaveManagement;
