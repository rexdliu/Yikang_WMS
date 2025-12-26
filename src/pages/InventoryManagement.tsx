/**
 * 库存管理页面
 *
 * 功能：
 * 1. 显示所有库存项目列表
 * 2. 按仓库筛选库存（顶部统计区域）
 * 3. 显示低库存警报
 * 4. 产品入库操作（仅管理员和仓库管理员）
 * 5. 权限控制
 * 
 * 注意：出库操作通过订单管理实现
 */

import React, { useState, useEffect } from 'react';
import { apiService, type InventoryItem, type Product } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { useSearchState } from '@/contexts/SearchStateContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Warehouse, RefreshCw, AlertTriangle, Package, Search, Image as ImageIcon, ArrowDownToLine } from 'lucide-react';

interface InventoryWithDetails extends InventoryItem {
  productName?: string;
  productSku?: string;
  warehouseName?: string;
  minStockLevel?: number;
}

const InventoryManagement: React.FC = () => {
  const { canManageInventory, isReadOnly } = usePermissions();
  const { state: searchState, setInventorySearch, setInventoryCategory, setInventoryWarehouse } = useSearchState();

  const [inventory, setInventory] = useState<InventoryWithDetails[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: number, name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // 入库对话框状态
  const [selectedItem, setSelectedItem] = useState<InventoryWithDetails | null>(null);
  const [inboundDialogOpen, setInboundDialogOpen] = useState(false);
  const [transactionQuantity, setTransactionQuantity] = useState<number>(0);
  const [transactionNotes, setTransactionNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  // 图片预览状态
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = [...inventory];

    // 仓库筛选 - 使用 context state
    const warehouseFilter = searchState.inventoryWarehouse || 'all';
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(item => item.warehouseId === parseInt(warehouseFilter));
    }

    // 库存状态筛选 - 使用 context state
    const stockFilter = searchState.inventoryCategory || 'all';
    if (stockFilter === 'low') {
      filtered = filtered.filter(item =>
        item.minStockLevel !== undefined &&
        item.quantity > 0 &&
        item.quantity <= item.minStockLevel
      );
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(item => item.quantity === 0);
    }

    // 搜索筛选 - 使用 context state
    if (searchState.inventorySearch.trim()) {
      const query = searchState.inventorySearch.toLowerCase();
      filtered = filtered.filter(item =>
        (item.productSku && item.productSku.toLowerCase().includes(query)) ||
        (item.productName && item.productName.toLowerCase().includes(query))
      );
    }

    setFilteredInventory(filtered);
  }, [searchState.inventoryWarehouse, searchState.inventoryCategory, searchState.inventorySearch, inventory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inventoryData, productsData, warehousesData] = await Promise.all([
        apiService.getInventoryItems(),
        apiService.getProducts(),
        apiService.getWarehouses(),
      ]);

      setProducts(productsData);
      setWarehouses(warehousesData);

      const enrichedInventory = inventoryData.map(item => {
        const product = productsData.find(p => p.id === item.productId);
        const warehouse = warehousesData.find(w => w.id === item.warehouseId);
        return {
          ...item,
          productName: product?.name,
          productSku: product?.sku,
          warehouseName: warehouse?.name,
          minStockLevel: 10,
        };
      });

      setInventory(enrichedInventory);
      setFilteredInventory(enrichedInventory);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 入库操作
  const handleInbound = async () => {
    if (!selectedItem || transactionQuantity <= 0) return;

    try {
      setUpdating(true);
      const newQuantity = selectedItem.quantity + transactionQuantity;
      await apiService.updateInventoryQuantity(selectedItem.id, newQuantity);
      await loadData();
      setInboundDialogOpen(false);
      resetTransactionForm();
    } catch (error) {
      console.error('入库操作失败:', error);
      alert('入库操作失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  const resetTransactionForm = () => {
    setSelectedItem(null);
    setTransactionQuantity(0);
    setTransactionNotes('');
  };

  const openInboundDialog = (item: InventoryWithDetails) => {
    setSelectedItem(item);
    setTransactionQuantity(0);
    setTransactionNotes('');
    setInboundDialogOpen(true);
  };

  const handleSkuClick = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProductForImage(product);
      setImagePreviewOpen(true);
    }
  };

  const getStockStatus = (item: InventoryWithDetails) => {
    if (item.quantity === 0) {
      return <Badge variant="destructive">缺货</Badge>;
    }
    if (item.minStockLevel !== undefined && item.quantity <= item.minStockLevel) {
      return <Badge className="bg-yellow-500 text-white">低库存</Badge>;
    }
    return <Badge className="bg-green-500 text-white">正常</Badge>;
  };

  const getFilteredStats = () => {
    const warehouseFilter = searchState.inventoryWarehouse || 'all';
    const dataToUse = warehouseFilter === 'all'
      ? inventory
      : inventory.filter(item => item.warehouseId === parseInt(warehouseFilter));

    const total = dataToUse.length;
    const normal = dataToUse.filter(i =>
      i.minStockLevel !== undefined && i.quantity > i.minStockLevel
    ).length;
    const low = dataToUse.filter(item =>
      item.minStockLevel !== undefined &&
      item.quantity > 0 &&
      item.quantity <= item.minStockLevel
    ).length;
    const outOfStock = dataToUse.filter(item => item.quantity === 0).length;

    return { total, normal, low, outOfStock };
  };

  const stats = getFilteredStats();

  if (!canManageInventory && !isReadOnly) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">您没有权限访问库存管理</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Warehouse className="h-8 w-8" />
          库存管理
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 库存统计 - 放在最上面，带仓库筛选 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>库存统计</CardTitle>
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-muted-foreground" />
              <Select value={searchState.inventoryWarehouse || 'all'} onValueChange={setInventoryWarehouse}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择仓库" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部仓库</SelectItem>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground mt-1">总库存项</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.normal}</div>
              <div className="text-sm text-muted-foreground mt-1">正常库存</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.low}</div>
              <div className="text-sm text-muted-foreground mt-1">低库存</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
              <div className="text-sm text-muted-foreground mt-1">缺货</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 警报卡片 */}
      {(stats.low > 0 || stats.outOfStock > 0) && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              库存警报
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {stats.low > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500 text-white">{stats.low}</Badge>
                  <span className="text-sm">项低库存</span>
                </div>
              )}
              {stats.outOfStock > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{stats.outOfStock}</Badge>
                  <span className="text-sm">项缺货</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 库存列表 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>库存列表</CardTitle>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索SKU或产品名称..."
                  value={searchState.inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={searchState.inventoryCategory || 'all'} onValueChange={setInventoryCategory}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="库存状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="low">低库存</SelectItem>
                    <SelectItem value="out">缺货</SelectItem>
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
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">暂无库存数据</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>产品名称</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>仓库</TableHead>
                  <TableHead>当前库存</TableHead>
                  <TableHead>预留库存</TableHead>
                  <TableHead>可用库存</TableHead>
                  <TableHead>状态</TableHead>
                  {canManageInventory && <TableHead>操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName || '-'}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleSkuClick(item.productId)}
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <ImageIcon className="w-3 h-3" />
                        {item.productSku || '-'}
                      </button>
                    </TableCell>
                    <TableCell>{item.warehouseName || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.reservedQuantity}</TableCell>
                    <TableCell className="font-semibold">
                      {item.quantity - item.reservedQuantity}
                    </TableCell>
                    <TableCell>{getStockStatus(item)}</TableCell>
                    {canManageInventory && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openInboundDialog(item)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <ArrowDownToLine className="h-4 w-4 mr-1" />
                          入库
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 提示：出库通过订单管理 */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>提示：</strong>产品出库通过「订单管理」完成。当订单状态变更为"已发货"或"已完成"时，系统会自动扣减对应产品的库存。
          </p>
        </CardContent>
      </Card>

      {/* 入库对话框 */}
      <Dialog open={inboundDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setInboundDialogOpen(false);
          resetTransactionForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <ArrowDownToLine className="h-5 w-5" />
              产品入库
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.productName} - {selectedItem?.warehouseName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">当前库存</Label>
                <div className="text-2xl font-bold">{selectedItem?.quantity}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">入库后库存</Label>
                <div className="text-2xl font-bold text-green-600">
                  {(selectedItem?.quantity || 0) + transactionQuantity}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>入库数量</Label>
              <Input
                type="number"
                min="1"
                value={transactionQuantity || ''}
                onChange={(e) => setTransactionQuantity(parseInt(e.target.value) || 0)}
                placeholder="输入入库数量"
              />
            </div>
            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Textarea
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="入库原因或备注..."
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setInboundDialogOpen(false);
                resetTransactionForm();
              }}
              disabled={updating}
            >
              取消
            </Button>
            <Button
              onClick={handleInbound}
              disabled={updating || transactionQuantity <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {updating ? '处理中...' : '确认入库'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 产品图片预览对话框 */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedProductForImage?.name || '产品图片'}</DialogTitle>
            <DialogDescription>
              {selectedProductForImage?.sku && `SKU: ${selectedProductForImage.sku}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProductForImage?.imageUrl ? (
              <div className="relative w-full flex justify-center">
                <img
                  src={selectedProductForImage.imageUrl}
                  alt={selectedProductForImage.name}
                  className="max-w-full max-h-[500px] object-contain rounded-lg border"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted">
                <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">该产品暂无图片</p>
              </div>
            )}

            {selectedProductForImage && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">产品名称</p>
                  <p className="font-medium">{selectedProductForImage.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-medium">{selectedProductForImage.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">售价</p>
                  <p className="font-medium">¥{selectedProductForImage.price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">状态</p>
                  <p className="font-medium">
                    {selectedProductForImage.isActive ? (
                      <Badge className="bg-green-500">启用</Badge>
                    ) : (
                      <Badge variant="secondary">禁用</Badge>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
