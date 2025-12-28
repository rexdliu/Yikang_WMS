// src/pages/Reports.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain, Lightbulb, Loader2, TrendingUp, AlertTriangle, Package,
  FileText, ChevronDown, ChevronUp, Check, Clock, Download,
  Star, Trash2, Mic, Sparkles, BarChart3, RefreshCw, Eye, X
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiService, RAGQueryResponse, AIReport } from '@/services/api';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Types
interface Insight {
  id: string;
  type: 'suggestion' | 'trend' | 'warning';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  handled: boolean;
}

interface ReportTemplate {
  id: string;
  icon: React.ReactNode;
  name: string;
  query: string;
}

interface ReportHistory {
  id: string;
  name: string;
  generatedAt: Date;
  status: 'completed' | 'generating' | 'failed';
  starred: boolean;
  content?: string;  // 报告内容 (Markdown 格式)
}

// Mock data
const mockInsights: Insight[] = [
  {
    id: '1',
    type: 'warning',
    title: '库存预警',
    message: '高需求产品 iPhone 14 Pro 在下个月有 85% 的缺货风险。建议将安全库存提高 20%。',
    priority: 'high',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    handled: false
  },
  {
    id: '2',
    type: 'trend',
    title: '销售趋势洞察',
    message: '"欧洲电子配件公司"的销售额环比增长了 40%，显示出强劲的市场增长潜力。',
    priority: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    handled: false
  },
  {
    id: '3',
    type: 'suggestion',
    title: '库存优化建议',
    message: '仓库 A 的空间利用率仅为 45%，建议将部分库存从仓库 B 调拨至仓库 A。',
    priority: 'low',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    handled: true
  },
  {
    id: '4',
    type: 'warning',
    title: '滞销品预警',
    message: '产品 "办公椅-高级版" 已超过 90 天无销售记录，建议启动促销活动。',
    priority: 'medium',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    handled: false
  }
];

const reportTemplates: ReportTemplate[] = [
  { id: '1', icon: <Package className="h-5 w-5" />, name: '库存周报', query: '生成本周库存变动报告，包括入库、出库和调整记录' },
  { id: '2', icon: <BarChart3 className="h-5 w-5" />, name: '销售月报', query: '分析本月销售数据，包括订单量、销售额和增长趋势' },
  { id: '3', icon: <RefreshCw className="h-5 w-5" />, name: '库存周转', query: '计算各产品的库存周转率，找出周转慢的产品' },
  { id: '4', icon: <TrendingUp className="h-5 w-5" />, name: '畅销品排行', query: '列出销量排名前10的产品及其详细信息' },
  { id: '5', icon: <AlertTriangle className="h-5 w-5" />, name: '滞销预警', query: '找出超过60天无销售记录的滞销产品' },
  { id: '6', icon: <FileText className="h-5 w-5" />, name: '仓库利用率', query: '分析各仓库的空间利用率和库存分布' }
];

const hotQueries = [
  '本月销售总额',
  '低库存产品',
  '各仓库库存',
  '热销产品TOP5',
  '库存价值统计'
];

// Utility functions
const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
  return `${Math.floor(seconds / 86400)}天前`;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
    default: return 'bg-muted';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'warning': return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'trend': return <TrendingUp className="h-5 w-5 text-blue-500" />;
    case 'suggestion': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    default: return <Lightbulb className="h-5 w-5" />;
  }
};

// Components

