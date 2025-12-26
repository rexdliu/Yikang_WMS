import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SearchState {
    // 库存管理页面搜索状态
    inventorySearch: string;
    inventoryCategory: string;
    inventoryWarehouse: string;

    // 订单管理页面搜索状态
    orderSearch: string;
    orderStatus: string;
    orderDistributor: string;
}

interface SearchStateContextType {
    state: SearchState;
    setInventorySearch: (value: string) => void;
    setInventoryCategory: (value: string) => void;
    setInventoryWarehouse: (value: string) => void;
    setOrderSearch: (value: string) => void;
    setOrderStatus: (value: string) => void;
    setOrderDistributor: (value: string) => void;
    clearInventoryFilters: () => void;
    clearOrderFilters: () => void;
}

const defaultState: SearchState = {
    inventorySearch: '',
    inventoryCategory: '',
    inventoryWarehouse: '',
    orderSearch: '',
    orderStatus: '',
    orderDistributor: '',
};

const SearchStateContext = createContext<SearchStateContextType | undefined>(undefined);

export const SearchStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<SearchState>(defaultState);

    const setInventorySearch = useCallback((value: string) => {
        setState(prev => ({ ...prev, inventorySearch: value }));
    }, []);

    const setInventoryCategory = useCallback((value: string) => {
        setState(prev => ({ ...prev, inventoryCategory: value }));
    }, []);

    const setInventoryWarehouse = useCallback((value: string) => {
        setState(prev => ({ ...prev, inventoryWarehouse: value }));
    }, []);

    const setOrderSearch = useCallback((value: string) => {
        setState(prev => ({ ...prev, orderSearch: value }));
    }, []);

    const setOrderStatus = useCallback((value: string) => {
        setState(prev => ({ ...prev, orderStatus: value }));
    }, []);

    const setOrderDistributor = useCallback((value: string) => {
        setState(prev => ({ ...prev, orderDistributor: value }));
    }, []);

    const clearInventoryFilters = useCallback(() => {
        setState(prev => ({
            ...prev,
            inventorySearch: '',
            inventoryCategory: '',
            inventoryWarehouse: '',
        }));
    }, []);

    const clearOrderFilters = useCallback(() => {
        setState(prev => ({
            ...prev,
            orderSearch: '',
            orderStatus: '',
            orderDistributor: '',
        }));
    }, []);

    return (
        <SearchStateContext.Provider
            value={{
                state,
                setInventorySearch,
                setInventoryCategory,
                setInventoryWarehouse,
                setOrderSearch,
                setOrderStatus,
                setOrderDistributor,
                clearInventoryFilters,
                clearOrderFilters,
            }}
        >
            {children}
        </SearchStateContext.Provider>
    );
};

export const useSearchState = (): SearchStateContextType => {
    const context = useContext(SearchStateContext);
    if (!context) {
        throw new Error('useSearchState must be used within a SearchStateProvider');
    }
    return context;
};
