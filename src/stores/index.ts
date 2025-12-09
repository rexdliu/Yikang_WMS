import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  apiService,
  Product as ApiProduct,
  InventoryItem as ApiInventoryItem,
  ProductCategory,
  Distributor as ApiDistributor,
  SalesOrder as ApiSalesOrder,
} from '@/services/api';

// Auth Store
interface User {
  id: string;
  name: string;
  email: string;
  account: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      login: (user: User, token: string) => {
        // 保存token到localStorage和apiService
        apiService.setToken(token);
        set({ user, isAuthenticated: true, token });
      },
      logout: () => {
        // 清除token
        apiService.clearToken();
        set({ user: null, isAuthenticated: false, token: null });
      },
      setUser: (user: User) => {
        set({ user });
      },
      initializeAuth: () => {
        // 初始化时检查token
        const token = apiService.getToken();
        if (token) {
          // Token存在，尝试获取当前用户信息
          apiService.getCurrentUser()
            .then((userData) => {
              set({
                user: {
                  id: userData.id.toString(),
                  name: userData.full_name || userData.username,
                  email: userData.email,
                  account: userData.username,
                  role: userData.role,
                },
                isAuthenticated: true,
                token,
              });
            })
            .catch(() => {
              // Token无效，清除
              apiService.clearToken();
              set({ user: null, isAuthenticated: false, token: null });
            });
        }
      },
    }),
    {
      name: 'warehouse-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// UI Store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  showAnimations: boolean;
  showTooltips: boolean;
  aiSettings: {
    enabled: boolean;
    autoSuggestions: boolean;
    voiceInput: boolean;
    contextMemory: string;
    responseSpeed: string;
  };
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    timestamp: Date;
  }>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setShowAnimations: (show: boolean) => void;
  setShowTooltips: (show: boolean) => void;
  setAISettings: (settings: Partial<UIState['aiSettings']>) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system', // 默认跟随系统，更现代的做法
      showAnimations: true,
      showTooltips: true,
      aiSettings: {
        enabled: true,
        autoSuggestions: true,
        voiceInput: false,
        contextMemory: 'session',
        responseSpeed: 'balanced',
      },
      notifications: [
        {
          id: '1',
          title: 'Low Stock Alert',
          message: 'iPhone 14 Pro stock is running low (5 units remaining)',
          type: 'warning',
          timestamp: new Date()
        },
        {
          id: '2',
          title: 'Order Completed',
          message: 'Order #WH-2024-001 has been successfully processed',
          type: 'success',
          timestamp: new Date()
        }
      ],
      setTheme: (theme) => set({ theme }),
      setShowAnimations: (show) => set({ showAnimations: show }),
      setShowTooltips: (show) => set({ showTooltips: show }),
      setAISettings: (settings) => set((state) => {
        const newSettings = { ...state.aiSettings, ...settings };
        return { aiSettings: newSettings };
      }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        return { theme: newTheme };
      }),
      addNotification: (notification) => set((state) => ({
        notifications: [
          { ...notification, id: Date.now().toString(), timestamp: new Date() },
          ...state.notifications
        ]
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
    }),
    {
      name: 'warehouse-settings',
      storage: createJSONStorage(() => localStorage),
     partialize: (state) => ({ 
        theme: state.theme, 
        aiSettings: state.aiSettings,
        sidebarOpen: state.sidebarOpen,
        showAnimations: state.showAnimations,
        showTooltips: state.showTooltips,
      }),
    }
  )
);

// --- 库存 Store (实时数据) ---
export interface InventoryProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  reservedQuantity: number;
  price: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  updatedAt?: string;
}

interface InventoryFilters {
  category: string;
  status: string;
  search: string;
}

