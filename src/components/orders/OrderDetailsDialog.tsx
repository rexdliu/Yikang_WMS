/**
 * 订单详情对话框
 * 
 * 点击订单编号时显示订单的完整信息：
 * - 订单基本信息
 * - 经销商信息
 * - 交付人信息
 * - 仓库信息
 */
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiService, type SalesOrder, type Distributor, type DeliveryPerson } from '@/services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
    Package,
    User,
    Phone,
    Mail,
    MapPin,
    Truck,
    Building2,
    Calendar,
    Hash,
    CreditCard
} from 'lucide-react';

interface Warehouse {
    id: number;
    name: string;
    code?: string;
    location?: string;
    manager_name?: string;
    phone?: string;
}

interface OrderDetailsDialogProps {
    order: SalesOrder | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: '待处理', color: 'bg-yellow-500' },
    processing: { label: '处理中', color: 'bg-blue-500' },
    shipped: { label: '已发货', color: 'bg-purple-500' },
    completed: { label: '已完成', color: 'bg-green-500' },
    cancelled: { label: '已取消', color: 'bg-red-500' },
};

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
    order,
    open,
    onOpenChange,
}) => {
    const [distributor, setDistributor] = useState<Distributor | null>(null);
    const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPerson | null>(null);
    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && order) {
            loadDetails();
        }
    }, [open, order]);

    const loadDetails = async () => {
        if (!order) return;

        setLoading(true);
        try {
            // 加载经销商信息
            const distributors = await apiService.getDistributors();
            const foundDistributor = distributors.find(d => d.id === order.distributorId);
            setDistributor(foundDistributor || null);

            // 加载交付人信息
            if (order.deliveryPersonId) {
                const deliveryPersons = await apiService.getDeliveryPersons();
                const foundDeliveryPerson = deliveryPersons.find(p => p.id === order.deliveryPersonId);
                setDeliveryPerson(foundDeliveryPerson || null);
            } else {
                setDeliveryPerson(null);
            }

            // 加载仓库信息
            if (order.warehouseId) {
                const warehouses = await apiService.getWarehouses();
                const foundWarehouse = warehouses.find((w: Warehouse) => w.id === order.warehouseId);
                setWarehouse(foundWarehouse || null);
            } else {
                setWarehouse(null);
            }
        } catch (error) {
            console.error('加载订单详情失败:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!order) return null;

    const statusConfig = ORDER_STATUS_LABELS[order.status] || ORDER_STATUS_LABELS.pending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        订单详情
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 订单基本信息 */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                订单信息
                            </h3>
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div>
                                    <span className="text-sm text-muted-foreground">订单编号</span>
                                    <p className="font-medium">{order.orderCode}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">状态</span>
                                    <p>
                                        <Badge className={`${statusConfig.color} text-white`}>
                                            {statusConfig.label}
                                        </Badge>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">产品名称</span>
                                    <p className="font-medium">{order.productName}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">数量</span>
                                    <p className="font-medium">{order.quantity}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">单价</span>
                                    <p className="font-medium">¥{order.unitPrice?.toFixed(2) || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">总金额</span>
                                    <p className="font-medium text-primary">¥{order.totalValue.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">订单日期</span>
                                    <p className="font-medium flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(order.orderDate), 'PPP', { locale: zhCN })}
                                    </p>
                                </div>
                                {order.deliveryDate && (
                                    <div>
                                        <span className="text-sm text-muted-foreground">交货日期</span>
                                        <p className="font-medium">
                                            {format(new Date(order.deliveryDate), 'PPP', { locale: zhCN })}
                                        </p>
                                    </div>
                                )}
                                {order.notes && (
                                    <div className="col-span-2">
                                        <span className="text-sm text-muted-foreground">备注</span>
                                        <p className="font-medium">{order.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* 经销商信息 */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                经销商信息
                            </h3>
                            {distributor ? (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div>
                                        <span className="text-sm text-muted-foreground">经销商名称</span>
                                        <p className="font-medium">{distributor.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">联系人</span>
                                        <p className="font-medium flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            {distributor.contactPerson}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">电话</span>
                                        <p className="font-medium flex items-center gap-1">
                                            <Phone className="h-4 w-4" />
                                            {distributor.phone}
                                        </p>
                                    </div>
                                    {distributor.email && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">邮箱</span>
                                            <p className="font-medium flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                {distributor.email}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-sm text-muted-foreground">区域</span>
                                        <p className="font-medium flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            {distributor.region}
                                        </p>
                                    </div>
                                    {distributor.address && (
                                        <div className="col-span-2">
                                            <span className="text-sm text-muted-foreground">地址</span>
                                            <p className="font-medium">{distributor.address}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground p-4 bg-muted/50 rounded-lg">
                                    暂无经销商信息
                                </p>
                            )}
                        </div>

                        <Separator />

                        {/* 交付人信息 */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                交付人信息
                            </h3>
                            {deliveryPerson ? (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div>
                                        <span className="text-sm text-muted-foreground">交付人姓名</span>
                                        <p className="font-medium flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            {deliveryPerson.name}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">电话</span>
                                        <p className="font-medium flex items-center gap-1">
                                            <Phone className="h-4 w-4" />
                                            {deliveryPerson.phone}
                                        </p>
                                    </div>
                                    {deliveryPerson.vehicleNumber && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">车牌号</span>
                                            <p className="font-medium flex items-center gap-1">
                                                <CreditCard className="h-4 w-4" />
                                                {deliveryPerson.vehicleNumber}
                                            </p>
                                        </div>
                                    )}
                                    {deliveryPerson.email && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">邮箱</span>
                                            <p className="font-medium flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                {deliveryPerson.email}
                                            </p>
                                        </div>
                                    )}
                                    {deliveryPerson.destination && (
                                        <div className="col-span-2">
                                            <span className="text-sm text-muted-foreground">常用目的地</span>
                                            <p className="font-medium">{deliveryPerson.destination}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground p-4 bg-muted/50 rounded-lg">
                                    暂无交付人信息
                                </p>
                            )}
                        </div>

                        <Separator />

                        {/* 仓库信息 */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                出库仓库
                            </h3>
                            {warehouse ? (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                    <div>
                                        <span className="text-sm text-muted-foreground">仓库名称</span>
                                        <p className="font-medium">{warehouse.name}</p>
                                    </div>
                                    {warehouse.code && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">仓库代码</span>
                                            <p className="font-medium">{warehouse.code}</p>
                                        </div>
                                    )}
                                    {warehouse.location && (
                                        <div className="col-span-2">
                                            <span className="text-sm text-muted-foreground">位置</span>
                                            <p className="font-medium flex items-center gap-1">
                                                <MapPin className="h-4 w-4" />
                                                {warehouse.location}
                                            </p>
                                        </div>
                                    )}
                                    {warehouse.manager_name && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">仓库管理员</span>
                                            <p className="font-medium">{warehouse.manager_name}</p>
                                        </div>
                                    )}
                                    {warehouse.phone && (
                                        <div>
                                            <span className="text-sm text-muted-foreground">联系电话</span>
                                            <p className="font-medium">{warehouse.phone}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground p-4 bg-muted/50 rounded-lg">
                                    暂无仓库信息
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
