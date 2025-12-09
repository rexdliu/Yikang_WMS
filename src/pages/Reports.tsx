// src/pages/Reports.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Lightbulb, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiService, RAGQueryResponse } from '@/services/api';
// 组件：AI 洞察卡片
const AIInsightCard = ({ title, message }: { title: string, message: string }) => (
  <Card className="bg-primary/5 border-primary/20">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
);
// 主页面组件
const Reports: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RAGQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 模拟 Text-to-SQL 后端调用
  const handleGenerateReport = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setRagResult(null);

    try {
      const response = await apiService.queryRag(query.trim());
      setRagResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI 智能报告中心</h1>
      
      {/* AI 生成的建议 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AIInsightCard 
          title="库存优化建议"
          message="高需求产品 iPhone 14 Pro 在下个月有 85% 的缺货风险。建议将安全库存提高 20%。"
        />
        <AIInsightCard 
          title="销售趋势洞察"
          message="“欧洲电子配件公司”的销售额环比增长了 40%，显示出强劲的市场增长潜力。"
        />
      </div>

      {/* Text2SQL 交互部分 */}
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
          <Textarea
            placeholder="例如: '显示所有电子产品的总销售额和当前库存' 或 '列出上个月销量最高的5种产品'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[100px]"
          />
          <Button onClick={handleGenerateReport} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? '正在生成...' : '生成报告'}
          </Button>

          {/* 报告结果展示区域 */}
          {isLoading && <p className="text-center text-muted-foreground p-4">AI 正在为您分析数据，请稍候...</p>}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default Reports;
