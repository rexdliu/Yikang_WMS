import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Define the structure for notifications and the store's state
export interface UINotification {
  id: string;
  title: string;
  message: string;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: UINotification[];
}

interface UIActions {
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void; // Simple light/dark toggle for the header
  addNotification: (notification: Omit<UINotification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

// Create the store with persistence middleware
export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      // Default State
      sidebarOpen: true,
      theme: 'system',
      notifications: [
        { id: '1', title: 'Welcome!', message: 'Your new dashboard is ready.' },
        { id: '2', title: 'Low Stock Alert', message: 'Item #WH-001-NYC is running low.' },
      ],

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () => {
        const currentTheme = get().theme;
        // The header toggle will just switch between light and dark
        set({ theme: currentTheme === 'light' ? 'dark' : 'light' });
      },

      addNotification: (notification) => {
        const newNotification = { ...notification, id: Date.now().toString() };
        set((state) => ({ notifications: [newNotification, ...state.notifications] }));
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
    }),
    {
      name: 'warehouse-ui-storage', // Name for the localStorage item
      storage: createJSONStorage(() => localStorage), // Use localStorage for persistence
      partialize: (state) => ({ theme: state.theme }), // Only persist the 'theme' field
    }
  )
);