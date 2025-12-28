"""
报告 API 路由

提供报告生成、查询、导出等 API 端点
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import Response, HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.report import Report, AIInsight, ReportStatus, InsightType, InsightPriority
from app.services.report_service import ReportService, InsightService

router = APIRouter()


# Pydantic Models
class ReportCreate(BaseModel):
    query: str
    title: Optional[str] = None


class ReportResponse(BaseModel):
    id: int
    user_id: int
    title: str
    query: str
    content: Optional[str]
    summary: Optional[str]
    status: str
    error_message: Optional[str]
    is_starred: bool
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int


class InsightResponse(BaseModel):
    id: int
    type: str
    priority: str
    title: str
    message: str
    is_handled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InsightListResponse(BaseModel):
    insights: List[InsightResponse]
    pending_count: int


class ReportStatsResponse(BaseModel):
    pending_insights: int
    weekly_reports: int
    accuracy_rate: float
    last_updated: datetime


# Routes

@router.get("/stats", response_model=ReportStatsResponse)
async def get_report_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取报告统计数据"""
    insight_service = InsightService(db)
    report_service = ReportService(db)
    
    # 获取待处理洞察数
    pending_insights = len(insight_service.get_user_insights(
        user_id=current_user.id, 
        include_handled=False
    ))
    
    # 获取本周报告数
    from datetime import timedelta
    week_ago = datetime.now() - timedelta(days=7)
    weekly_reports = db.query(Report).filter(
        Report.user_id == current_user.id,
        Report.created_at >= week_ago,
        Report.is_deleted == False
    ).count()
    
    return ReportStatsResponse(
        pending_insights=pending_insights,
        weekly_reports=weekly_reports,
        accuracy_rate=94.5,  # 模拟数据
        last_updated=datetime.now()
    )


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    生成 AI 报告
    
    使用 Dify AI 根据用户查询生成专业分析报告
    """
    report_service = ReportService(db)
    
    try:
        report = await report_service.generate_report(
            user_id=current_user.id,
            query=request.query,
            title=request.title
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", response_model=ReportListResponse)
async def list_reports(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取用户的报告列表"""
    report_service = ReportService(db)
    
    reports = report_service.get_user_reports(
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    total = db.query(Report).filter(
        Report.user_id == current_user.id,
        Report.is_deleted == False
    ).count()
    
    return ReportListResponse(reports=reports, total=total)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取单个报告详情"""
    report_service = ReportService(db)
    report = report_service.get_report(report_id, current_user.id)
    
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    return report


@router.post("/{report_id}/star")
async def star_report(
    report_id: int,
    starred: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """收藏/取消收藏报告"""
    report_service = ReportService(db)
    report = report_service.star_report(report_id, current_user.id, starred)
    
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    return {"success": True, "is_starred": report.is_starred}


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除报告"""
    report_service = ReportService(db)
    success = report_service.delete_report(report_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    return {"success": True}


@router.get("/{report_id}/export/markdown")
async def export_report_markdown(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """导出报告为 Markdown"""
    report_service = ReportService(db)
    report = report_service.get_report(report_id, current_user.id)
    
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    if report.status != ReportStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="报告尚未生成完成")
    
    markdown_content = report_service.export_report_markdown(report)
    
    return Response(
        content=markdown_content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{report.title}.md"'
        }
    )


@router.get("/{report_id}/export/html", response_class=HTMLResponse)
async def export_report_html(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """导出报告为 HTML (可用于打印为 PDF)"""
    report_service = ReportService(db)
    report = report_service.get_report(report_id, current_user.id)
    
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    if report.status != ReportStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="报告尚未生成完成")
    
    html_content = report_service.export_report_html(report)
    
    return HTMLResponse(content=html_content)


@router.get("/{report_id}/preview", response_class=HTMLResponse)
async def preview_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """预览报告 (HTML 格式)"""
    report_service = ReportService(db)
    report = report_service.get_report(report_id, current_user.id)
    
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    if report.status == ReportStatus.GENERATING:
        return HTMLResponse(content="<p>报告正在生成中...</p>")
    
    if report.status == ReportStatus.FAILED:
        return HTMLResponse(content=f"<p>报告生成失败: {report.error_message}</p>")
    
    html_content = report_service.export_report_html(report)
    return HTMLResponse(content=html_content)


# Insights Routes

@router.get("/insights/list", response_model=InsightListResponse)
async def list_insights(
    include_handled: bool = False,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取洞察列表"""
    insight_service = InsightService(db)
    
    insights = insight_service.get_user_insights(
        user_id=current_user.id,
        include_handled=include_handled,
        limit=limit
    )
    
    pending_count = db.query(AIInsight).filter(
        AIInsight.is_handled == False
    ).count()
    
    return InsightListResponse(insights=insights, pending_count=pending_count)


@router.post("/insights/generate")
async def generate_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    生成新的洞察
    
    分析当前数据并生成智能洞察
    """
    insight_service = InsightService(db)
    
    try:
        insights = insight_service.generate_insights()
        saved = insight_service.save_insights(insights)
        
        return {
            "success": True,
            "generated_count": len(saved),
            "insights": [
                {
                    "id": i.id,
                    "type": i.type.value,
                    "priority": i.priority.value,
                    "title": i.title,
                    "message": i.message
                }
                for i in saved
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights/{insight_id}/handle")
async def handle_insight(
    insight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """标记洞察为已处理"""
    insight_service = InsightService(db)
    
    insight = insight_service.mark_insight_handled(insight_id, current_user.id)
    
    if not insight:
        raise HTTPException(status_code=404, detail="洞察不存在")
    
    return {"success": True, "is_handled": insight.is_handled}
