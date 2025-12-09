/**
 * 库存管理页面
 *
 * 功能：
 * 1. 显示所有库存项目列表
 * 2. 按仓库筛选库存
 * 3. 显示低库存警报
 * 4. 调整库存数量（仅管理员和仓库管理员）
 * 5. 权限控制
 */

import React, { useState, useEffect } from 'react';
import { apiService, type InventoryItem, type Product } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Warehouse, RefreshCw, Filter, AlertTriangle, Package, Search, Image as ImageIcon } from 'lucide-react';
import { CreateProductDialog } from '@/components/products/CreateProductDialog';
interface InventoryWithDetails extends InventoryItem {
  productName?: string;
  productSku?: string;
  warehouseName?: string;
  minStockLevel?: number;
}

const InventoryManagement: React.FC = () => {
  const { canManageInventory, isReadOnly } = usePermissions();
  const [inventory, setInventory] = useState<InventoryWithDetails[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{id: number, name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all'); // all, low, out
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryWithDetails | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  // 图片预览状态
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = [...inventory];

    // 仓库筛选
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(item => item.warehouseId === parseInt(warehouseFilter));
    }

    // 库存状态筛选
    if (stockFilter === 'low') {
      filtered = filtered.filter(item =>
        item.minStockLevel !== undefined &&
        item.quantity > 0 &&
        item.quantity <= item.minStockLevel
      );
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(item => item.quantity === 0);
    }

    // 搜索筛选（SKU和产品名称）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.productSku && item.productSku.toLowerCase().includes(query)) ||
        (item.productName && item.productName.toLowerCase().includes(query))
      );
    }

    setFilteredInventory(filtered);
  }, [warehouseFilter, stockFilter, searchQuery, inventory]);

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

      // 合并库存数据和产品信息
      const enrichedInventory = inventoryData.map(item => {
        const product = productsData.find(p => p.id === item.productId);
        const warehouse = warehousesData.find(w => w.id === item.warehouseId);
        return {
          ...item,
          productName: product?.name,
          productSku: product?.sku,
          warehouseName: warehouse?.name,
          minStockLevel: 10, // TODO: 从产品模型获取
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

  const handleUpdateQuantity = async () => {
    if (!selectedItem || newQuantity < 0) return;

    try {
      setUpdating(true);
      await apiService.updateInventoryQuantity(selectedItem.id, newQuantity);
      await loadData();
      setUpdateDialogOpen(false);
      setSelectedItem(null);
      setNewQuantity(0);
    } catch (error) {
      console.error('更新库存数量失败:', error);
      alert('更新库存数量失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateDialog = (item: InventoryWithDetails) => {
    setSelectedItem(item);
    setNewQuantity(item.quantity);
    setUpdateDialogOpen(true);
  };

  // 处理点击SKU查看产品图片
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

  const lowStockCount = inventory.filter(item =>
    item.minStockLevel !== undefined &&
    item.quantity > 0 &&
    item.quantity <= item.minStockLevel
  ).length;

  const outOfStockCount = inventory.filter(item => item.quantity === 0).length;

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
          <CreateProductDialog />
          <Button onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 警报卡片 */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              库存警报
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {lowStockCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500 text-white">{lowStockCount}</Badge>
                  <span className="text-sm">项低库存</span>
                </div>
              )}
              {outOfStockCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{outOfStockCount}</Badge>
                  <span className="text-sm">项缺货</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>库存列表</CardTitle>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索SKU或产品名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="筛选仓库" />
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
                <Select value={stockFilter} onValueChange={setStockFilter}>
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
                        <Dialog open={updateDialogOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                          if (!open) {
                            setUpdateDialogOpen(false);
                            setSelectedItem(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(item)}
                            >
                              调整库存
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>调整库存数量</DialogTitle>
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
                                  <Label className="text-sm text-muted-foreground">预留库存</Label>
                                  <div className="text-2xl font-bold">{selectedItem?.reservedQuantity}</div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>新库存数量</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={newQuantity}
                                  onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                                  placeholder="输入新的库存数量"
                                />
                              </div>
                              {newQuantity !== selectedItem?.quantity && (
                                <div className="p-3 bg-muted rounded-lg">
                                  <div className="text-sm">
                                    变化: {newQuantity - (selectedItem?.quantity || 0) > 0 ? '+' : ''}
                                    {newQuantity - (selectedItem?.quantity || 0)}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setUpdateDialogOpen(false);
                                  setSelectedItem(null);
                                }}
                                disabled={updating}
                              >
                                取消
                              </Button>
                              <Button onClick={handleUpdateQuantity} disabled={updating}>
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
          <CardTitle>库存统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{inventory.length}</div>
              <div className="text-sm text-muted-foreground mt-1">总库存项</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {inventory.filter(i =>
                  i.minStockLevel !== undefined && i.quantity > i.minStockLevel
                ).length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">正常库存</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
              <div className="text-sm text-muted-foreground mt-1">低库存</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
              <div className="text-sm text-muted-foreground mt-1">缺货</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  onError={(e) => {
                    // 图片加载失败时显示占位符
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted">
                          <svg class="w-16 h-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p class="text-muted-foreground">图片加载失败</p>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted">
                <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">该产品暂无图片</p>
              </div>
            )}

            {/* 产品详细信息 */}
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
                  <p className="font-medium">${selectedProductForImage.price.toLocaleString()}</p>
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
                {selectedProductForImage.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">描述</p>
                    <p className="text-sm">{selectedProductForImage.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
