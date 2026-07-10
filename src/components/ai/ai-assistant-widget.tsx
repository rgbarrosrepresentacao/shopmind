"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Brain, X, Send, Sparkles, Minimize2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INITIAL_SUGGESTIONS = [
  "Quais produtos estão com estoque baixo?",
  "Como foi o faturamento desta semana?",
  "Sugerir promoções para o fim de semana",
  "Qual o ticket médio dos últimos 7 dias?",
];

const AI_RESPONSES: Record<string, string> = {
  default:
    "Olá! Sou a IA Gerente do ShopMind 🧠. Ainda estou sendo preparada para responder suas perguntas com dados reais. Em breve poderei analisar seu estoque, vendas e te dar recomendações inteligentes! Por enquanto, explore o dashboard para ver seus dados.",
  estoque:
    "📦 O módulo de estoque ainda está sendo preparado. Em breve vou monitorar seus produtos em tempo real e alertar quando algum item estiver com estoque crítico!",
  faturamento:
    "💰 Estou processando os dados de faturamento... O módulo financeiro completo chegará em breve. Assim que estiver pronto, farei análises automáticas de receita, margem e tendências.",
  promoções:
    "🏷️ Ótima ideia! O sistema de sugestão inteligente de promoções será ativado após a integração do PDV. Vou cruzar dados de vendas com sazonalidade para sugerir as melhores ofertas.",
  ticket:
    "🎫 O cálculo de ticket médio será automático quando o PDV estiver operacional. Analisarei vendas diárias, semanais e mensais para identificar padrões e oportunidades.",
};

export const AIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const getAIResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    if (lower.includes("estoque") || lower.includes("produto")) return AI_RESPONSES.estoque;
    if (lower.includes("faturamento") || lower.includes("receita") || lower.includes("semana")) return AI_RESPONSES.faturamento;
    if (lower.includes("promoç") || lower.includes("oferta") || lower.includes("desconto")) return AI_RESPONSES.promoções;
    if (lower.includes("ticket") || lower.includes("média") || lower.includes("médio")) return AI_RESPONSES.ticket;
    return AI_RESPONSES.default;
  };

  const handleSend = (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const aiMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: getAIResponse(messageText),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (messages.length === 0) {
      // Send initial welcome
      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "Olá! 👋 Sou a **IA Gerente** do ShopMind. Estou aqui para ajudar você a tomar decisões inteligentes sobre sua loja.\n\nO que deseja saber?",
            timestamp: new Date(),
          },
        ]);
      }, 300);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 cursor-pointer group"
          title="Falar com IA Gerente"
        >
          <Brain className="w-6 h-6 group-hover:scale-110 transition-transform" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-2xl bg-violet-400/30 animate-ping pointer-events-none" style={{ animationDuration: "3s" }} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-40 transition-all duration-300 animate-slide-up",
            isMinimized
              ? "bottom-6 right-6 w-64"
              : "bottom-6 right-6 w-[380px] sm:w-[400px]"
          )}
        >
          <div
            className={cn(
              "bg-card border border-border rounded-2xl shadow-2xl shadow-violet-500/10 overflow-hidden flex flex-col",
              isMinimized ? "h-14" : "h-[520px] max-h-[80vh]"
            )}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600/20 to-blue-600/10 border-b border-border cursor-pointer select-none"
              onClick={() => isMinimized && setIsMinimized(false)}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-foreground leading-none flex items-center gap-1.5">
                    IA Gerente
                    <Sparkles className="w-3 h-3 text-violet-400" />
                  </span>
                  {!isMinimized && (
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      ShopMind Intelligence
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                  className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body (hidden when minimized) */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn("flex", {
                        "justify-end": msg.role === "user",
                        "justify-start": msg.role === "assistant",
                      })}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed animate-slide-up",
                          {
                            "bg-primary text-primary-foreground rounded-br-md": msg.role === "user",
                            "bg-muted text-foreground rounded-bl-md border border-border/50": msg.role === "assistant",
                          }
                        )}
                      >
                        {msg.content.split("\n").map((line, i) => (
                          <p key={i} className={i > 0 ? "mt-1.5" : ""}>
                            {line.split("**").map((segment, j) =>
                              j % 2 === 1 ? (
                                <strong key={j} className="font-bold">
                                  {segment}
                                </strong>
                              ) : (
                                <span key={j}>{segment}</span>
                              )
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="bg-muted border border-border/50 text-foreground px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestions (shown when no messages or only welcome) */}
                {messages.length <= 1 && (
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                    {INITIAL_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted hover:border-violet-500/30 transition-colors cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="p-3 border-t border-border bg-muted/20">
                  <div className="flex items-center gap-2 bg-input border border-border rounded-xl px-3 py-2 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Pergunte algo..."
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!inputValue.trim() || isTyping}
                      className={cn(
                        "p-1.5 rounded-lg transition-all cursor-pointer",
                        inputValue.trim() && !isTyping
                          ? "bg-violet-500 text-white hover:bg-violet-600 shadow-md shadow-violet-500/20"
                          : "text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                  <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5 select-none">
                    IA Gerente ShopMind — Respostas simuladas no MVP
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
