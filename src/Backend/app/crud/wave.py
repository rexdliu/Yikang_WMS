"""
波次 CRUD 操作
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from app.models.wave import Wave, WaveStatus, WavePriority
from app.models.sales import SalesOrder


class CRUDWave:
    """波次 CRUD 操作"""
    
    def generate_wave_code(self, db: Session) -> str:
        """生成波次编号"""
        today = datetime.now().strftime("%Y%m%d")
        # 查询今天已有的波次数量
        count = db.query(Wave).filter(
            Wave.wave_code.like(f"WAVE-{today}%")
        ).count()
        return f"WAVE-{today}-{count + 1:03d}"
    
    def get(self, db: Session, wave_id: int) -> Optional[Wave]:
        """获取单个波次"""
        return db.query(Wave).filter(Wave.id == wave_id).first()
    
    def get_by_code(self, db: Session, wave_code: str) -> Optional[Wave]:
        """通过编号获取波次"""
        return db.query(Wave).filter(Wave.wave_code == wave_code).first()
    
    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Wave]:
        """获取波次列表"""
        query = db.query(Wave)
        if status:
            query = query.filter(Wave.status == status)
        return query.order_by(Wave.created_at.desc()).offset(skip).limit(limit).all()
    
    def create(
        self, 
        db: Session, 
        carrier: Optional[str] = None,
        region: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        priority: WavePriority = WavePriority.normal,
        notes: Optional[str] = None
    ) -> Wave:
        """创建波次"""
        wave = Wave(
            wave_code=self.generate_wave_code(db),
            carrier=carrier,
            region=region,
            warehouse_id=warehouse_id,
            priority=priority,
            status=WaveStatus.pending,
            notes=notes
        )
        db.add(wave)
        db.commit()
        db.refresh(wave)
        return wave
    
    def add_orders_to_wave(
        self, 
        db: Session, 
        wave_id: int, 
        order_ids: List[int]
    ) -> Wave:
        """
        将订单添加到波次
        
        注意：不允许跨仓库添加订单到同一个波次
        """
        wave = self.get(db, wave_id)
        if not wave:
            raise ValueError(f"Wave {wave_id} not found")
        
        # 检查所有订单是否来自同一仓库
        orders = db.query(SalesOrder).filter(SalesOrder.id.in_(order_ids)).all()
        warehouses = set(o.warehouse_id for o in orders if o.warehouse_id)
        
        if len(warehouses) > 1:
            raise ValueError(
                f"不能将来自不同仓库的订单添加到同一个波次。"
                f"检测到 {len(warehouses)} 个不同仓库。"
                f"请按仓库分别生成波次。"
            )
        
        # 如果波次已有仓库，检查是否一致
        if wave.warehouse_id and warehouses and wave.warehouse_id not in warehouses:
            raise ValueError(
                f"订单仓库与波次仓库不一致。波次仓库ID: {wave.warehouse_id}"
            )
        
        # 如果波次没有仓库但订单有，设置波次仓库
        if not wave.warehouse_id and warehouses:
            wave.warehouse_id = list(warehouses)[0]
        
        # 更新订单的wave_id
        db.query(SalesOrder).filter(
            SalesOrder.id.in_(order_ids),
            SalesOrder.wave_id.is_(None)  # 只添加未分配的订单
        ).update({SalesOrder.wave_id: wave_id}, synchronize_session=False)
        
        # 更新波次的订单数和总数量
        stats = db.query(
            func.count(SalesOrder.id).label("count"),
            func.sum(SalesOrder.quantity).label("total")
        ).filter(SalesOrder.wave_id == wave_id).first()
        
        wave.order_count = stats.count or 0
        wave.total_quantity = stats.total or 0
        db.commit()
        db.refresh(wave)
        return wave
    
    def auto_generate_waves(
        self,
        db: Session,
        region: Optional[str] = None,
        warehouse_id: Optional[int] = None,
        max_orders_per_wave: int = 50
    ) -> List[Wave]:
        """
        自动生成波次
        
        根据区域/仓库将待处理订单分组生成波次
        """
        # 查询待处理且未分配波次的订单
        query = db.query(SalesOrder).filter(
            SalesOrder.status == "pending",
            SalesOrder.wave_id.is_(None)
        )
        
        if warehouse_id:
            query = query.filter(SalesOrder.warehouse_id == warehouse_id)
        
        pending_orders = query.all()
        
        if not pending_orders:
            return []
        
        # 按区域分组（使用经销商的地区）
        groups = {}
        for order in pending_orders:
            # 使用仓库ID作为分组键
            key = order.warehouse_id or 0
            if key not in groups:
                groups[key] = []
            groups[key].append(order.id)
        
        # 为每个分组创建波次
        waves = []
        for wh_id, order_ids in groups.items():
            # 分批创建波次
            for i in range(0, len(order_ids), max_orders_per_wave):
                batch = order_ids[i:i + max_orders_per_wave]
                wave = self.create(
                    db,
                    warehouse_id=wh_id if wh_id else None,
                    region=region
                )
                self.add_orders_to_wave(db, wave.id, batch)
                waves.append(wave)
        
        return waves
    
    def release_wave(self, db: Session, wave_id: int) -> Wave:
        """释放波次开始执行"""
        wave = self.get(db, wave_id)
        if not wave:
            raise ValueError(f"Wave {wave_id} not found")
        
        wave.status = WaveStatus.processing
        wave.released_at = datetime.now()
        
        # 更新关联订单状态为处理中
        db.query(SalesOrder).filter(
            SalesOrder.wave_id == wave_id
        ).update({SalesOrder.status: "processing"}, synchronize_session=False)
        
        db.commit()
        db.refresh(wave)
        return wave
    
    def complete_wave(self, db: Session, wave_id: int) -> Wave:
        """完成波次"""
        wave = self.get(db, wave_id)
        if not wave:
            raise ValueError(f"Wave {wave_id} not found")
        
        wave.status = WaveStatus.completed
        wave.completed_at = datetime.now()
        db.commit()
        db.refresh(wave)
        return wave
    
    def get_wave_orders(self, db: Session, wave_id: int) -> List[SalesOrder]:
        """获取波次包含的订单"""
        return db.query(SalesOrder).filter(SalesOrder.wave_id == wave_id).all()


# 单例
wave_crud = CRUDWave()