interface InventoryState {
  products: InventoryProduct[];
  inventoryItems: ApiInventoryItem[];
  categories: string[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  filters: InventoryFilters;
  loadInventory: () => Promise<void>;
  setFilters: (filters: Partial<InventoryFilters>) => void;
}

const LOW_STOCK_THRESHOLD = 12;

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  inventoryItems: [],
  categories: ['全部'],
  loading: false,
  error: null,
  initialized: false,
  filters: {
    category: '全部',
    status: '全部',
    search: '',
  },
  async loadInventory() {
    if (get().loading) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const [products, inventoryItems, categories] = await Promise.all([
        apiService.getProducts(),
        apiService.getInventoryItems(),
        apiService.getProductCategories(),
      ]);

      const categoryMap = new Map<number, string>(
        categories.map((item) => [item.id, item.name])
      );

      const aggregated = inventoryItems.reduce<Record<number, { quantity: number; reserved: number }>>(
        (acc, item) => {
          const record = acc[item.productId] || { quantity: 0, reserved: 0 };
          record.quantity += item.quantity ?? 0;
          record.reserved += item.reservedQuantity ?? 0;
          acc[item.productId] = record;
          return acc;
        },
        {}
      );

      const enrichedProducts: InventoryProduct[] = products.map((product: ApiProduct) => {
        const inventory = aggregated[product.id] || { quantity: 0, reserved: 0 };
        const quantity = inventory.quantity;
        const status: InventoryProduct['status'] = quantity <= 0
          ? 'out-of-stock'
          : quantity < LOW_STOCK_THRESHOLD
          ? 'low-stock'
          : 'in-stock';

        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: categoryMap.get(product.categoryId ?? 0) ?? '未分类',
          quantity,
          reservedQuantity: inventory.reserved,
          price: product.price,
          status,
          updatedAt: product.updatedAt,
        };
      });

      const categoryNames = Array.from(
        new Set(enrichedProducts.map((product) => product.category))
      );

      set({
        products: enrichedProducts,
        inventoryItems,
        categories: ['全部', ...categoryNames],
        loading: false,
        initialized: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载库存失败',
        loading: false,
      });
    }
  },
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
}));

// --- 销售与经销商 Store ---
export interface Distributor {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  region: string;
  createdAt: string;
}

export interface SalesOrder {
  id: number;
  orderCode: string;
  distributorId: number;
  productId: number;
  productName: string;
  quantity: number;
  totalValue: number;
  orderDate: Date;
  createdAt: string;
}

interface SalesState {
  distributors: Distributor[];
  orders: SalesOrder[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  load: () => Promise<void>;
  getSalesByDistributor: (distributorId: number) => SalesOrder[];
}

export const useSalesStore = create<SalesState>((set, get) => ({
  distributors: [],
  orders: [],
  loading: false,
  error: null,
  initialized: false,
  async load() {
    if (get().loading) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const [distributors, orders] = await Promise.all([
        apiService.getDistributors(),
        apiService.getSalesOrders(),
      ]);

      const orderViews: SalesOrder[] = orders.map((order: ApiSalesOrder) => ({
        id: order.id,
        orderCode: order.orderCode,
        distributorId: order.distributorId,
        productId: order.productId,
        productName: order.productName,
        quantity: order.quantity,
        totalValue: order.totalValue,
        orderDate: new Date(order.orderDate),
        createdAt: order.createdAt,
      }));

      const distributorViews: Distributor[] = distributors.map((dist: ApiDistributor) => ({
        id: dist.id,
        name: dist.name,
        contactPerson: dist.contactPerson,
        phone: dist.phone,
        region: dist.region,
        createdAt: dist.createdAt,
      }));

      set({
        distributors: distributorViews,
        orders: orderViews,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载销售数据失败',
        loading: false,
      });
    }
  },
  getSalesByDistributor: (distributorId) =>
    get().orders.filter((order) => order.distributorId === distributorId),
}));
// AI Store
interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface AIState {
  isOpen: boolean;
  isLoading: boolean;
  messages: AIMessage[];
  suggestions: string[];
  toggleChat: () => void;
  addMessage: (content: string, role: 'user' | 'assistant') => void;
  setLoading: (loading: boolean) => void;
}

export const useAIStore = create<AIState>((set) => ({
  isOpen: false,
  isLoading: false,
  messages: [
    {
      id: '1',
      content: '你好！我是你的 AI 仓库助手。我可以协助你进行库存管理、趋势预测和数据洞察。请问我今天能为你做些什么？',
      role: 'assistant',
      timestamp: new Date()
    }
  ],
 suggestions: [
  '显示库存不足的商品',
  '预测下周的需求',
  '优化仓库布局',
  '生成库存报告'
],
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  addMessage: (content, role) => set((state) => ({
    messages: [
      ...state.messages,
      { id: Date.now().toString(), content, role, timestamp: new Date() }
    ]
  })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
