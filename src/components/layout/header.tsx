"use client";

import * as React from "react";
import { Menu, Search, Bell, ChevronDown, User, Settings, CreditCard, LogOut, Check, AlertTriangle, XCircle, Info, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils/cn";
import { useLojaAtiva } from "../providers/loja-context";
import { getNotificacoesExecutivas, marcarNotificacaoLida } from "@/lib/actions/corporativo";
import { createClient } from "@/lib/supabase/client";
import type { NotificacaoExecutiva } from "@/lib/types/corporativo";

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick?: () => void;
  store: {
    nome_loja: string;
    slug: string;
  };
  profile: {
    nome: string;
    email: string;
    tipo: string;
  };
  signOutAction: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onSearchClick,
  store,
  profile,
  signOutAction,
  className,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);
  const { grupo, lojaAtiva, perfil } = useLojaAtiva();

  const [notificacoes, setNotificacoes] = React.useState<NotificacaoExecutiva[]>([]);
  const [time, setTime] = React.useState<string>("");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dayName = days[now.getDay()];
      const dateStr = now.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTime(`${dayName}, ${dateStr} - ${timeStr}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isDono = profile?.tipo === "dono";

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "dono": return "Dono";
      case "gerente": return "Gerente";
      case "caixa": return "Caixa";
      case "estoquista": return "Estoquista";
      default: return role;
    }
  };

  const carregarNotificacoes = React.useCallback(async () => {
    if (!isDono) return;
    try {
      const data = await getNotificacoesExecutivas();
      setNotificacoes(data);
    } catch (err) {
      console.error("Erro ao obter notificacoes executivas:", err);
    }
  }, [isDono]);

  // Carregamento inicial + Realtime para Dono
  React.useEffect(() => {
    if (!isDono) return;
    carregarNotificacoes();

    const supabase = createClient();
    const channel = supabase
      .channel("header-notificacoes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes" },
        () => {
          carregarNotificacoes();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isDono, carregarNotificacoes]);

  // Close dropdowns on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarcarLida = async (id: string) => {
    // Optimistic UI update
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    try {
      await marcarNotificacaoLida(id);
    } catch (err) {
      console.error("Erro ao marcar notificacao como lida:", err);
    }
  };

  const handleMarcarTodasLidas = async () => {
    const naoLidas = notificacoes.filter(n => !n.lida);
    if (naoLidas.length === 0) return;

    // Optimistic UI update
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    try {
      await Promise.all(naoLidas.map(n => marcarNotificacaoLida(n.id)));
    } catch (err) {
      console.error("Erro ao marcar todas as notificacoes como lidas:", err);
    }
  };

  const naoLidasCount = notificacoes.filter(n => !n.lida).length;

  return (
    <header
      className={cn(
        "h-16 flex items-center justify-between px-6 bg-card/60 backdrop-blur-md border-b border-border/80 text-foreground relative z-20 select-none",
        className
      )}
    >
      {/* Left side: Hamburger (Mobile) + Fake Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar — triggers Command Palette */}
        <button
          onClick={onSearchClick}
          className="relative w-full hidden sm:flex items-center bg-input/50 text-muted-foreground/60 border border-border/50 rounded-lg py-1.5 pl-9 pr-10 text-xs outline-none cursor-pointer hover:bg-input/70 hover:border-border transition-colors"
        >
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <span>Buscar produtos, clientes...</span>
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] font-bold text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right side: Active Store + Subscription Badge + Notifications + User Menu */}
      <div className="flex items-center gap-3">
        {/* Active Store Badge */}
        <Badge
          variant="outline"
          className="hidden md:inline-flex py-1 px-2.5 text-[10px] font-bold border-violet-500/30 bg-violet-500/10 text-violet-400 gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          {grupo?.nome || "Grupo"} &gt; {lojaAtiva?.nome_loja || store?.nome_loja} ({getRoleLabel(perfil || profile?.tipo)})
        </Badge>

        {/* Subscription status badge */}
        <Badge
          variant={profile?.tipo === "dono" ? "warning" : "success"}
          showDot
          className="hidden sm:inline-flex py-1 px-3 text-[10px] font-bold"
        >
          {profile?.tipo === "dono" ? "Período de Testes" : "Plano Ativo"}
        </Badge>

        {/* Real-time Clock Badge */}
        {mounted && time && (
          <Badge
            variant="outline"
            className="hidden md:inline-flex py-1 px-2.5 text-[10px] font-bold border-violet-500/20 bg-slate-900/50 text-slate-300 gap-1.5 flex items-center shadow-inner"
          >
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-mono">{time}</span>
          </Badge>
        )}

        {/* Notifications Icon with Realtime Dropdown (Dono Only) */}
        {isDono ? (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative w-8 h-8 rounded-lg bg-input/50 border border-border/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer"
            >
              <Bell size={16} />
              {naoLidasCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-md animate-pulse">
                  {naoLidasCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl p-2 flex flex-col z-30 animate-slide-down">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 mb-1 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-foreground">Alertas de Governança</span>
                    {naoLidasCount > 0 && (
                      <Badge variant="error" className="py-0 px-1.5 text-[8px] font-bold">
                        {naoLidasCount} novos
                      </Badge>
                    )}
                  </div>
                  {naoLidasCount > 0 && (
                    <button
                      onClick={handleMarcarTodasLidas}
                      className="text-[10px] text-primary hover:underline font-bold"
                    >
                      Limpar todos
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-72 overflow-y-auto space-y-1 py-1 px-1">
                  {notificacoes.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground/60 text-xs">
                      Nenhuma notificação corporativa registrada.
                    </div>
                  ) : (
                    notificacoes.map((n) => {
                      const Icon = n.tipo === "erro" ? XCircle
                        : n.tipo === "alerta" ? AlertTriangle
                        : n.tipo === "sucesso" ? CheckCircle2
                        : Info;

                      const colorClass = n.tipo === "erro" ? "text-destructive"
                        : n.tipo === "alerta" ? "text-amber-500"
                        : n.tipo === "sucesso" ? "text-emerald-500"
                        : "text-blue-500";

                      const bgClass = n.tipo === "erro" ? "bg-destructive/5 hover:bg-destructive/10"
                        : n.tipo === "alerta" ? "bg-amber-500/5 hover:bg-amber-500/10"
                        : n.tipo === "sucesso" ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                        : "bg-blue-500/5 hover:bg-blue-500/10";

                      return (
                        <div
                          key={n.id}
                          onClick={() => !n.lida && handleMarcarLida(n.id)}
                          className={cn(
                            "p-2.5 rounded-lg flex gap-2.5 transition-all duration-150 relative border border-transparent select-none cursor-pointer",
                            bgClass,
                            {
                              "border-border/40": n.lida,
                              "border-primary/20 shadow-sm font-semibold": !n.lida
                            }
                          )}
                        >
                          <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", colorClass)} />
                          
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[11px] text-foreground font-bold truncate leading-snug">
                                {n.titulo}
                              </span>
                              {!n.lida && (
                                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                              )}
                            </div>
                            
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal break-words">
                              {n.mensagem}
                            </p>
                            
                            <div className="flex items-center gap-1.5 mt-1.5 text-[8px] text-muted-foreground/60">
                              {n.loja_nome && (
                                <span className="font-bold text-foreground/70 bg-muted px-1 py-0.2 rounded border border-border/30">
                                  {n.loja_nome}
                                </span>
                              )}
                              <span>
                                {new Date(n.created_at).toLocaleDateString("pt-BR")} às {new Date(n.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Visual-only bell icon for non-owner roles */
          <button
            disabled
            className="relative w-8 h-8 rounded-lg bg-input/20 border border-border/20 flex items-center justify-center text-muted-foreground/40 cursor-not-allowed"
          >
            <Bell size={16} />
          </button>
        )}

        {/* Vertical divider */}
        <div className="w-px h-6 bg-border/80 mx-1 hidden sm:block" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/80 text-foreground transition-all duration-200 cursor-pointer"
          >
            {/* Avatar circle */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-ia text-white flex items-center justify-center font-bold text-[11px] shadow-sm">
              {profile?.nome ? profile.nome.substring(0, 2).toUpperCase() : "U"}
            </div>
            
            <span className="text-xs font-bold truncate max-w-[80px] hidden sm:block">
              {profile?.nome ? profile.nome.split(" ")[0] : "Usuário"}
            </span>
            
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", {
              "transform rotate-180": dropdownOpen
            })} />
          </button>

          {/* Dropdown Menu content */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-card shadow-2xl p-1.5 flex flex-col z-30 animate-slide-down">
              {/* User meta data header */}
              <div className="px-3 py-2 border-b border-border/60 mb-1 flex flex-col select-none">
                <span className="text-xs font-extrabold text-foreground truncate">
                  {profile?.nome}
                </span>
                <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {profile?.email}
                </span>
              </div>

              {/* Items */}
              <button
                disabled
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-muted-foreground/50 cursor-not-allowed hover:bg-muted/30"
              >
                <User size={14} />
                Meu Perfil
                <span className="ml-auto text-[8px] bg-muted text-muted-foreground/60 px-1 py-0.5 rounded font-bold uppercase">
                  Breve
                </span>
              </button>

              <button
                disabled
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-muted-foreground/50 cursor-not-allowed hover:bg-muted/30"
              >
                <Settings size={14} />
                Configurações
                <span className="ml-auto text-[8px] bg-muted text-muted-foreground/60 px-1 py-0.5 rounded font-bold uppercase">
                  Breve
                </span>
              </button>

              <button
                disabled
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-muted-foreground/50 cursor-not-allowed hover:bg-muted/30"
              >
                <CreditCard size={14} />
                Assinatura
                <span className="ml-auto text-[8px] bg-muted text-muted-foreground/60 px-1 py-0.5 rounded font-bold uppercase">
                  Breve
                </span>
              </button>

              {/* Divider */}
              <div className="h-px bg-border/60 my-1" />

              {/* Logout Action */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  signOutAction();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
