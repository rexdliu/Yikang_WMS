"""
报告服务

提供 AI 报告生成、洞察分析等功能
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.models.report import Report, AIInsight, ReportStatus, InsightType, InsightPriority
from app.models.product import Product
from app.models.inventory import Inventory, Warehouse
from app.models.sales import SalesOrder
from app.services.dify_service import get_dify_service
from app.services.inventory_analyzer import InventoryAnalyzer


class ReportService:
    """报告生成服务"""
    
    def __init__(self, db: Session):
        self.db = db
        self.dify = get_dify_service()
        self.analyzer = InventoryAnalyzer(db)
    
    async def generate_report(
        self, 
        user_id: int, 
        query: str, 
        title: Optional[str] = None
    ) -> Report:
        """
        生成 AI 报告
        
        1. 创建报告记录 (generating 状态)
        2. 获取相关数据上下文
        3. 调用 Dify AI 生成报告
        4. 更新报告内容和状态
        """
        # 创建报告记录
        report = Report(
            user_id=user_id,
            title=title or query[:50] + ('...' if len(query) > 50 else ''),
            query=query,
            status=ReportStatus.GENERATING
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        
        try:
            # 获取数据上下文
            context = self.analyzer.query_by_intent(query)
            
            # 构建详细的报告生成提示
            report_prompt = f"""请根据以下数据生成一份专业的分析报告：

## 用户查询
{query}

## 实时数据
{context}

## 报告要求
1. 使用清晰的标题和段落结构
2. 包含数据摘要和关键发现
3. 提供可操作的建议
4. 使用 Markdown 格式
5. 数据准确，不要编造

请生成报告："""
            
            # 调用 Dify AI
            result = await self.dify.chat(
                message=report_prompt,
                user_id=str(user_id),
                context=None  # 上下文已包含在 prompt 中
            )
            
            if "error" in result:
                raise Exception(result["error"])
            
            # 更新报告
            report.content = result.get("answer", "报告生成失败")
            report.summary = self._extract_summary(report.content)
            report.status = ReportStatus.COMPLETED
            report.completed_at = datetime.now()
            
        except Exception as e:
            report.status = ReportStatus.FAILED
            report.error_message = str(e)
        
        self.db.commit()
        self.db.refresh(report)
        return report
    
    def _extract_summary(self, content: str, max_length: int = 200) -> str:
        """从报告内容中提取摘要"""
        # 简单实现：取第一段非标题内容
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                return line[:max_length] + ('...' if len(line) > max_length else '')
        return content[:max_length]
    
    def get_user_reports(
        self, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 20,
        include_deleted: bool = False
    ) -> List[Report]:
        """获取用户的报告列表"""
        query = self.db.query(Report).filter(Report.user_id == user_id)
        if not include_deleted:
            query = query.filter(Report.is_deleted == False)
        return query.order_by(desc(Report.created_at)).offset(skip).limit(limit).all()
    
    def get_report(self, report_id: int, user_id: int) -> Optional[Report]:
        """获取单个报告"""
        return self.db.query(Report).filter(
            Report.id == report_id,
            Report.user_id == user_id,
            Report.is_deleted == False
        ).first()
    
    def star_report(self, report_id: int, user_id: int, starred: bool = True) -> Optional[Report]:
        """收藏/取消收藏报告"""
        report = self.get_report(report_id, user_id)
        if report:
            report.is_starred = starred
            self.db.commit()
            self.db.refresh(report)
        return report
    
    def delete_report(self, report_id: int, user_id: int) -> bool:
        """软删除报告"""
        report = self.get_report(report_id, user_id)
        if report:
            report.is_deleted = True
            self.db.commit()
            return True
        return False
    
    def export_report_markdown(self, report: Report) -> str:
        """导出报告为 Markdown"""
        return f"""# {report.title}

**生成时间**: {report.created_at.strftime('%Y-%m-%d %H:%M')}
**查询**: {report.query}

---

{report.content}
"""
    
    def export_report_html(self, report: Report) -> str:
        """导出报告为 HTML"""
        import markdown
        md_content = self.export_report_markdown(report)
        html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
        
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{report.title}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #1a1a1a; }}
        h2, h3 {{ color: #333; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f5f5f5; }}
        code {{ background-color: #f5f5f5; padding: 2px 5px; border-radius: 3px; }}
    </style>
</head>
<body>
{html_content}
</body>
</html>"""


