"""
高德地图 API 服务

提供地址解析、距离计算、ETA预测等功能
"""

import os
import httpx
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta


class AmapService:
    """高德地图 API 服务"""
    
    BASE_URL = "https://restapi.amap.com/v3"
    
    def __init__(self):
        self.api_key = os.getenv("AMAP_KEY", "")
        if not self.api_key:
            raise ValueError("AMAP_KEY environment variable is required")
    
    async def geocode(self, address: str) -> Optional[Dict[str, Any]]:
        """
        地址解析 - 将地址转换为经纬度
        
        Args:
            address: 详细地址字符串
            
        Returns:
            包含经纬度的字典，如 {"lng": 116.397428, "lat": 39.90923, "formatted_address": "..."}
        """
        url = f"{self.BASE_URL}/geocode/geo"
        params = {
            "key": self.api_key,
            "address": address,
            "output": "JSON"
        }
        
        print(f"[AMAP] Geocoding address: {address}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10.0)
                data = response.json()
                
                if data.get("status") == "1" and data.get("geocodes"):
                    geocode = data["geocodes"][0]
                    location = geocode.get("location", "").split(",")
                    if len(location) == 2:
                        print(f"[AMAP] Geocoded: {address} -> ({location[1]}, {location[0]})")
                        return {
                            "lng": float(location[0]),
                            "lat": float(location[1]),
                            "formatted_address": geocode.get("formatted_address", address)
                        }
                else:
                    print(f"[AMAP] Geocode failed for {address}: {data.get('info')}")
            except Exception as e:
                print(f"[AMAP] Geocode error: {e}")
        
        return None
    
    async def get_distance_and_duration(
        self, 
        origin: Tuple[float, float], 
        destination: Tuple[float, float],
        strategy: int = 0
    ) -> Optional[Dict[str, Any]]:
        """
        获取两点之间的驾车距离和预计时间
        
        Args:
            origin: 起点坐标 (lng, lat)
            destination: 终点坐标 (lng, lat)
            strategy: 驾车策略 0=速度优先, 2=距离优先, 4=躲避拥堵
            
        Returns:
            包含距离和时间的字典，如 {"distance": 12000, "duration": 1800, "eta_minutes": 30}
        """
        url = f"{self.BASE_URL}/direction/driving"
        params = {
            "key": self.api_key,
            "origin": f"{origin[0]},{origin[1]}",
            "destination": f"{destination[0]},{destination[1]}",
            "strategy": strategy,
            "output": "JSON"
        }
        
        print(f"[AMAP] Calling driving API: {origin} -> {destination}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10.0)
                data = response.json()
                
                print(f"[AMAP] Driving API response status: {data.get('status')}, info: {data.get('info')}")
                
                if data.get("status") == "1" and data.get("route", {}).get("paths"):
                    path = data["route"]["paths"][0]
                    distance = int(path.get("distance", 0))  # 米
                    duration = int(path.get("duration", 0))  # 秒
                    
                    print(f"[AMAP] Route calculated: {distance/1000:.1f} km, {duration/60:.0f} minutes")
                    
                    return {
                        "distance": distance,  # 米
                        "distance_km": round(distance / 1000, 2),  # 公里
                        "duration": duration,  # 秒
                        "eta_minutes": round(duration / 60),  # 分钟
                        "eta_hours": round(duration / 3600, 2)  # 小时
                    }
                else:
                    print(f"[AMAP] Driving API failed: {data}")
            except Exception as e:
                print(f"[AMAP] Distance calculation error: {e}")
        
        return None
    
    async def calculate_eta(
        self,
        origin_address: str,
        destination_address: str,
        departure_time: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        """
        计算从起点地址到终点地址的预计到达时间
        
        Args:
            origin_address: 起点地址
            destination_address: 终点地址
            departure_time: 出发时间，默认为当前时间
            
        Returns:
            包含ETA信息的字典
        """
        # 解析起点地址
        origin_geo = await self.geocode(origin_address)
        if not origin_geo:
            return {"error": "无法解析起点地址"}
        
        # 解析终点地址
        dest_geo = await self.geocode(destination_address)
        if not dest_geo:
            return {"error": "无法解析终点地址"}
        
        # 计算距离和时间
        route_info = await self.get_distance_and_duration(
            (origin_geo["lng"], origin_geo["lat"]),
            (dest_geo["lng"], dest_geo["lat"])
        )
        
        if not route_info:
            return {"error": "无法计算路线"}
        
        # 计算预计到达时间
        if departure_time is None:
            departure_time = datetime.now()
        
        estimated_arrival = departure_time + timedelta(seconds=route_info["duration"])
        
        return {
            "origin": origin_geo,
            "destination": dest_geo,
            "distance_km": route_info["distance_km"],
            "eta_minutes": route_info["eta_minutes"],
            "departure_time": departure_time.isoformat(),
            "estimated_arrival": estimated_arrival.isoformat()
        }


# 单例实例
_amap_service: Optional[AmapService] = None


def get_amap_service() -> AmapService:
    """获取 AmapService 单例"""
    global _amap_service
    if _amap_service is None:
        _amap_service = AmapService()
    return _amap_service