// 关键指标概览
const MetricsOverview: React.FC<{ insights: Insight[], reportsCount: number }> = ({ insights, reportsCount }) => {
  const pendingCount = insights.filter(i => !i.handled).length;
  const accuracy = 94.5;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="relative">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">待处理洞察</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <div className="relative">
              <Lightbulb className="h-8 w-8 text-muted-foreground/50" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">本周报告</p>
              <p className="text-2xl font-bold">{reportsCount}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">分析准确率</p>
              <p className="text-2xl font-bold">{accuracy}%</p>
            </div>
            <Brain className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">最后更新</p>
              <p className="text-lg font-semibold">{formatTimeAgo(new Date())}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// 增强版 AI 洞察卡片
const EnhancedInsightCard: React.FC<{
  insight: Insight;
  onHandle: (id: string) => void;
  onGenerateReport: (message: string) => void;
}> = ({ insight, onHandle, onGenerateReport }) => {
  const priorityLabels = { high: '高', medium: '中', low: '低' };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
      insight.handled && "opacity-60"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(insight.type)}
            <CardTitle className="text-base">{insight.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", getPriorityColor(insight.priority))}>
              {priorityLabels[insight.priority]}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatTimeAgo(insight.timestamp)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{insight.message}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            查看详情
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onHandle(insight.id)}
            disabled={insight.handled}
          >
            <Check className="h-3 w-3 mr-1" />
            {insight.handled ? '已处理' : '标记已处理'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onGenerateReport(insight.message)}
          >
            <FileText className="h-3 w-3 mr-1" />
            生成报告
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 报告模板卡片
const TemplateCard: React.FC<{
  template: ReportTemplate;
  onClick: () => void;
}> = ({ template, onClick }) => (
  <Card
    className="min-w-[140px] cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/50"
    onClick={onClick}
  >
    <CardContent className="pt-4 pb-3 px-4 flex flex-col items-center text-center gap-2">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {template.icon}
      </div>
      <span className="text-sm font-medium">{template.name}</span>
    </CardContent>
  </Card>
);

// 历史报告列表
const ReportHistoryList: React.FC<{
  history: ReportHistory[];
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (report: ReportHistory) => void;
  onDownload: (report: ReportHistory) => void;
}> = ({ history, onStar, onDelete, onPreview, onDownload }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Clock className="h-4 w-4" />
        最近生成的报告
      </CardTitle>
    </CardHeader>
    <CardContent>
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">暂无报告记录</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>报告名称</TableHead>
              <TableHead>生成时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map(report => (
              <TableRow key={report.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {report.starred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                  {report.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatTimeAgo(report.generatedAt)}</TableCell>
                <TableCell>
                  <Badge variant={report.status === 'completed' ? 'default' : report.status === 'generating' ? 'secondary' : 'destructive'}>
                    {report.status === 'completed' ? '已完成' : report.status === 'generating' ? '生成中' : '失败'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="查看"
                      onClick={() => onPreview(report)}
                      disabled={report.status !== 'completed'}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="下载"
                      onClick={() => onDownload(report)}
                      disabled={report.status !== 'completed'}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={report.starred ? '取消收藏' : '收藏'}
                      onClick={() => onStar(report.id)}
                    >
                      <Star className={cn("h-3 w-3", report.starred && "fill-yellow-500 text-yellow-500")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      title="删除"
                      onClick={() => onDelete(report.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
);

// 主页面组件
const Reports: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RAGQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>(mockInsights);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([
    { id: '1', name: '11月销售分析报告', generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), status: 'completed', starred: true, content: '## 11月销售分析报告\n\n本月销售总额达到 ¥1,250,000，环比增长 15%。\n\n### 主要亮点\n- 电子产品销售增长 25%\n- 新客户增加 120 家\n- 平均订单金额提升 8%\n\n### 建议\n1. 继续加大电子产品库存\n2. 优化物流配送效率' },
    { id: '2', name: '库存周转率分析', generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), status: 'completed', starred: false, content: '## 库存周转率分析\n\n当前平均库存周转率为 4.2 次/年。\n\n### 周转率分布\n- 快消品: 8.5 次/年\n- 电子产品: 5.2 次/年\n- 办公用品: 2.1 次/年' },
    { id: '3', name: '滞销品清单', generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48), status: 'completed', starred: false, content: '## 滞销品清单\n\n以下产品超过 90 天无销售记录：\n\n1. 办公椅-高级版 (SKU: OC-001)\n2. 打印机墨盒-彩色 (SKU: PC-023)\n3. 文件柜-三层 (SKU: FC-012)' }
  ]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<ReportHistory | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsInitialLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleGenerateReport = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setRagResult(null);

    try {
      const response = await apiService.queryRag(query.trim());
      setRagResult(response);

      // Add to history with AI-generated content
      setReportHistory(prev => [{
        id: Date.now().toString(),
        name: query.slice(0, 30) + (query.length > 30 ? '...' : ''),
        generatedAt: new Date(),
        status: 'completed',
        starred: false,
        content: response.answer  // 保存 AI 生成的内容
      }, ...prev]);

      toast({
        title: "报告生成成功",
        description: "AI 已完成分析，报告已添加到历史记录",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkInsightHandled = (id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, handled: true } : i));
  };

  const handleTemplateClick = (template: ReportTemplate) => {
    setQuery(template.query);
  };

  const handleStarReport = (id: string) => {
    setReportHistory(prev => prev.map(r => r.id === id ? { ...r, starred: !r.starred } : r));
  };

  const handleDeleteReport = (id: string) => {
    setReportHistory(prev => prev.filter(r => r.id !== id));
  };

  const handlePreviewReport = (report: ReportHistory) => {
    setPreviewReport(report);
  };

  const handleDownloadReport = (report: ReportHistory) => {
    // 创建 Markdown 内容
    const content = `# ${report.name}

**生成时间**: ${report.generatedAt.toLocaleString('zh-CN')}

---

${report.content || '报告内容不可用'}
`;

    // 创建 Blob 并下载
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "下载成功",
      description: `报告 "${report.name}" 已下载`,
    });
  };

  const visibleInsights = showAllInsights ? insights : insights.slice(0, 2);

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI 智能报告中心</h1>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新洞察
        </Button>
      </div>

      {/* 1. 关键指标概览 */}
      <MetricsOverview insights={insights} reportsCount={reportHistory.length} />

      {/* 2. AI 洞察卡片 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 洞察
          </h2>
          {insights.length > 2 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAllInsights(!showAllInsights)}>
              {showAllInsights ? (
                <>收起 <ChevronUp className="h-4 w-4 ml-1" /></>
              ) : (
                <>显示全部 ({insights.length}) <ChevronDown className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleInsights.map(insight => (
            <EnhancedInsightCard
              key={insight.id}
              insight={insight}
              onHandle={handleMarkInsightHandled}
              onGenerateReport={(msg) => setQuery(msg)}
            />
          ))}
        </div>
      </div>

      {/* 3. 报告模板快捷区 */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">常用报告模板</h2>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {reportTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => handleTemplateClick(template)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* 4. 自然语言输入区 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <span>生成自定义报告</span>
          </CardTitle>
          <CardDescription>
            用自然语言提问，即时从您的数据中生成报告。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 热门查询标签 */}
          <div className="flex flex-wrap gap-2">
            {hotQueries.map((q, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setQuery(q)}
              >
                {q}
              </Badge>
            ))}
          </div>

          {/* 输入框 */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                placeholder="例如: '显示所有电子产品的总销售额和当前库存' 或 '列出上个月销量最高的5种产品'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[100px] pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                title="语音输入"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button onClick={handleGenerateReport} disabled={isLoading || !query.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? '正在生成...' : '生成报告'}
          </Button>

          {/* 报告结果展示区域 */}
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {error && (
            <p className="text-center text-destructive bg-destructive/10 border border-destructive/40 rounded-md p-3">
              {error}
            </p>
          )}

          {ragResult && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>分析结论</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {ragResult.answer}
                  </pre>
                </CardContent>
              </Card>
              {ragResult.sources && ragResult.sources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>参考知识片段</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>标题</TableHead>
                          <TableHead>分类</TableHead>
                          <TableHead>摘要</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ragResult.sources.map((source) => (
                          <TableRow key={source.id}>
                            <TableCell className="font-medium">{source.title}</TableCell>
                            <TableCell>{source.category}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {source.content}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. 历史报告列表 */}
      <ReportHistoryList
        history={reportHistory}
        onStar={handleStarReport}
        onDelete={handleDeleteReport}
        onPreview={handlePreviewReport}
        onDownload={handleDownloadReport}
      />

      {/* 预览对话框 */}
      <Dialog open={!!previewReport} onOpenChange={(open) => !open && setPreviewReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewReport?.name}</DialogTitle>
            <DialogDescription>
              生成时间: {previewReport?.generatedAt.toLocaleString('zh-CN')}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {previewReport?.content?.split('\n').map((line, i) => {
              if (line.startsWith('## ')) {
                return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={i} className="text-base font-medium mt-3 mb-1">{line.slice(4)}</h3>;
              } else if (line.startsWith('- ')) {
                return <li key={i} className="ml-4">{line.slice(2)}</li>;
              } else if (line.match(/^\d+\. /)) {
                return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
              } else if (line.trim() === '') {
                return <br key={i} />;
              }
              return <p key={i} className="my-1">{line}</p>;
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewReport(null)}>
              关闭
            </Button>
            <Button onClick={() => previewReport && handleDownloadReport(previewReport)}>
              <Download className="h-4 w-4 mr-2" />
              下载报告
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;

