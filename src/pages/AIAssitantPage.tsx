import React, { useState, useRef, useEffect } from 'react';
import { useAIStore } from '@/stores';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, Package, BarChart3, Bot, Send, Mic, Paperclip, Upload, Volume2, VolumeX, Plus, History } from 'lucide-react';
import aiIcon from '@/assets/chatBot.svg';

const AIAssistantPage: React.FC = () => {
  const {
    isLoading,
    messages,
    suggestions,
    addMessage,
    setLoading
  } = useAIStore();
  
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !uploadedFile) return;

    let messageContent = input;
    if (uploadedFile) {
      messageContent += uploadedFile ? ` [Uploaded: ${uploadedFile.name}]` : '';
    }

    addMessage(messageContent, 'user');
    const currentInput = input;
    setInput('');
    setUploadedFile(null);
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: { [key: string]: string } = {
  'low stock': "根据当前库存数据，发现有 3 个商品库存极低，需立即处理：iPhone 14 Pro、办公椅、Samsung Galaxy S23。",
  'demand': "我已分析你的销售数据。预计“电子产品”类在下个季度的需求将增长 25%，特别是新款智能手机。",
  'optimize': "为了将拣货效率提升 15%，建议将高频商品如 'APPL-IP14P-256' 移至 A 区，第 1-3 号货架。",
  'default': "我正在处理你的请求。根据当前数据，我可以生成库存报告、预测补货需求或分析销售趋势。你想重点了解哪一部分？"
};
      
      const responseKey = Object.keys(responses).find(key => currentInput.toLowerCase().includes(key)) || 'default';
      addMessage(responses[responseKey], 'assistant');
      setLoading(false);
    }, 1500);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording logic here
      setIsRecording(false);
      // You would implement actual speech recognition here
      setInput(input + " [Voice input processed]");
    } else {
      // Start recording logic here
      setIsRecording(true);
      // You would implement actual speech recognition here
    }
  };

  const handleNewChat = () => {
    // In a real implementation, this would call an API to start a new chat session
    // For now, we'll just show an alert
    alert('新聊天功能将在后端实现后可用');
  };

  const handleViewHistory = () => {
    // In a real implementation, this would fetch chat history from the backend
    setShowHistory(!showHistory);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Full height minus header */}
      {/* Left Panel: Insights & Suggestions */}
      <div className="hidden lg:flex flex-col w-80 border-r border-border p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">AI 监控</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleNewChat} title="新建聊天">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewHistory} title="查看历史">
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {showHistory && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">最近聊天</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="text-muted-foreground text-xs">30天内的聊天记录功能将在后端实现后可用</div>
              <div className="p-2 rounded border cursor-pointer hover:bg-muted">
                <div className="font-medium">库存分析请求</div>
                <div className="text-muted-foreground text-xs">2025-08-20</div>
              </div>
              <div className="p-2 rounded border cursor-pointer hover:bg-muted">
                <div className="font-medium">补货建议</div>
                <div className="text-muted-foreground text-xs">2025-08-18</div>
              </div>
            </CardContent>
          </Card>
        )}

        {uploadedFile && (
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              File ready: {uploadedFile.name}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setUploadedFile(null)}
                className="ml-2 h-6 w-6 p-0"
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              <span>主动洞察</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>High return rate detected for <Badge variant="secondary">FURN-OC-001</Badge>. Recommend quality check.</div>
            <div>Consider ordering <Badge variant="secondary">150 units</Badge> of iPhone 14 Pro to meet demand.</div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">快速操作</h3>
          <div className="flex flex-col space-y-2">
            {suggestions.map((suggestion, index) => (
              <Button key={index} variant="outline" size="sm" className="justify-start" onClick={() => setInput(suggestion)}>
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex flex-1 flex-col h-full">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={aiIcon} alt="AI Assistant" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-lg rounded-lg px-4 py-3 text-sm shadow-sm",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={aiIcon} alt="AI Assistant" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-3 text-sm shadow-sm">
                  <div className="flex items-center space-x-1">
                    <span className="text-muted-foreground">思考中</span>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="询问库存、预测或见解..."
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="pr-32 h-12 text-base"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => fileInputRef.current?.click()}
                  title="上传文件"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant={isRecording ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={toggleRecording}
                  title={isRecording ? "停止录音" : "开始语音输入"}
                >
                  {isRecording ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  onClick={handleSend}
                  disabled={(!input.trim() && !uploadedFile) || isLoading}
                  size="icon"
                  className="h-9 w-9"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              WarehouseAI 可能会出错，请核对重要信息。
            </p>
            <div className="text-xs text-muted-foreground mt-2 text-center space-y-1">
              <p><strong>上传功能：</strong>点击回形针图标上传 PDF、Excel、Word 或 CSV 文件进行分析。</p>
              <p><strong>语音输入：</strong>点击麦克风图标使用语音命令（按钮颜色显示录音状态）。</p>
              <p><strong>按钮样式：</strong>Ghost 按钮为透明样式，default 按钮为主色填充。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;