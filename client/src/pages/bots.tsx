import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft, Loader2, Send, Bot, Mail, ChevronRight, MessageSquare, Sparkles,
  Mic, DollarSign, Video, Star, Download, Trash2, History, Copy, Check,
} from "lucide-react";

interface BotInfo {
  id: string;
  name: string;
  category: string;
  starters?: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CATEGORY_ICONS: Record<string, typeof Bot> = {
  "BrandDNA Bots": Sparkles,
  "Captivating Content Bots": MessageSquare,
  "WCPC Bots": Mic,
  "Rev Engine Bots": DollarSign,
  "Other Bots": Video,
};

const CATEGORY_COLORS: Record<string, string> = {
  "BrandDNA Bots": "from-violet-500/10 to-purple-500/10 border-violet-500/30",
  "Captivating Content Bots": "from-blue-500/10 to-cyan-500/10 border-blue-500/30",
  "WCPC Bots": "from-orange-500/10 to-red-500/10 border-orange-500/30",
  "Rev Engine Bots": "from-emerald-500/10 to-green-500/10 border-emerald-500/30",
  "Other Bots": "from-gray-500/10 to-slate-500/10 border-gray-500/30",
};

export default function BotsPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [grouped, setGrouped] = useState<Record<string, BotInfo[]>>({});
  const [selectedBot, setSelectedBot] = useState<BotInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [chatHistoryMap, setChatHistoryMap] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/bots/list")
      .then((r) => r.json())
      .then((data: BotInfo[]) => {
        setBots(data);
        const g: Record<string, BotInfo[]> = {};
        data.forEach((bot) => {
          if (!g[bot.category]) g[bot.category] = [];
          g[bot.category].push(bot);
        });
        setGrouped(g);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadFavoritesAndHistory = async (e: string) => {
    try {
      const [favRes, histRes] = await Promise.all([
        fetch(`/api/bots/favorites?email=${encodeURIComponent(e)}`),
        fetch(`/api/bots/history?email=${encodeURIComponent(e)}`),
      ]);
      if (favRes.ok) {
        const favData = await favRes.json();
        setFavorites(favData);
      }
      if (histRes.ok) {
        const histData = await histRes.json();
        const map: Record<string, boolean> = {};
        histData.forEach((c: any) => { map[c.botId] = true; });
        setChatHistoryMap(map);
      }
    } catch {}
  };

  const handleVerify = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/bots/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setVerified(true);
        toast({ title: "Email verified! Choose a bot to start chatting." });
        loadFavoritesAndHistory(email);
      }
    } catch {
      toast({ title: "Verification failed", variant: "destructive" });
    }
  };

  const handleSelectBot = async (bot: BotInfo) => {
    setSelectedBot(bot);
    setMessages([]);
    try {
      const res = await fetch(`/api/bots/history/${bot.id}?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch {}
  };

  const handleSend = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || !selectedBot) return;
    const userMsg: Message = { role: "user", content: msgText };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/bots/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, botId: selectedBot.id, messages: updated }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([...updated, { role: "assistant", content: data.reply }]);
        setChatHistoryMap((prev) => ({ ...prev, [selectedBot.id]: true }));
      } else {
        toast({ title: "Bot didn't respond", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to get response", variant: "destructive" });
    }
    setLoading(false);
  };

  const toggleFavorite = async (botId: string) => {
    try {
      const res = await fetch("/api/bots/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, botId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.favorited) {
          setFavorites((prev) => [...prev, botId]);
          toast({ title: "Added to favorites" });
        } else {
          setFavorites((prev) => prev.filter((f) => f !== botId));
          toast({ title: "Removed from favorites" });
        }
      }
    } catch {}
  };

  const clearHistory = async () => {
    if (!selectedBot) return;
    try {
      const res = await fetch(`/api/bots/history/${selectedBot.id}?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      if (res.ok) {
        setMessages([]);
        setChatHistoryMap((prev) => { const n = { ...prev }; delete n[selectedBot.id]; return n; });
        toast({ title: "Chat history cleared" });
      }
    } catch {}
  };

  const exportChat = () => {
    if (!selectedBot || messages.length === 0) return;
    const lines = messages.map((m) => `${m.role === "user" ? "You" : selectedBot.name}:\n${m.content}`).join("\n\n---\n\n");
    const header = `Chat with ${selectedBot.name}\nExported: ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n`;
    const blob = new Blob([header + lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedBot.id}-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Chat exported" });
  };

  const copyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  if (!verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">BBG Bot Hub</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">{bots.length} AI-powered bots for brand building, content, presentations, and revenue</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Enter your email to access all bots</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                data-testid="input-bot-email"
              />
            </div>
            <Button onClick={handleVerify} className="w-full" data-testid="button-verify-email">
              <Mail className="h-4 w-4 mr-2" />
              Access Bot Hub
            </Button>
            <div className="pt-2 text-center">
              <Link href="/"><Button variant="ghost" size="sm" data-testid="button-back-from-bots"><ArrowLeft className="h-4 w-4 mr-1" />Back to Home</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedBot) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedBot(null)} data-testid="button-back-to-bots"><ArrowLeft className="h-5 w-5" /></Button>
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-lg font-bold">{selectedBot.name}</h1>
                <p className="text-xs text-muted-foreground">{selectedBot.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => toggleFavorite(selectedBot.id)} title={favorites.includes(selectedBot.id) ? "Remove from favorites" : "Add to favorites"} data-testid="button-toggle-favorite">
                <Star className={`h-4 w-4 ${favorites.includes(selectedBot.id) ? "fill-yellow-500 text-yellow-500" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={exportChat} disabled={messages.length === 0} title="Export chat" data-testid="button-export-chat">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={clearHistory} disabled={messages.length === 0} title="Clear history" data-testid="button-clear-history">
                <Trash2 className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center max-w-md">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">Start chatting with {selectedBot.name}</p>
                <p className="text-sm text-muted-foreground mt-1 mb-6">Ask anything related to this bot's specialty</p>
                {selectedBot.starters && selectedBot.starters.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Try asking:</p>
                    {selectedBot.starters.map((starter, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(starter)}
                        className="w-full text-left px-4 py-3 border rounded-xl text-sm hover:bg-muted/50 transition-colors"
                        data-testid={`starter-${i}`}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 relative ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyMessage(msg.content, `msg-${i}`)}
                      className="absolute -bottom-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy message"
                    >
                      {copiedField === `msg-${i}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Thinking...</span></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t bg-card/50 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Input
              placeholder={`Message ${selectedBot.name}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={loading}
              className="flex-1"
              data-testid="input-bot-message"
            />
            <Button onClick={() => handleSend()} disabled={loading || !input.trim()} data-testid="button-send-message">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const favoriteBots = bots.filter((b) => favorites.includes(b.id));
  const botsWithHistory = bots.filter((b) => chatHistoryMap[b.id] && !favorites.includes(b.id));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <Bot className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">BBG Bot Hub</h1>
              <p className="text-xs text-muted-foreground">{bots.length} AI bots available</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {favoriteBots.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <h2 className="text-lg font-bold">Favorites</h2>
              <Badge variant="secondary" className="text-xs">{favoriteBots.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {favoriteBots.map((bot) => (
                <BotCard key={bot.id} bot={bot} onSelect={handleSelectBot} onToggleFavorite={toggleFavorite} isFavorite hasHistory={!!chatHistoryMap[bot.id]} />
              ))}
            </div>
          </div>
        )}

        {botsWithHistory.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Recent Conversations</h2>
              <Badge variant="secondary" className="text-xs">{botsWithHistory.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {botsWithHistory.map((bot) => (
                <BotCard key={bot.id} bot={bot} onSelect={handleSelectBot} onToggleFavorite={toggleFavorite} isFavorite={false} hasHistory />
              ))}
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([category, categoryBots]) => {
          const Icon = CATEGORY_ICONS[category] || Bot;
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">{category}</h2>
                <Badge variant="secondary" className="text-xs">{categoryBots.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryBots.map((bot) => (
                  <BotCard key={bot.id} bot={bot} onSelect={handleSelectBot} onToggleFavorite={toggleFavorite} isFavorite={favorites.includes(bot.id)} hasHistory={!!chatHistoryMap[bot.id]} />
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

function BotCard({ bot, onSelect, onToggleFavorite, isFavorite, hasHistory }: {
  bot: BotInfo; onSelect: (b: BotInfo) => void; onToggleFavorite: (id: string) => void; isFavorite: boolean; hasHistory: boolean;
}) {
  const colorClass = CATEGORY_COLORS[bot.category] || "from-gray-500/10 to-slate-500/10 border-gray-500/30";
  return (
    <Card className={`h-full transition-all hover:shadow-md hover:scale-[1.02] bg-gradient-to-br ${colorClass} cursor-pointer`} data-testid={`bot-card-${bot.id}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onSelect(bot)}>
            <div className="bg-background/80 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{bot.name}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground">{bot.category}</p>
                {hasHistory && <Badge variant="outline" className="text-[10px] py-0 h-4">has chat</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(bot.id); }} className="p-1.5 rounded-md hover:bg-background/50 transition" data-testid={`fav-${bot.id}`}>
              <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" onClick={() => onSelect(bot)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
