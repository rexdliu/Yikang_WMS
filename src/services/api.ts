// src/services/api.ts
// 统一封装后台 API 调用

export interface HealthCheckResponse {
  status: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  price: number;
  cost?: number;
  categoryId?: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  reservedQuantity: number;
  updatedAt?: string;
}


export interface Distributor {
  id: number;
  name: string;
  code?: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  region: string;
  creditLimit?: number;
  isActive?: boolean;
  createdAt: string;
}

export interface DeliveryPerson {
  id: number;
  name: string;
  phone: string;
  email?: string;
  vehicleNumber?: string;
  destination?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SalesOrder {
  id: number;
  orderCode: string;
  distributorId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice?: number;
  totalValue: number;
  orderDate: string;
  status: string;
  warehouseId?: number;
  deliveryPersonId?: number;
  deliveryDate?: string;
  completedAt?: string;
  userId?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RAGQueryResponse {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
  }>;
}

interface ProductDTO {
  id: number;
  name: string;
  sku: string;
  description?: string;
  price: number;
  cost?: number;
  category_id?: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

interface InventoryDTO {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  reserved_quantity: number;
  updated_at?: string;
}

interface DistributorDTO {
  id: number;
  name: string;
  code?: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  region: string;
  credit_limit?: number;
  is_active?: boolean;
  created_at: string;
}

interface DeliveryPersonDTO {
  id: number;
  name: string;
  phone: string;
  email?: string;
  vehicle_number?: string;
  destination?: string;
  is_active: boolean;
  created_at: string;
}

interface SalesOrderDTO {
  id: number;
  order_code: string;
  distributor_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price?: number;
  total_value: number;
  order_date: string;
  status: string;
  warehouse_id?: number;
  delivery_person_id?: number;
  delivery_date?: string;
  completed_at?: string;
  user_id?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface ProductCategoryDTO {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

// Dashboard API 类型定义
export interface DashboardStats {
  total_products: number;
  total_inventory: number;
  low_stock_items: number;
  out_of_stock: number;
  total_warehouses: number;
  pending_orders: number;
  total_inventory_value: number;
}

export interface StockStatus {
  status: string;
  count: number;
  percentage: number;
}

export interface ActivityLog {
  id: number;
  activity_type: string;
  action: string;
  item_name: string;
  user_id?: number;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
}

export interface InventoryAlert {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  warehouse_name: string;
  current_quantity: number;
  min_stock_level: number;
  alert_type: string;
  severity: string;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  sku: string;
  total_sold: number;
  total_revenue: number;
}

export interface WarehouseUtilization {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  capacity: number;
  current_usage: number;
  utilization_rate: number;
}

export interface OrderStatusDistribution {
  status: string;
  count: number;
  total_value: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  stock_status: StockStatus[];
  recent_activities: ActivityLog[];
  inventory_alerts: InventoryAlert[];
  top_products: TopProduct[];
  warehouse_utilization: WarehouseUtilization[];
  order_status_distribution: OrderStatusDistribution[];
}

// Auth API 类型定义
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  full_name?: string;
  role?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  phone?: string;
  full_name?: string;
  role: string;
  avatar_url?: string;
  language?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserProfileUpdate {
  username?: string;
  email?: string;
  phone?: string;
  full_name?: string;
  language?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface WarehouseConfig {
  id: number;
  warehouse_name: string;
  location: string;
  timezone: string;
  temperature_unit: string;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface WarehouseConfigUpdate {
  warehouse_name?: string;
  location?: string;
  timezone?: string;
  temperature_unit?: string;
  low_stock_threshold?: number;
}

export interface ProductCreateRequest {
  name: string;
  sku: string;
  description?: string;
  part_number: string;  // 必填
  engine_model?: string;
  manufacturer?: string;
  category_id: number;
  price: number;
  cost?: number;
  unit?: string;
  min_stock_level?: number;
  warehouse_id: number;  // 必填 - 仓库ID
  initial_quantity?: number;  // 初始库存数量
  location_code?: string;  // 货位编号
  image_url?: string;
  is_active?: boolean;
}

export interface OrderCreateRequest {
  distributor_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  order_date: string;
  delivery_date?: string;
  warehouse_id?: number;
  delivery_person_id?: number;
  notes?: string;
}

// Notification API 类型定义
export interface NotificationResponse {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  reference_id?: number;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
  expires_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// Search API 类型定义
export interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  url: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('access_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
  }
  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...init?.headers as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Request failed (${response.status}): ${detail || response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health');
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.request<ProductDTO[]>('/api/v1/products/');
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      description: item.description,
      price: item.price,
      cost: item.cost,
      categoryId: item.category_id,
      imageUrl: item.image_url,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async createProduct(data: ProductCreateRequest): Promise<Product> {
    const requestBody: Record<string, any> = {
      name: data.name,
      sku: data.sku,
      part_number: data.part_number,  // 必填
      category_id: data.category_id,
      price: data.price,
      warehouse_id: data.warehouse_id,  // 必填
    };

    if (data.description !== undefined) requestBody.description = data.description;
    if (data.engine_model !== undefined) requestBody.engine_model = data.engine_model;
    if (data.manufacturer !== undefined) requestBody.manufacturer = data.manufacturer;
    if (data.cost !== undefined) requestBody.cost = data.cost;
    if (data.unit !== undefined) requestBody.unit = data.unit;
    if (data.min_stock_level !== undefined) requestBody.min_stock_level = data.min_stock_level;
    if (data.initial_quantity !== undefined) requestBody.initial_quantity = data.initial_quantity;
    if (data.location_code !== undefined) requestBody.location_code = data.location_code;
    if (data.image_url !== undefined) requestBody.image_url = data.image_url;
    if (data.is_active !== undefined) requestBody.is_active = data.is_active;

    const result = await this.request<ProductDTO>('/api/v1/products/', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    return {
      id: result.id,
      name: result.name,
      sku: result.sku,
      description: result.description,
      price: result.price,
      cost: result.cost,
      categoryId: result.category_id,
      imageUrl: result.image_url,
      isActive: result.is_active,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async updateProduct(productId: number, data: Partial<ProductCreateRequest>): Promise<Product> {
    const requestBody: Record<string, any> = {};

    if (data.name !== undefined) requestBody.name = data.name;
    if (data.sku !== undefined) requestBody.sku = data.sku;
    if (data.description !== undefined) requestBody.description = data.description;
    if (data.part_number !== undefined) requestBody.part_number = data.part_number;
    if (data.engine_model !== undefined) requestBody.engine_model = data.engine_model;
    if (data.manufacturer !== undefined) requestBody.manufacturer = data.manufacturer;
    if (data.category_id !== undefined) requestBody.category_id = data.category_id;
    if (data.price !== undefined) requestBody.price = data.price;
    if (data.cost !== undefined) requestBody.cost = data.cost;
    if (data.unit !== undefined) requestBody.unit = data.unit;
    if (data.min_stock_level !== undefined) requestBody.min_stock_level = data.min_stock_level;
    if (data.image_url !== undefined) requestBody.image_url = data.image_url;
    if (data.is_active !== undefined) requestBody.is_active = data.is_active;

    const result = await this.request<ProductDTO>(`/api/v1/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    });

    return {
      id: result.id,
      name: result.name,
      sku: result.sku,
      description: result.description,
      price: result.price,
      cost: result.cost,
      categoryId: result.category_id,
      imageUrl: result.image_url,
      isActive: result.is_active,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async deleteProduct(productId: number): Promise<Product> {
    const result = await this.request<ProductDTO>(`/api/v1/products/${productId}`, {
      method: 'DELETE',
    });

    return {
      id: result.id,
      name: result.name,
      sku: result.sku,
      description: result.description,
      price: result.price,
      cost: result.cost,
      categoryId: result.category_id,
      imageUrl: result.image_url,
      isActive: result.is_active,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async uploadProductImage(productId: number, file: File): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/v1/products/${productId}/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`图片上传失败 (${response.status}): ${detail || response.statusText}`);
    }

    return response.json();
  }

  async deleteProductImage(productId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/products/${productId}/image`, {
      method: 'DELETE',
    });
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    const data = await this.request<InventoryDTO[]>('/api/v1/inventory/items');
    return data.map((item) => ({
      id: item.id,
      productId: item.product_id,
      warehouseId: item.warehouse_id,
      quantity: item.quantity,
      reservedQuantity: item.reserved_quantity,
      updatedAt: item.updated_at,
    }));
  }

  async getDistributors(search?: string): Promise<Distributor[]> {
    const params = search && search.trim() ? `?search=${encodeURIComponent(search)}` : '';
    const data = await this.request<DistributorDTO[]>(`/api/v1/sales/distributors${params}`);
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      contactPerson: item.contact_person,
      phone: item.phone,
      email: item.email,
      address: item.address,
      region: item.region,
      creditLimit: item.credit_limit,
      isActive: item.is_active,
      createdAt: item.created_at,
    }));
  }

  async getDeliveryPersons(search?: string): Promise<DeliveryPerson[]> {
    const params = search && search.trim() ? `?search=${encodeURIComponent(search)}` : '';
    const data = await this.request<DeliveryPersonDTO[]>(`/api/v1/sales/delivery-persons${params}`);
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      email: item.email,
      vehicleNumber: item.vehicle_number,
      destination: item.destination,
      isActive: item.is_active,
      createdAt: item.created_at,
    }));
  }

  async createDeliveryPerson(data: {
    name: string;
    phone: string;
    email?: string;
    vehicle_number?: string;
    destination?: string;
  }): Promise<DeliveryPerson> {
    const result = await this.request<DeliveryPersonDTO>('/api/v1/sales/delivery-persons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      id: result.id,
      name: result.name,
      phone: result.phone,
      email: result.email,
      vehicleNumber: result.vehicle_number,
      destination: result.destination,
      isActive: result.is_active,
      createdAt: result.created_at,
    };
  }

  async getSalesOrders(filters?: {
    distributorId?: number;
    productName?: string;
    startDate?: string;  // YYYY-MM-DD
    endDate?: string;    // YYYY-MM-DD
  }): Promise<SalesOrder[]> {
    const params = new URLSearchParams();
    if (filters?.distributorId) {
      params.append('distributor_id', filters.distributorId.toString());
    }
    if (filters?.productName && filters.productName.trim()) {
      params.append('product_name', filters.productName.trim());
    }
    if (filters?.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('end_date', filters.endDate);
    }

    const queryString = params.toString();
    const url = `/api/v1/sales/orders${queryString ? '?' + queryString : ''}`;
    const data = await this.request<SalesOrderDTO[]>(url);
    return data.map((item) => ({
      id: item.id,
      orderCode: item.order_code,
      distributorId: item.distributor_id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalValue: item.total_value,
      orderDate: item.order_date,
      status: item.status,
      warehouseId: item.warehouse_id,
      deliveryPersonId: item.delivery_person_id,
      deliveryDate: item.delivery_date,
      completedAt: item.completed_at,
      userId: item.user_id,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async getOrdersAvailableForShipment(warehouseId?: number): Promise<Array<{ id: number; orderCode: string; productName: string; quantity: number; status: string }>> {
    const params = warehouseId ? `?warehouse_id=${warehouseId}` : '';
    const data = await this.request<SalesOrderDTO[]>(`/api/v1/sales/orders/available-for-shipment${params}`);
    return data.map((item) => ({
      id: item.id,
      orderCode: item.order_code,
      productName: item.product_name,
      quantity: item.quantity,
      status: item.status
    }));
  }

  async createOrder(data: OrderCreateRequest): Promise<SalesOrder> {
    const requestBody: Record<string, any> = {
      distributor_id: data.distributor_id,
      product_id: data.product_id,
      product_name: data.product_name,
      quantity: data.quantity,
      unit_price: data.unit_price,
      total_value: data.total_value,
      order_date: data.order_date,
    };

    if (data.delivery_date !== undefined) requestBody.delivery_date = data.delivery_date;
    if (data.warehouse_id !== undefined) requestBody.warehouse_id = data.warehouse_id;
    if (data.delivery_person_id !== undefined) requestBody.delivery_person_id = data.delivery_person_id;
    if (data.notes !== undefined) requestBody.notes = data.notes;

    const result = await this.request<SalesOrderDTO>('/api/v1/sales/orders', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    return {
      id: result.id,
      orderCode: result.order_code,
      distributorId: result.distributor_id,
      productId: result.product_id,
      productName: result.product_name,
      quantity: result.quantity,
      unitPrice: result.unit_price,
      totalValue: result.total_value,
      orderDate: result.order_date,
      status: result.status,
      warehouseId: result.warehouse_id,
      deliveryPersonId: result.delivery_person_id,
      deliveryDate: result.delivery_date,
      completedAt: result.completed_at,
      userId: result.user_id,
      notes: result.notes,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async queryRag(question: string, topK = 3): Promise<RAGQueryResponse> {
    return this.request<RAGQueryResponse>('/api/v1/ai/rag/query', {
      method: 'POST',
      body: JSON.stringify({ question, top_k: topK }),
    });
  }

  async getProductCategories(): Promise<ProductCategory[]> {
    const data = await this.request<ProductCategoryDTO[]>('/api/v1/products/categories');
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      createdAt: item.created_at,
    }));
  }

  // Dashboard API 方法
  async getDashboard(): Promise<DashboardResponse> {
    return this.request<DashboardResponse>('/api/v1/dashboard/');
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/api/v1/dashboard/stats');
  }

  async getStockStatus(): Promise<StockStatus[]> {
    return this.request<StockStatus[]>('/api/v1/dashboard/stock-status');
  }

  async getRecentActivities(limit = 10): Promise<ActivityLog[]> {
    return this.request<ActivityLog[]>(`/api/v1/dashboard/activities?limit=${limit}`);
  }

  async getInventoryAlerts(limit = 20): Promise<InventoryAlert[]> {
    return this.request<InventoryAlert[]>(`/api/v1/dashboard/alerts?limit=${limit}`);
  }

  async getTopProducts(limit = 5, days = 30): Promise<TopProduct[]> {
    return this.request<TopProduct[]>(`/api/v1/dashboard/top-products?limit=${limit}&days=${days}`);
  }

  async getWarehouseUtilization(): Promise<WarehouseUtilization[]> {
    return this.request<WarehouseUtilization[]>('/api/v1/dashboard/warehouse-utilization');
  }

  async getOrderStatusDistribution(): Promise<OrderStatusDistribution[]> {
    return this.request<OrderStatusDistribution[]>('/api/v1/dashboard/order-status-distribution');
  }

  async getInventorySalesTrend(period: string = 'weekly', days: number = 30): Promise<{
    labels: string[];
    inventory_levels: number[];
    sales_data: number[];
  }> {
    return this.request<{
      labels: string[];
      inventory_levels: number[];
      sales_data: number[];
    }>(`/api/v1/dashboard/inventory-sales-trend?period=${period}&days=${days}`);
  }

  async getProductMovement(period: string = 'weekly', days: number = 30): Promise<{
    labels: string[];
    movement_data: number[];
  }> {
    return this.request<{
      labels: string[];
      movement_data: number[];
    }>(`/api/v1/dashboard/product-movement?period=${period}&days=${days}`);
  }

  async getCategoryDistribution(): Promise<{
    labels: string[];
    data: number[];
  }> {
    return this.request<{
      labels: string[];
      data: number[];
    }>('/api/v1/dashboard/category-distribution');
  }

  // Auth API 方法
  async login(username: string, password: string): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    // 保存 token
    this.setToken(response.access_token);
    return response;
  }

  async register(data: RegisterRequest): Promise<UserResponse> {
    return this.request<UserResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<UserResponse> {
    return this.request<UserResponse>('/api/v1/users/me');
  }

  async updateUserProfile(data: UserProfileUpdate): Promise<UserResponse> {
    return this.request<UserResponse>('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/v1/users/me/avatar', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Upload failed (${response.status}): ${detail || response.statusText}`);
    }

    return response.json();
  }

  async changePassword(data: PasswordChangeRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAvatar(): Promise<{ message: string; avatar_url: null }> {
    return this.request<{ message: string; avatar_url: null }>('/api/v1/users/me/avatar', {
      method: 'DELETE',
    });
  }

  async getWarehouseConfig(): Promise<WarehouseConfig> {
    return this.request<WarehouseConfig>('/api/v1/warehouse/config');
  }

  async updateWarehouseConfig(data: WarehouseConfigUpdate): Promise<WarehouseConfig> {
    return this.request<WarehouseConfig>('/api/v1/warehouse/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  logout() {
    this.clearToken();
  }

  // Order Management methods
  async updateOrderStatus(orderId: number, status: string, notes?: string): Promise<SalesOrder> {
    const data = await this.request<SalesOrderDTO>(`/api/v1/sales/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
    return {
      id: data.id,
      orderCode: data.order_code,
      distributorId: data.distributor_id,
      productId: data.product_id,
      productName: data.product_name,
      quantity: data.quantity,
      totalValue: data.total_value,
      orderDate: data.order_date,
      status: data.status,
      warehouseId: data.warehouse_id,
      deliveryDate: data.delivery_date,
      completedAt: data.completed_at,
      userId: data.user_id,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateOrder(orderId: number, updates: Partial<SalesOrder>): Promise<SalesOrder> {
    const requestBody: Record<string, any> = {};
    if (updates.quantity !== undefined) requestBody.quantity = updates.quantity;
    if (updates.totalValue !== undefined) requestBody.total_value = updates.totalValue;
    if (updates.status !== undefined) requestBody.status = updates.status;
    if (updates.warehouseId !== undefined) requestBody.warehouse_id = updates.warehouseId;
    if (updates.deliveryDate !== undefined) requestBody.delivery_date = updates.deliveryDate;
    if (updates.notes !== undefined) requestBody.notes = updates.notes;

    const data = await this.request<SalesOrderDTO>(`/api/v1/sales/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    });
    return {
      id: data.id,
      orderCode: data.order_code,
      distributorId: data.distributor_id,
      productId: data.product_id,
      productName: data.product_name,
      quantity: data.quantity,
      totalValue: data.total_value,
      orderDate: data.order_date,
      status: data.status,
      warehouseId: data.warehouse_id,
      deliveryDate: data.delivery_date,
      completedAt: data.completed_at,
      userId: data.user_id,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Inventory Management methods
  async updateInventoryQuantity(inventoryId: number, quantity: number): Promise<InventoryItem> {
    const data = await this.request<InventoryDTO>(`/api/v1/inventory/items/${inventoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
    return {
      id: data.id,
      productId: data.product_id,
      warehouseId: data.warehouse_id,
      quantity: data.quantity,
      reservedQuantity: data.reserved_quantity,
      updatedAt: data.updated_at,
    };
  }

  async getWarehouses(): Promise<Array<{
    id: number;
    name: string;
    code?: string;
    location?: string;
    manager_name?: string;
    phone?: string;
    lat?: string | number;
    lng?: string | number;
  }>> {
    return this.request<Array<{
      id: number;
      name: string;
      code?: string;
      location?: string;
      manager_name?: string;
      phone?: string;
      lat?: string | number;
      lng?: string | number;
    }>>('/api/v1/inventory/warehouses');
  }

  // Notification methods
  async getNotifications(skip = 0, limit = 50, unreadOnly = false): Promise<NotificationResponse[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      unread_only: unreadOnly.toString(),
    });
    return this.request<NotificationResponse[]>(`/api/v1/notifications/?${params}`);
  }

  async getUnreadNotificationCount(): Promise<UnreadCountResponse> {
    return this.request<UnreadCountResponse>('/api/v1/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId: number): Promise<NotificationResponse> {
    return this.request<NotificationResponse>(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead(): Promise<{ message: string; count: number }> {
    return this.request<{ message: string; count: number }>('/api/v1/notifications/read-all', {
      method: 'PUT',
    });
  }

  async deleteNotification(notificationId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // Search methods
  async globalSearch(query: string, limit = 20): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    return this.request<SearchResult[]>(`/api/v1/search/?${params}`);
  }

  // ========== Wave Management (波次管理) ==========

  async getWaves(status?: string): Promise<Wave[]> {
    const params = status ? `?status=${status}` : '';
    const data = await this.request<any[]>(`/api/v1/waves/${params}`);
    return data.map(item => ({
      id: item.id,
      waveCode: item.wave_code,
      carrier: item.carrier,
      region: item.region,
      warehouseId: item.warehouse_id,
      orderCount: item.order_count,
      totalQuantity: item.total_quantity,
      priority: item.priority,
      status: item.status,
      notes: item.notes,
      createdAt: item.created_at,
      releasedAt: item.released_at,
      completedAt: item.completed_at,
    }));
  }

  async getWave(waveId: number): Promise<WaveWithOrders> {
    const data = await this.request<any>(`/api/v1/waves/${waveId}`);
    return {
      id: data.id,
      waveCode: data.wave_code,
      carrier: data.carrier,
      region: data.region,
      warehouseId: data.warehouse_id,
      orderCount: data.order_count,
      totalQuantity: data.total_quantity,
      priority: data.priority,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
      releasedAt: data.released_at,
      completedAt: data.completed_at,
      orders: (data.orders || []).map((o: any) => ({
        id: o.id,
        orderCode: o.order_code,
        productName: o.product_name,
        quantity: o.quantity,
        status: o.status
      })),
    };
  }

  async generateWaves(request: WaveGenerateRequest): Promise<Wave[]> {
    const data = await this.request<any[]>('/api/v1/waves/generate', {
      method: 'POST',
      body: JSON.stringify({
        region: request.region,
        carrier: request.carrier,
        warehouse_id: request.warehouseId,
        priority: request.priority,
        max_orders_per_wave: request.maxOrdersPerWave || 50,
        order_ids: request.orderIds,
      }),
    });
    return data.map(item => ({
      id: item.id,
      waveCode: item.wave_code,
      carrier: item.carrier,
      region: item.region,
      warehouseId: item.warehouse_id,
      orderCount: item.order_count,
      totalQuantity: item.total_quantity,
      priority: item.priority,
      status: item.status,
      notes: item.notes,
      createdAt: item.created_at,
      releasedAt: item.released_at,
      completedAt: item.completed_at,
    }));
  }

  async releaseWave(waveId: number): Promise<Wave> {
    const data = await this.request<any>(`/api/v1/waves/${waveId}/release`, {
      method: 'PUT',
    });
    return {
      id: data.id,
      waveCode: data.wave_code,
      carrier: data.carrier,
      region: data.region,
      warehouseId: data.warehouse_id,
      orderCount: data.order_count,
      totalQuantity: data.total_quantity,
      priority: data.priority,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
      releasedAt: data.released_at,
      completedAt: data.completed_at,
    };
  }

  async completeWave(waveId: number): Promise<Wave> {
    const data = await this.request<any>(`/api/v1/waves/${waveId}/complete`, {
      method: 'PUT',
    });
    return {
      id: data.id,
      waveCode: data.wave_code,
      carrier: data.carrier,
      region: data.region,
      warehouseId: data.warehouse_id,
      orderCount: data.order_count,
      totalQuantity: data.total_quantity,
      priority: data.priority,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
      releasedAt: data.released_at,
      completedAt: data.completed_at,
    };
  }

  // ========== Shipment Management (运输管理) ==========

  async getShipments(status?: string): Promise<Shipment[]> {
    const params = status ? `?status=${status}` : '';
    const data = await this.request<any[]>(`/api/v1/shipments/${params}`);
    return data.map(item => ({
      id: item.id,
      shipmentCode: item.shipment_code,
      deliveryPersonId: item.delivery_person_id,
      deliveryPersonName: item.delivery_person_name,
      originWarehouseId: item.origin_warehouse_id,
      warehouseName: item.warehouse_name,
      originAddress: item.origin_address,
      destinationAddress: item.destination_address,
      departureTime: item.departure_time,
      estimatedArrival: item.estimated_arrival,
      actualArrival: item.actual_arrival,
      totalDistance: item.total_distance,
      etaMinutes: item.eta_minutes,
      status: item.status,
      orderCount: item.order_count,
      notes: item.notes,
      createdAt: item.created_at,
    }));
  }

  async getShipment(shipmentId: number): Promise<ShipmentWithOrders> {
    const data = await this.request<any>(`/api/v1/shipments/${shipmentId}`);
    return {
      id: data.id,
      shipmentCode: data.shipment_code,
      deliveryPersonId: data.delivery_person_id,
      deliveryPersonName: data.delivery_person_name,
      originWarehouseId: data.origin_warehouse_id,
      warehouseName: data.warehouse_name,
      originAddress: data.origin_address,
      destinationAddress: data.destination_address,
      departureTime: data.departure_time,
      estimatedArrival: data.estimated_arrival,
      actualArrival: data.actual_arrival,
      totalDistance: data.total_distance,
      etaMinutes: data.eta_minutes,
      status: data.status,
      orderCount: data.order_count,
      notes: data.notes,
      createdAt: data.created_at,
      orders: (data.orders || []).map((o: any) => ({
        id: o.id,
        orderCode: o.order_code,
        productName: o.product_name,
        quantity: o.quantity,
        status: o.status
      })),
    };
  }

  async createShipment(request: ShipmentCreate): Promise<Shipment> {
    const data = await this.request<any>('/api/v1/shipments/', {
      method: 'POST',
      body: JSON.stringify({
        delivery_person_id: request.deliveryPersonId,
        origin_warehouse_id: request.originWarehouseId,
        destination_address: request.destinationAddress,
        order_ids: request.orderIds,
        departure_time: request.departureTime,
        notes: request.notes,
      }),
    });
    return {
      id: data.id,
      shipmentCode: data.shipment_code,
      deliveryPersonId: data.delivery_person_id,
      deliveryPersonName: data.delivery_person_name,
      originWarehouseId: data.origin_warehouse_id,
      warehouseName: data.warehouse_name,
      originAddress: data.origin_address,
      destinationAddress: data.destination_address,
      departureTime: data.departure_time,
      estimatedArrival: data.estimated_arrival,
      actualArrival: data.actual_arrival,
      totalDistance: data.total_distance,
      etaMinutes: data.eta_minutes,
      status: data.status,
      orderCount: data.order_count || 0,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  async updateShipmentStatus(shipmentId: number, status: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/shipments/${shipmentId}/status?status=${status}`, {
      method: 'PUT',
    });
  }

  async getShipmentTracking(shipmentId: number): Promise<ShipmentTracking> {
    const data = await this.request<any>(`/api/v1/shipments/${shipmentId}/tracking`);
    return {
      shipmentId: data.shipment_id,
      shipmentCode: data.shipment_code,
      status: data.status,
      originWarehouse: data.origin_warehouse,
      destinationAddress: data.destination_address,
      deliveryPerson: data.delivery_person,
      vehicleNumber: data.vehicle_number,
      departureTime: data.departure_time,
      estimatedArrival: data.estimated_arrival,
      actualArrival: data.actual_arrival,
      totalDistanceKm: data.total_distance_km,
      etaMinutes: data.eta_minutes,
      orders: data.orders || [],
    };
  }

  // ========== Route Planning ==========

  async calculateRoute(warehouseId: number, orderIds: number[]): Promise<{
    origin: { address: string; lat?: number; lng?: number };
    destinations: Array<{ orderId: number; orderCode: string; address: string; lat?: number; lng?: number; sequence: number }>;
    totalDistanceKm?: number;
    totalEtaMinutes?: number;
  }> {
    const data = await this.request<any>('/api/v1/shipments/calculate-route', {
      method: 'POST',
      body: JSON.stringify({
        warehouse_id: warehouseId,
        order_ids: orderIds,
      }),
    });
    return {
      origin: {
        address: data.origin?.address || '',
        lat: data.origin?.lat,
        lng: data.origin?.lng,
      },
      destinations: (data.destinations || []).map((d: any) => ({
        orderId: d.order_id,
        orderCode: d.order_code,
        address: d.address,
        lat: d.lat,
        lng: d.lng,
        sequence: d.sequence,
      })),
      totalDistanceKm: data.total_distance_km,
      totalEtaMinutes: data.total_eta_minutes,
    };
  }

  // ========== Notification Clear All ==========

  async clearAllNotifications(): Promise<{ message: string; count: number }> {
    return this.request<{ message: string; count: number }>('/api/v1/notifications/clear-all', {
      method: 'DELETE',
    });
  }

  // ========== AI Chat ==========

  async aiChat(message: string, conversationId?: string, includeContext: boolean = true): Promise<{
    answer: string;
    conversation_id: string;
    message_id?: string;
    suggestions: string[];
  }> {
    return this.request<{
      answer: string;
      conversation_id: string;
      message_id?: string;
      suggestions: string[];
    }>('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        include_context: includeContext,
      }),
    });
  }

  async getAiConversations(limit: number = 20): Promise<{
    data: Array<{ id: string; name: string; created_at: number }>;
  }> {
    return this.request<{ data: Array<{ id: string; name: string; created_at: number }> }>(
      `/api/v1/ai/conversations?limit=${limit}`
    );
  }

  async getAiConversationMessages(conversationId: string, limit: number = 20): Promise<{
    data: Array<{ id: string; query: string; answer: string; created_at: number }>;
  }> {
    return this.request<{ data: Array<{ id: string; query: string; answer: string; created_at: number }> }>(
      `/api/v1/ai/conversations/${conversationId}/messages?limit=${limit}`
    );
  }

  async getInventoryContext(): Promise<{
    summary: string;
    low_stock_items: Array<{ product_name: string; current_stock: number; safety_stock: number }>;
    inventory_by_warehouse: Array<{ warehouse: string; product_count: number; total_quantity: number }>;
  }> {
    return this.request<{
      summary: string;
      low_stock_items: Array<{ product_name: string; current_stock: number; safety_stock: number }>;
      inventory_by_warehouse: Array<{ warehouse: string; product_count: number; total_quantity: number }>;
    }>('/api/v1/ai/inventory/context');
  }
}


// ========== Wave Types ==========

export type WaveStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type WavePriority = 'normal' | 'urgent';

export interface Wave {
  id: number;
  waveCode: string;
  carrier?: string;
  region?: string;
  warehouseId?: number;
  orderCount: number;
  totalQuantity: number;
  priority: WavePriority;
  status: WaveStatus;
  notes?: string;
  createdAt: string;
  releasedAt?: string;
  completedAt?: string;
}

export interface WaveWithOrders extends Wave {
  orders: Array<{
    id: number;
    orderCode: string;
    productName: string;
    quantity: number;
    status: string;
  }>;
}

export interface WaveGenerateRequest {
  region?: string;
  carrier?: string;
  warehouseId?: number;
  priority?: WavePriority;
  maxOrdersPerWave?: number;
  orderIds?: number[];  // 手动指定订单IDs
}

// ========== Shipment Types ==========

export type ShipmentStatus = 'planned' | 'loading' | 'in_transit' | 'delivered' | 'cancelled';

export interface Shipment {
  id: number;
  shipmentCode: string;
  deliveryPersonId?: number;
  deliveryPersonName?: string;
  originWarehouseId: number;
  warehouseName?: string;
  originAddress?: string;
  destinationAddress: string;
  departureTime?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  totalDistance?: number;
  etaMinutes?: number;
  status: ShipmentStatus;
  orderCount: number;
  notes?: string;
  createdAt: string;
}

export interface ShipmentWithOrders extends Shipment {
  orders: Array<{
    id: number;
    orderCode: string;
    productName: string;
    quantity: number;
    status: string;
  }>;
}

export interface ShipmentCreate {
  deliveryPersonId?: number;
  originWarehouseId: number;
  destinationAddress: string;
  orderIds: number[];
  departureTime?: string;
  notes?: string;
}

export interface ShipmentTracking {
  shipmentId: number;
  shipmentCode: string;
  status: ShipmentStatus;
  originWarehouse: string;
  destinationAddress: string;
  deliveryPerson?: string;
  vehicleNumber?: string;
  departureTime?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  totalDistanceKm?: number;
  etaMinutes?: number;
  orders: Array<{
    orderCode: string;
    productName: string;
    quantity: number;
    status: string;
  }>;
}

// ========== Report Types ==========

export type ReportStatus = 'generating' | 'completed' | 'failed';
export type InsightType = 'suggestion' | 'trend' | 'warning';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface AIReport {
  id: number;
  userId: number;
  title: string;
  query: string;
  content?: string;
  summary?: string;
  status: ReportStatus;
  errorMessage?: string;
  isStarred: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface AIInsight {
  id: number;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  isHandled: boolean;
  createdAt: string;
}

export interface ReportStats {
  pendingInsights: number;
  weeklyReports: number;
  accuracyRate: number;
  lastUpdated: string;
}

export interface ReportListResponse {
  reports: AIReport[];
  total: number;
}

export interface InsightListResponse {
  insights: AIInsight[];
  pendingCount: number;
}

// Report API methods (added to ApiService class above)
// These are injected at runtime

export const apiService = new ApiService();

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = apiService.getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// Add report methods to apiService
Object.assign(apiService, {
  // Report Stats
  async getReportStats(): Promise<ReportStats> {
    const res = await fetch('/api/v1/reports/stats', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch report stats');
    const data = await res.json();
    return {
      pendingInsights: data.pending_insights,
      weeklyReports: data.weekly_reports,
      accuracyRate: data.accuracy_rate,
      lastUpdated: data.last_updated
    };
  },

  // Generate Report
  async generateReport(query: string, title?: string): Promise<AIReport> {
    const res = await fetch('/api/v1/reports/generate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, title })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to generate report');
    }
    const data = await res.json();
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      query: data.query,
      content: data.content,
      summary: data.summary,
      status: data.status,
      errorMessage: data.error_message,
      isStarred: data.is_starred,
      createdAt: data.created_at,
      completedAt: data.completed_at
    };
  },

  // List Reports
  async listReports(skip = 0, limit = 20): Promise<ReportListResponse> {
    const res = await fetch(`/api/v1/reports/list?skip=${skip}&limit=${limit}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch reports');
    const data = await res.json();
    return {
      reports: data.reports.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        query: r.query,
        content: r.content,
        summary: r.summary,
        status: r.status,
        errorMessage: r.error_message,
        isStarred: r.is_starred,
        createdAt: r.created_at,
        completedAt: r.completed_at
      })),
      total: data.total
    };
  },

  // Get Single Report
  async getReport(reportId: number): Promise<AIReport> {
    const res = await fetch(`/api/v1/reports/${reportId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Report not found');
    const data = await res.json();
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      query: data.query,
      content: data.content,
      summary: data.summary,
      status: data.status,
      errorMessage: data.error_message,
      isStarred: data.is_starred,
      createdAt: data.created_at,
      completedAt: data.completed_at
    };
  },

  // Star Report
  async starReport(reportId: number, starred: boolean): Promise<void> {
    const res = await fetch(`/api/v1/reports/${reportId}/star?starred=${starred}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to star report');
  },

  // Delete Report
  async deleteReport(reportId: number): Promise<void> {
    const res = await fetch(`/api/v1/reports/${reportId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete report');
  },

  // Export Report (returns download URL)
  getReportExportUrl(reportId: number, format: 'markdown' | 'html'): string {
    return `/api/v1/reports/${reportId}/export/${format}`;
  },

  // Preview Report URL
  getReportPreviewUrl(reportId: number): string {
    return `/api/v1/reports/${reportId}/preview`;
  },

  // List Insights
  async listInsights(includeHandled = false, limit = 10): Promise<InsightListResponse> {
    const res = await fetch(
      `/api/v1/reports/insights/list?include_handled=${includeHandled}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) throw new Error('Failed to fetch insights');
    const data = await res.json();
    return {
      insights: data.insights.map((i: any) => ({
        id: i.id,
        type: i.type,
        priority: i.priority,
        title: i.title,
        message: i.message,
        isHandled: i.is_handled,
        createdAt: i.created_at
      })),
      pendingCount: data.pending_count
    };
  },

  // Generate New Insights
  async generateInsights(): Promise<{ success: boolean; generatedCount: number }> {
    const res = await fetch('/api/v1/reports/insights/generate', {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to generate insights');
    const data = await res.json();
    return { success: data.success, generatedCount: data.generated_count };
  },

  // Mark Insight as Handled
  async handleInsight(insightId: number): Promise<void> {
    const res = await fetch(`/api/v1/reports/insights/${insightId}/handle`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to handle insight');
  }
});
