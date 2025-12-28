import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Bot, Send, Plus, MessageSquare, Trash2,
    ChevronLeft, ChevronRight, Sparkles, Loader2
} from 'lucide-react';
import aiIcon from '@/assets/chatBot.svg';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// Types
interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    conversationId: string | null; // Dify conversation ID
    createdAt: Date;
    updatedAt: Date;
}

// Storage keys
const STORAGE_KEY = 'warehouse-ai-conversations';
const ACTIVE_CONV_KEY = 'warehouse-ai-active-conversation';

// Initial message
const getWelcomeMessage = (): Message => ({
    id: 'welcome',
    content: '你好！我是益康库存助手。我可以帮您：\n\n• 📦 查询库存情况\n• 📊 分析销售趋势\n• ⚠️ 检查低库存预警\n• 📋 生成库存报告\n\n请问有什么可以帮您？',
    role: 'assistant',
    timestamp: new Date()
});

// Create new conversation
const createNewConversation = (): Conversation => ({
    id: Date.now().toString(),
    title: '新对话',
    messages: [getWelcomeMessage()],
    conversationId: null,
    createdAt: new Date(),
    updatedAt: new Date()
});

// Load conversations from localStorage
const loadConversations = (): Conversation[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed.map((conv: any) => ({
                ...conv,
                createdAt: new Date(conv.createdAt),
                updatedAt: new Date(conv.updatedAt),
                messages: conv.messages.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }))
            }));
        }
    } catch (e) {
        console.error('Failed to load conversations:', e);
    }
    return [createNewConversation()];
};

// Save conversations to localStorage
const saveConversations = (conversations: Conversation[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
        console.error('Failed to save conversations:', e);
    }
};

