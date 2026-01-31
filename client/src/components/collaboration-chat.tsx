import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatMessage {
  userId: string;
  username: string;
  color: string;
  message: string;
  timestamp: string;
}

interface CollaborationChatProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  currentUserId: string | null;
}

export function CollaborationChat({ messages, onSendMessage, currentUserId }: CollaborationChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-card border rounded-lg shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="font-semibold text-sm">Team Chat</span>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div 
                  key={`${msg.userId}-${i}`}
                  className={cn(
                    "flex flex-col gap-1",
                    msg.userId === currentUserId ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {msg.userId !== currentUserId && (
                      <span className="text-[10px] font-bold" style={{ color: msg.color }}>
                        {msg.username}
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div 
                    className={cn(
                      "px-3 py-1.5 rounded-2xl text-sm max-w-[85%] break-words shadow-sm",
                      msg.userId === currentUserId 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted rounded-tl-none border-l-4"
                    )}
                    style={msg.userId !== currentUserId ? { borderLeftColor: msg.color } : {}}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground mt-20">
                  <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">Start a conversation</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-background flex gap-2">
            <Input
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="h-8 text-xs"
            />
            <Button size="icon" className="h-8 w-8" onClick={handleSend}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Button 
        size="icon" 
        className={cn(
          "h-12 w-12 rounded-full shadow-lg transition-all",
          isOpen ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"
        )}
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="w-6 h-6" />
        {messages.length > 0 && !isOpen && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 border-2 border-background">
            {messages.length}
          </Badge>
        )}
      </Button>
    </div>
  );
}
