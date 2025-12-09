import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiService, ProductCreateRequest } from '@/services/api';

export const CreateProductDialog = () => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();

  // 表单状态
  const [formData, setFormData] = useState<ProductCreateRequest>({
    name: '',
    sku: '',
    description: '',
    part_number: '',
    engine_model: '',
    manufacturer: 'Cummins',
    category_id: 0,
    price: 0,
    cost: 0,
    unit: 'pcs',
    min_stock_level: 10,
    warehouse_id: 0,
    initial_quantity: 0,
    location_code: '',
    image_url: '',
    is_active: true,
  });

  // 图片上传状态
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // 获取产品分类列表
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiService.getProductCategories(),
  });

  // 获取仓库列表
  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiService.getWarehouses(),
  });

  // 创建产品 mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductCreateRequest) => {
      // 1. 先创建产品
      const product = await apiService.createProduct(data);
      // 2. 如果有图片文件，上传图片
      if (imageFile) {
        try {
          setUploadingImage(true);
          await apiService.uploadProductImage(product.id, imageFile);
        } catch (error) {
          console.error('图片上传失败:', error);
          toast({
            title: '图片上传失败',
            description: '产品已创建，但图片上传失败，请稍后在编辑页面重新上传',
            variant: 'destructive',
          });
        } finally {
          setUploadingImage(false);
        }
      }

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: '创建成功',
        description: imageFile ? '产品和图片已成功创建' : '产品已成功创建',
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
    setFormData({
      name: '',
      sku: '',
      description: '',
      part_number: '',
      engine_model: '',
      manufacturer: 'Cummins',
      category_id: 0,
      price: 0,
      cost: 0,
      unit: 'pcs',
      min_stock_level: 10,
      warehouse_id: 0,
      initial_quantity: 0,
      location_code: '',
      image_url: '',
      is_active: true,
    });
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    if (!formData.name || !formData.sku || !formData.part_number || !formData.category_id || !formData.warehouse_id || formData.price <= 0) {
      toast({
        title: '验证失败',
        description: '请填写所有必填字段（产品名称、SKU、零件号、分类、仓库、售价）',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof ProductCreateRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 处理图片文件选择
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: '格式错误',
        description: '仅支持 JPG, PNG, WEBP 格式',
        variant: 'destructive',
      });
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '文件过大',
        description: '图片大小不能超过 5MB',
        variant: 'destructive',
      });
      return;
    }

    // 设置文件和预览
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 清空URL输入框（优先使用文件上传）
    setFormData((prev) => ({ ...prev, image_url: '' }));
  };

  // 清除图片
  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  // 如果没有编辑权限，不显示按钮
  if (!canEdit) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新增产品
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新增产品</DialogTitle>
            <DialogDescription>
              创建新的产品信息。带 * 的字段为必填项。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 基础信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  产品名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="输入产品名称"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="如: ENG-6BT59-001"
                  required
                />
              </div>
            </div>

            {/* Cummins 特定字段 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="part_number">
                  Cummins 零件号 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => handleInputChange('part_number', e.target.value)}
                  placeholder="如: 6BT5.9-C120"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="engine_model">适用发动机型号</Label>
                <Input
                  id="engine_model"
                  value={formData.engine_model}
                  onChange={(e) => handleInputChange('engine_model', e.target.value)}
                  placeholder="如: 6BT5.9"
                />
              </div>
            </div>

            {/* 分类和制造商 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_id">
                  产品分类 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category_id ? formData.category_id.toString() : ''}
                  onValueChange={(value) => handleInputChange('category_id', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择产品分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>
                        加载中...
                      </SelectItem>
                    ) : (
                      categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.category_id > 0 && categories && (
                  <p className="text-sm text-muted-foreground">
                    {categories.find((c) => c.id === formData.category_id)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">制造商</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                />
              </div>
            </div>

            {/* 价格信息 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  售价 (¥) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ''}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">成本 (¥)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost || ''}
                  onChange={(e) => handleInputChange('cost', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">单位</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => handleInputChange('unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">件 (pcs)</SelectItem>
                    <SelectItem value="box">箱 (box)</SelectItem>
                    <SelectItem value="liter">升 (liter)</SelectItem>
                    <SelectItem value="kg">千克 (kg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 仓库和库存管理 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">仓库和库存</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="warehouse_id">
                    仓库 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.warehouse_id ? formData.warehouse_id.toString() : ''}
                    onValueChange={(value) => handleInputChange('warehouse_id', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择仓库" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesLoading ? (
                        <SelectItem value="loading" disabled>
                          加载中...
                        </SelectItem>
                      ) : (
                        warehouses?.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id.toString()}>
                            {wh.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initial_quantity">初始库存数量</Label>
                  <Input
                    id="initial_quantity"
                    type="number"
                    min="0"
                    value={formData.initial_quantity || 0}
                    onChange={(e) => handleInputChange('initial_quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location_code">货位编号</Label>
                  <Input
                    id="location_code"
                    value={formData.location_code}
                    onChange={(e) => handleInputChange('location_code', e.target.value)}
                    placeholder="如: A-01-03"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">最低库存预警线</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => handleInputChange('min_stock_level', parseInt(e.target.value) || 10)}
                  />
                </div>
              </div>
            </div>

            {/* 产品图片 */}
            <div className="space-y-2">
              <Label>产品图片</Label>
              <p className="text-sm text-muted-foreground">可以上传图片文件或输入图片URL</p>

              {/* 图片预览 */}
              {(imagePreview || formData.image_url) && (
                <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview || formData.image_url}
                    alt="预览"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={handleClearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* 文件上传 */}
              <div className="flex items-center gap-2">
                <Label htmlFor="image-file-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
                    <Upload className="w-4 h-4" />
                    <span>上传图片</span>
                  </div>
                </Label>
                <Input
                  id="image-file-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <span className="text-sm text-muted-foreground">
                  或
                </span>
              </div>

              {/* URL 输入 */}
              <Input
                id="image_url"
                type="url"
                value={formData.image_url}
                onChange={(e) => {
                  handleInputChange('image_url', e.target.value);
                  // 如果输入URL，清除文件上传
                  if (e.target.value) {
                    setImageFile(null);
                    setImagePreview('');
                  }
                }}
                placeholder="https://example.com/image.jpg"
                disabled={!!imageFile}
              />
              {imageFile && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  已选择文件: {imageFile.name}
                </p>
              )}
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">产品描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="输入产品详细描述..."
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
              创建产品
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