const AIAssistantPage: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
    const [activeConvId, setActiveConvId] = useState<string>(() => {
        const stored = localStorage.getItem(ACTIVE_CONV_KEY);
        return stored || conversations[0]?.id || '';
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Get active conversation
    const activeConversation = conversations.find(c => c.id === activeConvId) || conversations[0];

    // Save whenever conversations change
    useEffect(() => {
        saveConversations(conversations);
    }, [conversations]);

    // Save active conversation ID
    useEffect(() => {
        localStorage.setItem(ACTIVE_CONV_KEY, activeConvId);
    }, [activeConvId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConversation?.messages]);

    // Focus input on conversation change
    useEffect(() => {
        inputRef.current?.focus();
    }, [activeConvId]);

    // Create new conversation
    const handleNewChat = () => {
        const newConv = createNewConversation();
        setConversations(prev => [newConv, ...prev]);
        setActiveConvId(newConv.id);
        // 不需要 toast 通知，直接切换到新对话
    };

    // Delete conversation
    const handleDeleteConversation = (convId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (conversations.length === 1) {
            // Can't delete last conversation, reset it instead
            const newConv = createNewConversation();
            setConversations([newConv]);
            setActiveConvId(newConv.id);
        } else {
            setConversations(prev => prev.filter(c => c.id !== convId));
            if (activeConvId === convId) {
                setActiveConvId(conversations.find(c => c.id !== convId)?.id || '');
            }
        }
    };

    // Send message
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: input.trim(),
            role: 'user',
            timestamp: new Date()
        };

        // Update conversation with user message
        setConversations(prev => prev.map(conv => {
            if (conv.id === activeConvId) {
                // Update title based on first user message
                const newTitle = conv.messages.length <= 1
                    ? userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : '')
                    : conv.title;
                return {
                    ...conv,
                    title: newTitle,
                    messages: [...conv.messages, userMessage],
                    updatedAt: new Date()
                };
            }
            return conv;
        }));

        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const response = await apiService.aiChat(
                currentInput,
                activeConversation?.conversationId ?? undefined,
                true
            );

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: response.answer,
                role: 'assistant',
                timestamp: new Date()
            };

            // Update conversation with assistant response and Dify conversation ID
            setConversations(prev => prev.map(conv => {
                if (conv.id === activeConvId) {
                    return {
                        ...conv,
                        messages: [...conv.messages, assistantMessage],
                        conversationId: response.conversation_id || conv.conversationId,
                        updatedAt: new Date()
                    };
                }
                return conv;
            }));
        } catch (error: any) {
            console.error('AI Chat error:', error);
            toast({
                title: 'AI 服务错误',
                description: error.message || '无法连接到 AI 服务',
                variant: 'destructive',
            });

            // Add error message
            setConversations(prev => prev.map(conv => {
                if (conv.id === activeConvId) {
                    return {
                        ...conv,
                        messages: [...conv.messages, {
                            id: (Date.now() + 1).toString(),
                            content: '抱歉，我暂时无法处理您的请求。请稍后重试。',
                            role: 'assistant',
                            timestamp: new Date()
                        }],
                        updatedAt: new Date()
                    };
                }
                return conv;
            }));
        } finally {
            setIsLoading(false);
        }
    };

    // Quick suggestions
    const suggestions = [
        '当前库存情况如何？',
        '有哪些产品需要补货？',
        '最近销售趋势怎样？',
        '各仓库库存分布'
    ];

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        inputRef.current?.focus();
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-background">
            {/* Sidebar */}
            <div className={cn(
                "flex flex-col border-r border-border bg-muted/30 transition-all duration-300 shrink-0",
                sidebarOpen ? "w-72" : "w-12"
            )}>
                {/* Sidebar Header with Toggle */}
                <div className="p-2 border-b border-border flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    {sidebarOpen && (
                        <Button
                            onClick={handleNewChat}
                            className="flex-1 justify-start gap-2"
                            variant="outline"
                            size="sm"
                        >
                            <Plus className="h-4 w-4" />
                            新建对话
                        </Button>
                    )}
                </div>

                {/* New Chat Button (collapsed) */}
                {!sidebarOpen && (
                    <div className="p-2 border-b border-border">
                        <Button
                            onClick={handleNewChat}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="新建对话"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Conversation List */}
                {sidebarOpen ? (
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => setActiveConvId(conv.id)}
                                    className={cn(
                                        "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                        conv.id === activeConvId
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <MessageSquare className="h-4 w-4 shrink-0" />
                                    <span className="flex-1 truncate text-sm">{conv.title}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                                    >
                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {conversations.slice(0, 10).map(conv => (
                                <Button
                                    key={conv.id}
                                    variant={conv.id === activeConvId ? "secondary" : "ghost"}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setActiveConvId(conv.id)}
                                    title={conv.title}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                {/* Sidebar Footer */}
                {sidebarOpen && (
                    <div className="p-4 border-t border-border text-xs text-muted-foreground">
                        共 {conversations.length} 个对话
                    </div>
                )}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {activeConversation?.messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex gap-3",
                                    message.role === 'user' ? "flex-row-reverse" : ""
                                )}
                            >
                                {/* Avatar */}
                                <div className={cn(
                                    "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                                    message.role === 'assistant'
                                        ? "bg-primary/10"
                                        : "bg-blue-500"
                                )}>
                                    {message.role === 'assistant' ? (
                                        <img src={aiIcon} alt="AI" className="h-5 w-5" />
                                    ) : (
                                        <span className="text-white text-sm font-medium">U</span>
                                    )}
                                </div>

                                {/* Message Content */}
                                <div className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-3",
                                    message.role === 'assistant'
                                        ? "bg-muted"
                                        : "bg-primary text-primary-foreground"
                                )}>
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <img src={aiIcon} alt="AI" className="h-5 w-5" />
                                </div>
                                <div className="bg-muted rounded-2xl px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        思考中...
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Quick Suggestions (only show for new conversations) */}
                {activeConversation?.messages.length <= 1 && (
                    <div className="px-4 pb-4">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex flex-wrap gap-2 justify-center">
                                {suggestions.map((suggestion, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        className="text-sm"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="border-t border-border p-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                placeholder="输入消息..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                            AI 助手基于 Dify + Ollama 驱动
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistantPage;
