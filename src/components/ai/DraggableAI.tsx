import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  X,
  Maximize2,
  Minimize2,
  Mic,
  Paperclip,
  Move,
  RotateCcw
} from 'lucide-react';
import { useAIStore } from '@/stores';
import { useUIStore } from '@/stores';  // 新增导入useUIStore
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import aiIcon from '@/assets/chatBot.svg';
// The unused Draggable import has been removed to avoid confusion.

interface DraggableAIProps {
  hidden?: boolean;
}

export const DraggableAI: React.FC<DraggableAIProps> = ({ hidden = false }) => {
  const {
    isOpen,
    isLoading,
    messages,
    suggestions,
    toggleChat,
    addMessage,
    setLoading
  } = useAIStore();
  
  // 获取AI设置
  const { aiSettings } = useUIStore();

  const [input, setInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Set initial position based on window dimensions
  const collapsedPosition = () => ({
    x: window.innerWidth - 56 - 24,
    y: window.innerHeight - 56 - 24,
  });

  const openedPosition = (w = 384, h = 520) => ({
    x: window.innerWidth - w - 24,
    y: window.innerHeight - h - 24,
  });

  const [position, setPosition] = useState(collapsedPosition());
  const [size, setSize] = useState({ width: 384, height: 520 });

  // State to manage dragging and resizing behavior
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const hasMovedRef = useRef(false); // Use ref to avoid re-renders on move

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    if (isOpen) {
      setSize({ width: 384, height: 520 });
      setPosition(openedPosition());
    } else {
      setIsFullscreen(false);
      setPosition(collapsedPosition());
    }
  }, [isOpen]);
  const handleSend = async () => {
    if (!input.trim()) return;
    addMessage(input, 'user');
    setInput('');
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on your current inventory data, I've identified 3 items with critical low stock levels that need immediate attention.",
        "I've analyzed your warehouse traffic patterns and recommend relocating high-demand items to zones A1-A3 for 23% efficiency improvement.",
        "Your current stock levels suggest ordering 150 units of iPhone 14 Pro within the next 5 days to meet projected demand.",
        "I've detected an unusual spike in returns for SKU FURN-OC-001. This may indicate a quality issue that needs investigation."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addMessage(randomResponse, 'assistant');
      setLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  // --- Drag and Resize Logic ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFullscreen) return;
    hasMovedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFullscreen) return;
    hasMovedRef.current = false;
    setIsResizing(true);
    resizeStartRef.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || isFullscreen) return;
    hasMovedRef.current = true;

    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;

    // Constrain movement within the viewport
    const containerWidth = isOpen ? size.width : 56;
    const containerHeight = isOpen ? size.height : 56;
    const boundedX = Math.max(0, Math.min(window.innerWidth - containerWidth, newX));
    const boundedY = Math.max(0, Math.min(window.innerHeight - containerHeight, newY));

    setPosition({ x: boundedX, y: boundedY });
  }, [isDragging, isFullscreen, isOpen, size.width, size.height]);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || isFullscreen) return;
    hasMovedRef.current = true;

    const dx = e.clientX - resizeStartRef.current.x;
    const dy = e.clientY - resizeStartRef.current.y;

    // Correctly calculate new width and height with minimum constraints
    const newWidth = Math.max(320, resizeStartRef.current.width + dx);
    const newHeight = Math.max(400, resizeStartRef.current.height + dy);

    setSize({ width: newWidth, height: newHeight });
  }, [isResizing, isFullscreen]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMouseMove);
    };
  }, [isDragging, isResizing, handleMouseMove, handleResizeMouseMove, handleMouseUp]);

  const resetPosition = () => {
    setIsFullscreen(false);
    setSize({ width: 384, height: 520 });
    setPosition(openedPosition());
  };

  // --- Component Renders ---

  // 如果hidden属性为true，或者AI未启用且聊天未打开，则不显示组件
  if (hidden || (!aiSettings.enabled && !isOpen)) {
    return null;
  }

  if (!isOpen) {
    const handleIconClick = () => {
      // Only toggle chat if the icon wasn't dragged
      if (!hasMovedRef.current) {
        toggleChat();
      }
    };

    return (
      <div
        className="fixed z-50 cursor-move"
        style={{ left: position.x, top: position.y, width: 56, height: 56 }}
        onMouseDown={handleMouseDown}
        onClick={handleIconClick}
      >
        <Button
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-primary to-accent hover:shadow-xl transition-all duration-300"
          size="icon"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed bg-card border border-border shadow-2xl transition-all duration-300 z-50 flex flex-col",
        isFullscreen ? "inset-4 rounded-xl" : "rounded-lg"
      )}
      style={isFullscreen ? {} : { left: position.x, top: position.y, width: size.width, height: size.height }}
    >
      {/* Header */}
      <div
        className={cn("flex-shrink-0 flex items-center justify-between p-4 border-b", !isFullscreen && "cursor-move")}
        onMouseDown={handleMouseDown}
      >
         <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
            <img src={aiIcon} alt="AI Assistant" className="h-full w-full object-cover" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI 仓库助手</h3>
            <p className="text-xs text-muted-foreground">{isLoading ? '思考中...' : '在线'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {!isFullscreen && (
            <Button variant="ghost" size="sm" onClick={resetPosition} className="h-8 w-8 p-0" title="重置位置">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="h-8 w-8 p-0">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleChat} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages: Height is now reliably set via inline style */}
      <ScrollArea className="flex-grow p-4" style={{ height: `calc(100% - 160px)` }}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={cn("flex", message.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t">
          <div className="flex flex-wrap gap-1">
            {suggestions.map((suggestion, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer text-xs hover:bg-accent" onClick={() => handleSuggestionClick(suggestion)}>
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t">
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0"><Paperclip className="h-4 w-4" /></Button>
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="询问库存、预测或见解..." onKeyPress={(e) => e.key === 'Enter' && handleSend()} className="flex-1" />
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0"><Mic className="h-4 w-4" /></Button>
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="sm" className="h-9 w-9 p-0"><Send className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Resize handle */}
      {!isFullscreen && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground"
          onMouseDown={handleResizeMouseDown}
        >
          <Move className="h-3 w-3 -rotate-45" />
        </div>
      )}
    </div>
  );
};