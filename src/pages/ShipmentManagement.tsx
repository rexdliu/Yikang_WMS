/**
 * 运输管理页面 (TMS)
 * 
 * 功能：
 * 1. 显示运输单列表
 * 2. 创建运输单
 * 3. 更新运输状态
 * 4. 查看运输追踪信息
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiService, Shipment, ShipmentTracking, DeliveryPerson, ShipmentWithOrders } from '@/services/api';
import { Truck, RefreshCw, Plus, MapPin, Clock, Package, Navigation, ChevronDown, ChevronRight, Printer } from 'lucide-react';
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
    DialogFooter,
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

const SHIPMENT_STATUSES = [
    { value: 'planned', label: '计划中', color: 'bg-gray-500' },
    { value: 'loading', label: '装货中', color: 'bg-yellow-500' },
    { value: 'in_transit', label: '运输中', color: 'bg-blue-500' },
    { value: 'delivered', label: '已送达', color: 'bg-green-500' },
    { value: 'cancelled', label: '已取消', color: 'bg-red-500' },
];

const getStatusBadge = (status: string) => {
    const statusInfo = SHIPMENT_STATUSES.find(s => s.value === status);
    return (
        <Badge className={`${statusInfo?.color || 'bg-gray-500'} text-white`}>
            {statusInfo?.label || status}
        </Badge>
    );
};

const ShipmentManagement: React.FC = () => {
    const { toast } = useToast();
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // 创建运输单弹窗
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string; location?: string }>>([]);
    const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
    const [pendingOrders, setPendingOrders] = useState<Array<{ id: number; orderCode: string; productName: string }>>([]);

    // 创建表单
    const [formData, setFormData] = useState({
        warehouseId: '',
        deliveryPersonId: '',
        driverInput: '',  // 司机姓名/车牌输入
        destinationAddress: '',
        orderIds: [] as number[],
        notes: '',
    });

    // 仓库改变时清空订单选择
    const handleWarehouseChange = (warehouseId: string) => {
        setFormData(prev => ({
            ...prev,
            warehouseId,
            orderIds: [],  // 清空已选订单
            destinationAddress: '',
        }));
        setRouteInfo(null);
    };

    // 追踪弹窗
    const [trackingOpen, setTrackingOpen] = useState(false);
    const [trackingData, setTrackingData] = useState<ShipmentTracking | null>(null);
    const [loadingTracking, setLoadingTracking] = useState(false);

    // 展开行状态
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [expandedData, setExpandedData] = useState<Record<number, ShipmentWithOrders>>({});
    const [loadingExpand, setLoadingExpand] = useState<number | null>(null);

    // 路线计算状态
    const [routeInfo, setRouteInfo] = useState<{
        origin?: { address: string };
        destinations: Array<{ orderId: number; orderCode: string; address: string; sequence: number }>;
        totalDistanceKm?: number;
        totalEtaMinutes?: number;
    } | null>(null);
    const [calculatingRoute, setCalculatingRoute] = useState(false);

    useEffect(() => {
        loadShipments();
        loadFormData();
    }, [statusFilter]);

    // 当仓库选择改变或弹窗打开时，加载可分配订单
    useEffect(() => {
        if (createOpen && formData.warehouseId) {
            loadAvailableOrders(parseInt(formData.warehouseId));
        } else if (createOpen) {
            // 如果弹窗打开但没选仓库，加载所有可用订单
            loadAvailableOrders();
        }
    }, [createOpen, formData.warehouseId]);

    // 当选中订单或仓库改变时，计算路线
    useEffect(() => {
        const calculateRoute = async () => {
            if (!formData.warehouseId || formData.orderIds.length === 0) {
                setRouteInfo(null);
                return;
            }
            try {
                setCalculatingRoute(true);
                const route = await apiService.calculateRoute(
                    parseInt(formData.warehouseId),
                    formData.orderIds
                );
                setRouteInfo(route);
                // 自动设置目的地为最后一个站点
                if (route.destinations.length > 0) {
                    const lastDest = route.destinations[route.destinations.length - 1];
                    setFormData(prev => ({ ...prev, destinationAddress: lastDest.address }));
                }
            } catch (error) {
                console.error('Route calculation failed:', error);
            } finally {
                setCalculatingRoute(false);
            }
        };
        calculateRoute();
    }, [formData.warehouseId, formData.orderIds]);

    const loadShipments = async () => {
        try {
            setLoading(true);
            const status = statusFilter === 'all' ? undefined : statusFilter;
            const data = await apiService.getShipments(status);
            setShipments(data);
        } catch (error) {
            toast({
                title: '加载失败',
                description: '无法加载运输单列表',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadFormData = async () => {
        try {
            const [wh, dp] = await Promise.all([
                apiService.getWarehouses(),
                apiService.getDeliveryPersons(),
            ]);
            setWarehouses(wh);
            setDeliveryPersons(dp);
        } catch (error) {
            console.error('Failed to load form data:', error);
        }
    };

    // 加载可分配运输单的订单（已释放波次且未分配运输单）
    const loadAvailableOrders = async (warehouseId?: number) => {
        try {
            const orders = await apiService.getOrdersAvailableForShipment(warehouseId);
            setPendingOrders(
                orders.map(o => ({ id: o.id, orderCode: o.orderCode, productName: o.productName }))
            );
        } catch (error) {
            console.error('Failed to load available orders:', error);
            setPendingOrders([]);
        }
    };

    const handleCreate = async () => {
        if (!formData.warehouseId || !formData.destinationAddress || formData.orderIds.length === 0) {
            toast({
                title: '请填写必填项',
                description: '仓库、目的地和订单为必填',
                variant: 'destructive',
            });
            return;
        }

        try {
            setCreating(true);
            await apiService.createShipment({
                originWarehouseId: parseInt(formData.warehouseId),
                deliveryPersonId: formData.deliveryPersonId ? parseInt(formData.deliveryPersonId) : undefined,
                destinationAddress: formData.destinationAddress,
                orderIds: formData.orderIds,
                notes: formData.notes,
            });

            toast({
                title: '运输单创建成功',
                description: '已自动计算距离和预计到达时间',
            });

            setCreateOpen(false);
            setFormData({
                warehouseId: '',
                deliveryPersonId: '',
                driverInput: '',
                destinationAddress: '',
                orderIds: [],
                notes: '',
            });
            loadShipments();
        } catch (error) {
            toast({
                title: '创建失败',
                variant: 'destructive',
            });
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateStatus = async (shipmentId: number, newStatus: string) => {
        try {
            await apiService.updateShipmentStatus(shipmentId, newStatus);
            toast({
                title: '状态已更新',
            });
            loadShipments();
        } catch (error) {
            toast({
                title: '更新失败',
                variant: 'destructive',
            });
        }
    };

    const openTracking = async (shipmentId: number) => {
        try {
            setLoadingTracking(true);
            setTrackingOpen(true);
            const data = await apiService.getShipmentTracking(shipmentId);
            setTrackingData(data);
        } catch (error) {
            toast({
                title: '加载追踪信息失败',
                variant: 'destructive',
            });
        } finally {
            setLoadingTracking(false);
        }
    };

    const toggleOrderSelection = (orderId: number) => {
        setFormData(prev => ({
            ...prev,
            orderIds: prev.orderIds.includes(orderId)
                ? prev.orderIds.filter(id => id !== orderId)
                : [...prev.orderIds, orderId],
        }));
    };

    // 展开/收起行
    const toggleRowExpand = async (shipmentId: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(shipmentId)) {
            newExpanded.delete(shipmentId);
        } else {
            newExpanded.add(shipmentId);
            // 加载订单数据
            if (!expandedData[shipmentId]) {
                try {
                    setLoadingExpand(shipmentId);
                    const data = await apiService.getShipment(shipmentId);
                    setExpandedData(prev => ({ ...prev, [shipmentId]: data }));
                } catch (error) {
                    console.error('加载订单详情失败:', error);
                } finally {
                    setLoadingExpand(null);
                }
            }
        }
        setExpandedRows(newExpanded);
    };

    // 打印运输单
    const handlePrint = (shipment: Shipment) => {
        // 创建打印内容
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>运输单 - ${shipment.shipmentCode}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        h1 { font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                        .info { margin: 10px 0; }
                        .label { font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                        th { background: #f5f5f5; }
                    </style>
                </head>
                <body>
                    <h1>运输单 ${shipment.shipmentCode}</h1>
                    <div class="info"><span class="label">司机：</span>${shipment.deliveryPersonName || '-'}</div>
                    <div class="info"><span class="label">目的地：</span>${shipment.destinationAddress}</div>
                    <div class="info"><span class="label">订单数：</span>${shipment.orderCount} 单</div>
                    <div class="info"><span class="label">预计到达：</span>${shipment.etaMinutes ? shipment.etaMinutes + ' 分钟' : '-'}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    // 获取司机信息（车牌+姓名）
    const getDriverInfo = (shipment: Shipment) => {
        const dp = deliveryPersons.find(d => d.id === shipment.deliveryPersonId);
        if (dp) {
            return dp.vehicleNumber ? `${dp.vehicleNumber} (${dp.name})` : dp.name;
        }
        return shipment.deliveryPersonName || '-';
    };

    // 格式化 ETA
    const formatETA = (shipment: Shipment) => {
        if (shipment.estimatedArrival) {
            return format(new Date(shipment.estimatedArrival), 'MM/dd HH:mm', { locale: zhCN });
        }
        if (shipment.etaMinutes) {
            const hours = Math.floor(shipment.etaMinutes / 60);
            const mins = shipment.etaMinutes % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
        return '-';
    };

    // 统计
    const stats = {
        total: shipments.length,
        inTransit: shipments.filter(s => s.status === 'in_transit').length,
        delivered: shipments.filter(s => s.status === 'delivered').length,
        planned: shipments.filter(s => s.status === 'planned' || s.status === 'loading').length,
    };

    return (
        <div className="space-y-6 p-6">
            {/* 页面头部 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Truck className="h-6 w-6" />
                        运输管理
                    </h1>
                    <p className="text-muted-foreground">TMS - 运输单追踪与管理</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadShipments} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        刷新
                    </Button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        创建运输单
                    </Button>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">总运输单</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <Truck className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">待发货</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.planned}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">运输中</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.inTransit}</p>
                            </div>
                            <Navigation className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">已送达</p>
                                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                            </div>
                            <MapPin className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 运输单列表 */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle>运输单列表</CardTitle>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="筛选状态" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部状态</SelectItem>
                                {SHIPMENT_STATUSES.map(status => (
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
                    ) : shipments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            暂无运输单数据
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>运输单号</TableHead>
                                    <TableHead>车牌/司机</TableHead>
                                    <TableHead>目的地</TableHead>
                                    <TableHead>订单数</TableHead>
                                    <TableHead>创建时间</TableHead>
                                    <TableHead>ETA</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shipments.map(shipment => (
                                    <React.Fragment key={shipment.id}>
                                        <TableRow className={expandedRows.has(shipment.id) ? 'bg-muted/50' : ''}>
                                            <TableCell className="cursor-pointer" onClick={() => toggleRowExpand(shipment.id)}>
                                                {loadingExpand === shipment.id ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : expandedRows.has(shipment.id) ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className="font-medium cursor-pointer text-blue-600 hover:underline"
                                                onClick={() => openTracking(shipment.id)}
                                            >
                                                {shipment.shipmentCode}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{getDriverInfo(shipment)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={shipment.destinationAddress}>
                                                {shipment.destinationAddress}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                                    onClick={() => toggleRowExpand(shipment.id)}
                                                >
                                                    <Package className="h-4 w-4" />
                                                    {shipment.orderCount} 单
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {shipment.createdAt ? format(new Date(shipment.createdAt), 'MM-dd HH:mm', { locale: zhCN }) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    <span>{formatETA(shipment)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => handlePrint(shipment)} title="打印路单">
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    {shipment.status === 'planned' && (
                                                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(shipment.id, 'loading')}>
                                                            装货
                                                        </Button>
                                                    )}
                                                    {shipment.status === 'loading' && (
                                                        <Button size="sm" onClick={() => handleUpdateStatus(shipment.id, 'in_transit')}>
                                                            发车
                                                        </Button>
                                                    )}
                                                    {shipment.status === 'in_transit' && (
                                                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(shipment.id, 'delivered')}>
                                                            送达
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {/* 展开的订单行 */}
                                        {expandedRows.has(shipment.id) && (
                                            <TableRow>
                                                <TableCell colSpan={8} className="bg-muted/30 p-4">
                                                    <div className="ml-6">
                                                        <h4 className="font-medium mb-2 flex items-center gap-2">
                                                            <Package className="h-4 w-4" />
                                                            包含订单
                                                        </h4>
                                                        {expandedData[shipment.id]?.orders && expandedData[shipment.id].orders.length > 0 ? (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>订单号</TableHead>
                                                                        <TableHead>产品名称</TableHead>
                                                                        <TableHead>数量</TableHead>
                                                                        <TableHead>状态</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {expandedData[shipment.id].orders.map(order => (
                                                                        <TableRow key={order.id}>
                                                                            <TableCell className="font-medium">{order.orderCode}</TableCell>
                                                                            <TableCell>{order.productName}</TableCell>
                                                                            <TableCell>{order.quantity}</TableCell>
                                                                            <TableCell>
                                                                                <Badge variant="outline">{order.status}</Badge>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <p className="text-muted-foreground text-sm">暂无订单数据</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* 创建运输单弹窗 */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>创建运输单</DialogTitle>
                        <DialogDescription>
                            选择订单并设置运输信息，系统将自动计算距离和ETA
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>起点仓库 * （必须先选择）</Label>
                                <Select value={formData.warehouseId} onValueChange={handleWarehouseChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择仓库" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map(wh => (
                                            <SelectItem key={wh.id} value={wh.id.toString()}>
                                                {wh.name} {wh.location && `(${wh.location})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>司机姓名/车牌</Label>
                                <div className="relative">
                                    <Input
                                        placeholder="输入或选择司机"
                                        value={formData.driverInput}
                                        onChange={e => setFormData(prev => ({ ...prev, driverInput: e.target.value }))}
                                        list="driver-list"
                                    />
                                    <datalist id="driver-list">
                                        {deliveryPersons.map(dp => (
                                            <option key={dp.id} value={`${dp.name} (${dp.vehicleNumber || '无车牌'})`} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        {/* 路线预览 */}
                        {formData.orderIds.length > 0 && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Navigation className="h-4 w-4" />
                                    配送路线预览（智能排序，可手动调整）
                                    {calculatingRoute && <RefreshCw className="h-3 w-3 animate-spin" />}
                                </Label>
                                <div className="border rounded-md p-3 bg-muted/30">
                                    {routeInfo ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin className="h-4 w-4 text-green-600" />
                                                <span className="font-medium">起点：</span>
                                                <span>{routeInfo.origin?.address}</span>
                                            </div>
                                            {routeInfo.destinations.map((dest, idx) => (
                                                <div key={dest.orderId} className="flex items-center gap-2 text-sm pl-4 group">
                                                    <span className="text-muted-foreground">↓</span>
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                                        站点 {idx + 1}
                                                    </span>
                                                    <span className="font-mono text-xs">{dest.orderCode}</span>
                                                    <span className="truncate max-w-[150px]" title={dest.address}>
                                                        {dest.address}
                                                    </span>
                                                    {/* 手动调整顺序按钮 */}
                                                    <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0"
                                                            disabled={idx === 0}
                                                            onClick={() => {
                                                                // 上移
                                                                const newDests = [...routeInfo.destinations];
                                                                [newDests[idx - 1], newDests[idx]] = [newDests[idx], newDests[idx - 1]];
                                                                setRouteInfo({ ...routeInfo, destinations: newDests });
                                                            }}
                                                        >
                                                            ↑
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0"
                                                            disabled={idx === routeInfo.destinations.length - 1}
                                                            onClick={() => {
                                                                // 下移
                                                                const newDests = [...routeInfo.destinations];
                                                                [newDests[idx], newDests[idx + 1]] = [newDests[idx + 1], newDests[idx]];
                                                                setRouteInfo({ ...routeInfo, destinations: newDests });
                                                            }}
                                                        >
                                                            ↓
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(routeInfo.totalDistanceKm || routeInfo.totalEtaMinutes) && (
                                                <div className="flex items-center gap-4 mt-2 pt-2 border-t text-sm">
                                                    {routeInfo.totalDistanceKm && (
                                                        <span className="flex items-center gap-1">
                                                            <Truck className="h-4 w-4" />
                                                            {routeInfo.totalDistanceKm.toFixed(1)} km
                                                        </span>
                                                    )}
                                                    {routeInfo.totalEtaMinutes && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-4 w-4" />
                                                            {Math.floor(routeInfo.totalEtaMinutes / 60)}h {routeInfo.totalEtaMinutes % 60}m
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-sm">选择仓库和订单后自动计算路线</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>选择订单 * (已选 {formData.orderIds.length} 个)</Label>
                            {!formData.warehouseId ? (
                                <div className="border rounded-md p-4 bg-muted/50 text-center">
                                    <p className="text-muted-foreground text-sm">↑ 请先选择起点仓库</p>
                                </div>
                            ) : (
                                <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
                                    {pendingOrders.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">暂无可分配的订单</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {pendingOrders.map(order => (
                                                <label key={order.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.orderIds.includes(order.id)}
                                                        onChange={() => toggleOrderSelection(order.id)}
                                                        className="rounded"
                                                    />
                                                    <span className="font-mono text-sm">{order.orderCode}</span>
                                                    <span className="text-muted-foreground text-sm">- {order.productName}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>备注</Label>
                            <Textarea
                                placeholder="运输备注..."
                                value={formData.notes}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
                        <Button onClick={handleCreate} disabled={creating}>
                            {creating ? '创建中...' : '创建运输单'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 运输追踪弹窗 */}
            <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>运输追踪 - {trackingData?.shipmentCode}</DialogTitle>
                        <DialogDescription>
                            {trackingData && getStatusBadge(trackingData.status)}
                        </DialogDescription>
                    </DialogHeader>
                    {loadingTracking ? (
                        <div className="text-center py-8">加载中...</div>
                    ) : trackingData ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">起点</p>
                                    <p className="font-medium">{trackingData.originWarehouse}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">终点</p>
                                    <p className="font-medium">{trackingData.destinationAddress}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">司机</p>
                                    <p className="font-medium">{trackingData.deliveryPerson || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">车牌号</p>
                                    <p className="font-medium">{trackingData.vehicleNumber || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">距离</p>
                                    <p className="font-medium">{trackingData.totalDistanceKm ? `${trackingData.totalDistanceKm} km` : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">预计时长</p>
                                    <p className="font-medium">{trackingData.etaMinutes ? `${trackingData.etaMinutes} 分钟` : '-'}</p>
                                </div>
                                {trackingData.departureTime && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">出发时间</p>
                                        <p className="font-medium">{format(new Date(trackingData.departureTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</p>
                                    </div>
                                )}
                                {trackingData.estimatedArrival && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">预计到达</p>
                                        <p className="font-medium">{format(new Date(trackingData.estimatedArrival), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">包含订单 ({trackingData.orders.length})</h4>
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
                                        {trackingData.orders.map((order, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-mono">{order.orderCode}</TableCell>
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
        </div>
    );
};

export default ShipmentManagement;
