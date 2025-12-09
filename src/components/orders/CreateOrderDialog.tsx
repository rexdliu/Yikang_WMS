import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiService, OrderCreateRequest } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export const CreateOrderDialog = () => {
  const [open, setOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();

  // 表单状态
  const [distributorId, setDistributorId] = useState<number>(0);
  const [productId, setProductId] = useState<number>(0);
  const [productName, setProductName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');

  // 自动计算总金额
  const totalValue = quantity * unitPrice;

  // 获取经销商列表
  const { data: distributors, isLoading: distributorsLoading } = useQuery({
    queryKey: ['distributors'],
    queryFn: () => apiService.getDistributors(),
  });

  // 获取产品列表
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiService.getProducts(),
  });

  // 获取仓库列表
  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiService.getWarehouses(),
  });

  // 创建订单 mutation
  const createMutation = useMutation({
    mutationFn: (data: OrderCreateRequest) => apiService.createOrder(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: '订单创建成功',
        description: `订单号: ${result.orderCode}`,
      });
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: '创建失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setDistributorId(0);
    setProductId(0);
    setProductName('');
    setQuantity(1);
    setUnitPrice(0);
    setDeliveryDate('');
    setWarehouseId(undefined);
    setNotes('');
  };

  const handleProductSelect = (product: any) => {
    setProductId(product.id);
    setProductName(product.name);
    setUnitPrice(product.price);
    setProductSearchOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    if (!distributorId || !productId || quantity <= 0 || unitPrice <= 0) {
      toast({
        title: '验证失败',
        description: '请填写所有必填字段，且数量和价格必须大于0',
        variant: 'destructive',
      });
      return;
    }

    const orderData: OrderCreateRequest = {
      distributor_id: distributorId,
      product_id: productId,
      product_name: productName,
      quantity,
      unit_price: unitPrice,
      total_value: totalValue,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: deliveryDate || undefined,
      warehouse_id: warehouseId,
      notes: notes || undefined,
    };

    createMutation.mutate(orderData);
  };

  // 如果没有编辑权限，不显示按钮
  if (!canEdit) {
    return null;
  }

  const selectedDistributor = distributors?.find((d) => d.id === distributorId);
  const selectedProduct = products?.find((p) => p.id === productId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新建订单
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新建销售订单</DialogTitle>
            <DialogDescription>
              创建新的销售订单。订单号将自动生成。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 经销商选择 */}
            <div className="space-y-2">
              <Label htmlFor="distributor">
                经销商 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={distributorId ? distributorId.toString() : ''}
                onValueChange={(value) => setDistributorId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择经销商" />
                </SelectTrigger>
                <SelectContent>
                  {distributorsLoading ? (
                    <SelectItem value="loading" disabled>
                      加载中...
                    </SelectItem>
                  ) : (
                    distributors?.map((dist) => (
                      <SelectItem key={dist.id} value={dist.id.toString()}>
                        {dist.name} - {dist.region}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedDistributor && (
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">联系人: {selectedDistributor.contactPerson}</Badge>
                  <Badge variant="outline">电话: {selectedDistributor.phone}</Badge>
                </div>
              )}
            </div>

            {/* 产品选择（可搜索） */}
            <div className="space-y-2">
              <Label htmlFor="product">
                产品 <span className="text-red-500">*</span>
              </Label>
              <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedProduct ? (
                      <span>
                        {selectedProduct.name} ({selectedProduct.sku})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">选择产品...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索产品名称或SKU..." />
                    <CommandEmpty>未找到产品</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {productsLoading ? (
                        <CommandItem disabled>加载中...</CommandItem>
                      ) : (
                        products?.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.name} ${product.sku}`}
                            onSelect={() => handleProductSelect(product)}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{product.name}</span>
                              <span className="text-sm text-muted-foreground">
                                SKU: {product.sku} | 价格: ¥{product.price.toFixed(2)}
                              </span>
                            </div>
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedProduct && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">单价:</span>{' '}
                        <span className="font-medium">¥{selectedProduct.price.toFixed(2)}</span>
                      </div>
                      {selectedProduct.description && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">描述:</span>{' '}
                          <span>{selectedProduct.description}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 数量和单价 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  数量 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_price">
                  单价 (¥) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            {/* 总金额显示 */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">订单总金额:</span>
                <span className="text-2xl font-bold text-primary">
                  ¥{totalValue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* 预期交货日期 */}
            <div className="space-y-2">
              <Label htmlFor="delivery_date">预期交货日期</Label>
              <Input
                id="delivery_date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* 出货仓库 */}
            <div className="space-y-2">
              <Label htmlFor="warehouse">出货仓库</Label>
              <Select
                value={warehouseId ? warehouseId.toString() : ''}
                onValueChange={(value) => setWarehouseId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择仓库（可选）" />
                </SelectTrigger>
                <SelectContent>
                  {warehousesLoading ? (
                    <SelectItem value="loading" disabled>
                      加载中...
                    </SelectItem>
                  ) : (
                    warehouses?.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id.toString()}>
                        {wh.name} {wh.location && `- ${wh.location}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="输入订单备注..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建订单
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
