import { useState, useEffect, useRef } from "react";

interface Bot {
    id: string;
    name: string;
    category: string;
}

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function BotsPage() {
    const [email, setEmail] = useState("");
    const [verified, setVerified] = useState(false);
    const [bots, setBots] = useState<Bot[]>([]);
    const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [groupBy, setGroupBy] = useState<Record<string, Bot[]>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
          fetch("/api/bots/list")
            .then((r) => r.json())
            .then((data: Bot[]) => {
                      setBots(data);
                      const grouped = data.reduce((acc: Record<string, Bot[]>, bot) => {
                                  if (!acc[bot.category]) acc[bot.category] = [];
                                  acc[bot.category].push(bot);
                                  return acc;
                      }, {});
                      setGroupBy(grouped);
            });
    }, []);

    useEffect(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleVerify = async () => {
          const res = await fetch("/api/bots/verify-email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
          });
          if (res.ok) setVerified(true);
    };

    const handleSelectBot = (bot: Bot) => {
          setSelectedBot(bot);
          setMessages([]);
    };

    const handleSend = async () => {
          if (!input.trim() || !selectedBot) return;
          const userMsg: Message = { role: "user", content: input };
          const updated = [...messages, userMsg];
          setMessages(updated);
          setInput("");
          setLoading(true);
          const res = await fetch("/api/bots/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, botId: selectedBot.id, messages: updated }),
          });
          const data = await res.json();
          setMessages([...updated, { role: "assistant", content: data.reply }]);
          setLoading(false);
    };

    if (!verified) {
          return (
                  <div className="flex items-center justify-center min-h-screen bg-gray-950">
                          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-96 text-center shadow-xl">
                                    <div className="text-4xl mb-4">🤖</div>div>
                                    <h2 className="text-white text-xl font-bold mb-2">BBG Bot Hub</h2>h2>
                                    <p className="text-gray-400 text-sm mb-6">Enter your email to access all bots</p>p>
                                    <input
                                                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-blue-500"
                                                  type="email"
                                                  placeholder="jane.doe@email.com"
                                                  value={email}
                                                  onChange={(e) => setEmail(e.target.value)}
                                                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                                                />
                                    <button
                                                  onClick={handleVerify}
                                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                                                >
                                                Submit
                                    </button>button>
                          </div>div>
                  </div>div>
                );
    }
  
    return (
          <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
                <div className="w-72 bg-gray-900 border-r border-gray-800 overflow-y-auto flex-shrink-0">
                        <div className="p-4 border-b border-gray-800">
                                  <h1 className="text-lg font-bold">🤖 BBG Bot Hub</h1>h1>
                                  <p className="text-xs text-gray-400 mt-1">{bots.length} bots available</p>p>
                        </div>div>
                  {Object.entries(groupBy).map(([category, categoryBots]) => (
                      <div key={category}>
                                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-900 sticky top-0">
                                    {category}
                                  </div>div>
                        {categoryBots.map((bot) => (
                                      <button
                                                        key={bot.id}
                                                        onClick={() => handleSelectBot(bot)}
                                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition flex items-center gap-2 ${
                                                                            selectedBot?.id === bot.id ? "bg-gray-800 text-blue-400 font-medium" : "text-gray-300"
                                                        }`}
                                                      >
                                                      <span>🤖</span>span>
                                                      <span>{bot.name}</span>span>
                                      </button>button>
                                  ))}
                      </div>div>
                        ))}
                </div>div>
          
                <div className="flex-1 flex flex-col">
                  {!selectedBot ? (
                      <div className="flex-1 flex items-center justify-center text-gray-500">
                                  <div className="text-center">
                                                <div className="text-6xl mb-4">🤖</div>div>
                                                <p className="text-xl font-medium text-gray-400">Select a bot to get started</p>p>
                                                <p className="text-sm text-gray-600 mt-2">Choose from {bots.length} AI-powered bots</p>p>
                                  </div>div>
                      </div>div>
                        ) : (
                      <>
                                  <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
                                                <h2 className="font-bold text-lg">🤖 {selectedBot.name}</h2>h2>
                                                <p className="text-xs text-gray-400">{selectedBot.category}</p>p>
                                  </div>div>
                      
                                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {messages.length === 0 && (
                                        <div className="text-center text-gray-500 mt-16">
                                                          <p className="text-lg">Say hello to <span className="text-blue-400">{selectedBot.name}</span>span></p>p>
                                                          <p className="text-sm mt-1">Type a message to get started</p>p>
                                        </div>div>
                                                )}
                                    {messages.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                                          <div
                                                                                className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                                                                                        m.role === "user"
                                                                                                          ? "bg-blue-600 text-white rounded-br-sm"
                                                                                                          : "bg-gray-800 text-gray-100 rounded-bl-sm"
                                                                                  }`}
                                                                              >
                                                            {m.content}
                                                          </div>div>
                                        </div>div>
                                                ))}
                                    {loading && (
                                        <div className="flex justify-start">
                                                          <div className="bg-gray-800 text-gray-400 px-4 py-3 rounded-2xl rounded-bl-sm text-sm italic">
                                                                              Thinking...
                                                          </div>div>
                                        </div>div>
                                                )}
                                                <div ref={messagesEndRef} />
                                  </div>div>
                      
                                  <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
                                                <div className="flex gap-3">
                                                                <input
                                                                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                                                    value={input}
                                                                                    onChange={(e) => setInput(e.target.value)}
                                                                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                                                                    placeholder={`Message ${selectedBot.name}...`}
                                                                                  />
                                                                <button
                                                                                    onClick={handleSend}
                                                                                    disabled={loading || !input.trim()}
                                                                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-medium text-sm transition"
                                                                                  >
                                                                                  Send
                                                                </button>button>
                                                </div>div>
                                  </div>div>
                      </>>
                    )}
                </div>div>
          </div>div>
        );
}</></div>
          )
    }
          })
    }
    }
          })
    }
    })
                      })
            })
    })
}
}
}