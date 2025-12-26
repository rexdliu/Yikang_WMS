/**
 * 仓库地图页面 - 高德地图集成
 * 
 * 功能：
 * 1. 显示仓库位置
 * 2. 显示运输中的运输单
 * 3. 支持地图交互
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiService, Shipment } from '@/services/api';
import { MapPin, Truck, RefreshCw, Warehouse } from 'lucide-react';

// 高德地图 API Key 从环境变量获取
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '';

console.log('[AMAP] Initializing with key:', AMAP_KEY ? AMAP_KEY.substring(0, 8) + '...' : 'MISSING');

// 加载高德地图 JS SDK (使用JSAPI 2.0 Loader)
const loadAmapScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 如果已加载
    if ((window as any).AMap) {
      console.log('[AMAP] SDK already loaded');
      resolve();
      return;
    }

    console.log('[AMAP] Loading SDK...');

    // 先加载 JSAPI Loader
    const loaderScript = document.createElement('script');
    loaderScript.src = 'https://webapi.amap.com/loader.js';
    loaderScript.onload = () => {
      console.log('[AMAP] Loader loaded, initializing map...');
      const AMapLoader = (window as any).AMapLoader;

      AMapLoader.load({
        key: AMAP_KEY,
        version: '2.0',
        plugins: ['AMap.Geocoder', 'AMap.Driving'],
      }).then((AMap: any) => {
        console.log('[AMAP] SDK loaded successfully with plugins');
        (window as any).AMap = AMap;
        resolve();
      }).catch((e: Error) => {
        console.error('[AMAP] Load error:', e);
        reject(e);
      });
    };
    loaderScript.onerror = () => reject(new Error('高德地图Loader加载失败'));
    document.head.appendChild(loaderScript);
  });
};

interface WarehouseLocation {
  id: number;
  name: string;
  code?: string;
  location?: string;
  lat?: number;
  lng?: number;
}

const WarehouseMapPage: React.FC = () => {
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);

  // 使用高德API进行地址解析获取真实坐标
  const geocodeAddress = async (address: string): Promise<{ lat: number, lng: number } | null> => {
    return new Promise((resolve) => {
      const AMap = (window as any).AMap;
      console.log('[AMAP] Geocoding:', address, 'AMap available:', !!AMap);

      if (!AMap) {
        console.error('[AMAP] AMap not loaded');
        resolve(null);
        return;
      }

      try {
        const geocoder = new AMap.Geocoder();
        geocoder.getLocation(address, (status: string, result: any) => {
          console.log('[AMAP] Geocode result:', status, result);
          if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
            const location = result.geocodes[0].location;
            console.log(`[AMAP] Geocoded ${address} -> (${location.lat}, ${location.lng})`);
            resolve({ lat: location.lat, lng: location.lng });
          } else {
            console.warn(`[AMAP] Geocode failed for: ${address}`, result);
            resolve(null);
          }
        });
      } catch (e) {
        console.error('[AMAP] Geocoder error:', e);
        resolve(null);
      }
    });
  };

  // 加载仓库和运输数据 (需要AMap已加载)
  const loadData = useCallback(async () => {
    console.log('[AMAP] loadData called');

    try {
      const [warehouseData, shipmentData] = await Promise.all([
        apiService.getWarehouses(),
        apiService.getShipments('in_transit'),
      ]);

      console.log('[AMAP] Data fetched:', warehouseData.length, 'warehouses');

      // 获取AMap实例
      const AMap = (window as any).AMap;
      if (!AMap) {
        console.error('[AMAP] SDK not available for geocoding');
        // 如果没有AMap，直接设置仓库数据（无坐标）
        setWarehouses(warehouseData.map(wh => ({ ...wh, lat: undefined, lng: undefined })));
        setShipments(shipmentData);
        return;
      }

      console.log('[AMAP] Starting geocoding for', warehouseData.length, 'warehouses');

      // 使用高德地理编码获取真实坐标
      const warehousesWithCoords: WarehouseLocation[] = [];
      const geocoder = new AMap.Geocoder();

      for (const wh of warehouseData) {
        let lat: number | undefined;
        let lng: number | undefined;

        // 优先使用数据库中已有的坐标（注意：数据库返回的是字符串格式）
        if (wh.lat && wh.lng) {
          lat = typeof wh.lat === 'string' ? parseFloat(wh.lat) : wh.lat;
          lng = typeof wh.lng === 'string' ? parseFloat(wh.lng) : wh.lng;
          console.log(`[AMAP] Using DB coordinates for ${wh.name}: (${lat}, ${lng})`);
        }
        // 如果没有坐标，则使用地址进行geocoding
        else if (wh.location) {
          try {
            const coords = await new Promise<{ lat: number, lng: number } | null>((resolve) => {
              geocoder.getLocation(wh.location, (status: string, result: any) => {
                console.log('[AMAP] Geocode result for', wh.location, ':', status);
                if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
                  const location = result.geocodes[0].location;
                  console.log(`[AMAP] Geocoded ${wh.location} -> (${location.lat}, ${location.lng})`);
                  resolve({ lat: location.lat, lng: location.lng });
                } else {
                  console.warn(`[AMAP] Geocode failed for: ${wh.location}`);
                  resolve(null);
                }
              });
            });
            if (coords) {
              lat = coords.lat;
              lng = coords.lng;
            }
          } catch (e) {
            console.error('[AMAP] Geocoding error:', e);
          }
        }

        warehousesWithCoords.push({
          ...wh,
          lat,
          lng,
        });
      }

      setWarehouses(warehousesWithCoords);
      setShipments(shipmentData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: '数据加载失败',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // 初始化地图
  const initMap = useCallback(async () => {
    console.log('[AMAP] initMap called, mapRef:', !!mapContainerRef.current, 'key:', !!AMAP_KEY);

    if (!mapContainerRef.current || !AMAP_KEY) {
      console.error('[AMAP] Cannot init: container or key missing');
      setLoading(false);
      return;
    }

    try {
      await loadAmapScript();

      const AMap = (window as any).AMap;
      console.log('[AMAP] Creating map instance...');

      // 创建地图实例，中心设在成都
      const map = new AMap.Map(mapContainerRef.current, {
        zoom: 10,
        center: [104.06, 30.67], // 成都坐标
        viewMode: '2D',
      });

      console.log('[AMAP] Map created successfully');
      mapInstanceRef.current = map;
      setMapLoaded(true);
      setLoading(false);

      // 加载数据
      await loadData();

    } catch (error) {
      console.error('Map init error:', error);
      setLoading(false);
      toast({
        title: '地图加载失败',
        description: '请检查网络连接和API Key配置',
        variant: 'destructive',
      });
    }
  }, [loadData, toast]);

  // 添加仓库标记
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || warehouses.length === 0) return;

    const AMap = (window as any).AMap;

    // 清除旧标记
    mapInstanceRef.current.clearMap();

    // 添加仓库标记
    warehouses.forEach((wh) => {
      if (wh.lat && wh.lng) {
        const marker = new AMap.Marker({
          position: [wh.lng, wh.lat],
          title: wh.name,
          icon: new AMap.Icon({
            size: new AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
          }),
        });

        // 信息窗口
        const infoWindow = new AMap.InfoWindow({
          content: `
            <div style="padding: 10px;">
              <h4 style="margin: 0 0 8px 0; font-weight: bold;">${wh.name}</h4>
              <p style="margin: 0; color: #666;">${wh.location || '位置未知'}</p>
              ${wh.code ? `<p style="margin: 4px 0 0; color: #888;">编码: ${wh.code}</p>` : ''}
            </div>
          `,
          offset: new AMap.Pixel(0, -30),
        });

        marker.on('click', () => {
          infoWindow.open(mapInstanceRef.current, marker.getPosition());
        });

        mapInstanceRef.current.add(marker);
      }
    });

    // 添加运输中的运输单标记
    shipments.forEach((shipment) => {
      // 如果有起点坐标
      if (shipment.originWarehouseId) {
        const wh = warehouses.find(w => w.id === shipment.originWarehouseId);
        if (wh && wh.lat && wh.lng) {
          const truckMarker = new AMap.Marker({
            position: [wh.lng + 0.02, wh.lat + 0.02], // 稍微偏移
            title: shipment.shipmentCode,
            icon: new AMap.Icon({
              size: new AMap.Size(32, 32),
              image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
            }),
          });

          const infoWindow = new AMap.InfoWindow({
            content: `
              <div style="padding: 10px;">
                <h4 style="margin: 0 0 8px 0; font-weight: bold;">${shipment.shipmentCode}</h4>
                <p style="margin: 0;">目的地: ${shipment.destinationAddress}</p>
                <p style="margin: 4px 0 0;">状态: 运输中</p>
                ${shipment.etaMinutes ? `<p style="margin: 4px 0 0;">预计: ${shipment.etaMinutes}分钟</p>` : ''}
              </div>
            `,
            offset: new AMap.Pixel(0, -30),
          });

          truckMarker.on('click', () => {
            infoWindow.open(mapInstanceRef.current, truckMarker.getPosition());
          });

          mapInstanceRef.current.add(truckMarker);
        }
      }
    });

  }, [warehouses, shipments, mapLoaded]);

  // 组件挂载时初始化地图
  useEffect(() => {
    initMap();

    return () => {
      // 清理地图实例
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
    };
  }, [initMap]);

  return (
    <div className="space-y-6 p-6">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            仓库地图
          </h1>
          <p className="text-muted-foreground">仓库位置和运输状态可视化</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">仓库数量</p>
                <p className="text-2xl font-bold">{warehouses.length}</p>
              </div>
              <Warehouse className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">运输中</p>
                <p className="text-2xl font-bold text-orange-600">{shipments.length}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 地图容器 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>地图视图</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                仓库
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                运输中
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!AMAP_KEY ? (
            <div className="h-[500px] flex items-center justify-center bg-muted">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">地图 API Key 未配置</p>
                <p className="text-muted-foreground">请在 .env 文件中配置 VITE_AMAP_KEY</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* 地图容器 - 始终渲染以获取ref */}
              <div
                ref={mapContainerRef}
                className="h-[500px] w-full"
                style={{ minHeight: '500px' }}
              />
              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">加载地图中...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 仓库列表 */}
      <Card>
        <CardHeader>
          <CardTitle>仓库列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((wh) => (
              <div
                key={wh.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{wh.name}</h4>
                    <p className="text-sm text-muted-foreground">{wh.location || '位置未设置'}</p>
                    {wh.code && <p className="text-xs text-muted-foreground mt-1">编码: {wh.code}</p>}
                  </div>
                  <Warehouse className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WarehouseMapPage;