class InsightService:
    """洞察分析服务"""
    
    def __init__(self, db: Session):
        self.db = db
        self.analyzer = InventoryAnalyzer(db)
    
    def generate_insights(self) -> List[AIInsight]:
        """
        自动生成洞察
        
        分析库存、销售等数据，生成智能洞察
        """
        insights = []
        
        # 1. 低库存预警
        low_stock_items = self.analyzer.get_low_stock_items(limit=5)
        for item in low_stock_items:
            insights.append(AIInsight(
                type=InsightType.WARNING,
                priority=InsightPriority.HIGH if item['shortage'] > 10 else InsightPriority.MEDIUM,
                title=f"低库存预警: {item['product_name']}",
                message=f"产品 {item['product_name']} (SKU: {item['sku']}) 当前库存 {item['current_stock']} 件，低于最低库存线 {item['min_stock_level']} 件，缺口 {item['shortage']} 件。建议尽快补货。",
                related_product_id=None  # 可以通过 SKU 查找
            ))
        
        # 2. 销售趋势洞察
        try:
            trend = self.analyzer.get_sales_trend(days=7)
            if trend['total_orders'] > 0:
                avg_daily = trend['total_orders'] / 7
                insights.append(AIInsight(
                    type=InsightType.TREND,
                    priority=InsightPriority.MEDIUM,
                    title="销售趋势分析",
                    message=f"近7天共产生 {trend['total_orders']} 笔订单，总收入 ¥{trend['total_revenue']:,.2f}，日均订单 {avg_daily:.1f} 笔。"
                ))
        except:
            pass
        
        # 3. 仓库库存分布建议
        warehouse_stats = self.analyzer.get_inventory_by_warehouse()
        if len(warehouse_stats) > 1:
            max_wh = max(warehouse_stats, key=lambda x: x['total_quantity'])
            min_wh = min(warehouse_stats, key=lambda x: x['total_quantity'])
            if max_wh['total_quantity'] > min_wh['total_quantity'] * 3:
                insights.append(AIInsight(
                    type=InsightType.SUGGESTION,
                    priority=InsightPriority.LOW,
                    title="库存分布优化建议",
                    message=f"仓库 {max_wh['warehouse']} 库存量 ({max_wh['total_quantity']} 件) 远高于 {min_wh['warehouse']} ({min_wh['total_quantity']} 件)，建议考虑调拨部分库存以平衡各仓库负载。"
                ))
        
        return insights
    
    def get_user_insights(
        self, 
        user_id: Optional[int] = None,
        include_handled: bool = False,
        limit: int = 10
    ) -> List[AIInsight]:
        """获取洞察列表"""
        query = self.db.query(AIInsight)
        
        if user_id:
            query = query.filter(
                (AIInsight.user_id == user_id) | (AIInsight.user_id == None)
            )
        
        if not include_handled:
            query = query.filter(AIInsight.is_handled == False)
        
        # 过滤过期的洞察
        query = query.filter(
            (AIInsight.expires_at == None) | (AIInsight.expires_at > datetime.now())
        )
        
        return query.order_by(
            desc(AIInsight.priority == InsightPriority.HIGH),
            desc(AIInsight.created_at)
        ).limit(limit).all()
    
    def mark_insight_handled(
        self, 
        insight_id: int, 
        user_id: int
    ) -> Optional[AIInsight]:
        """标记洞察为已处理"""
        insight = self.db.query(AIInsight).filter(AIInsight.id == insight_id).first()
        if insight:
            insight.is_handled = True
            insight.handled_at = datetime.now()
            insight.handled_by = user_id
            self.db.commit()
            self.db.refresh(insight)
        return insight
    
    def save_insights(self, insights: List[AIInsight]) -> List[AIInsight]:
        """保存洞察到数据库"""
        for insight in insights:
            # 设置过期时间 (7天后)
            insight.expires_at = datetime.now() + timedelta(days=7)
            self.db.add(insight)
        self.db.commit()
        return insights
