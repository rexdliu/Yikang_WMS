import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiService, RAGQueryResponse } from '@/services/api';

const DEFAULT_PROMPT = '请根据仓库知识库总结库存优化与服务协同的重点建议。';
const Analytics: React.FC = () => {
  const [result, setResult] = useState<RAGQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.queryRag(DEFAULT_PROMPT, 4);
        setResult(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载分析洞察失败');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">智能分析概览</h1>
        <p className="text-sm text-muted-foreground">
          来自知识检索的实时建议，用于支撑库存、服务与运营决策。
        </p>
      </div>

      {loading && !result && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="text-destructive p-6">
            {error}
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>综合建议</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {result.answer}
              </pre>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {result.sources.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <CardTitle className="text-base">{source.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">分类：{source.category}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {source.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
