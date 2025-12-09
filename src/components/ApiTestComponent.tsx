// src/components/ApiTestComponent.tsx
import React, { useState, useEffect } from 'react';
import { apiService, Product } from '@/services/api';

const ApiTestComponent: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 测试健康检查
        const health = await apiService.healthCheck();
        setHealthStatus(health.status);
        
        // 获取产品数据（已对齐 /api/v1/products 返回的数组）
        const productsData = await apiService.getProducts();
        setProducts(productsData);
      } catch (err) {
        setError('Failed to fetch data: ' + (err as Error).message);
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">API Connection Test</h2>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="font-semibold">Health Status:</h3>
        <p>{healthStatus || 'Unknown'}</p>
      </div>
      
      <div>
        <h3 className="font-semibold">Products:</h3>
        {products.length > 0 ? (
          <ul className="list-disc pl-5">
            {products.map((product) => (
              <li key={product.id}>
                {product.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No products found</p>
        )}
      </div>
    </div>
  );
};

export default ApiTestComponent;