"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  Search,
  Package,
  Users,
  ShoppingBag,
  LayoutDashboard,
  Brain,
  Settings,
  BarChart3,
  DollarSign,
  Monitor,
  Warehouse,
  Truck,
  UserPlus,
  CreditCard,
  Calculator,
  ArrowRight,
  Command,
  X,
  ShieldCheck,
  Gift,
  FileText,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  group: string;
  href?: string;
  action?: () => void;
  disabled?: boolean;
  isAdmin?: boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  userTipo?: string;
  userEmail?: string;
}

const DEFAULT_ITEMS: CommandItem[] = [
  // Páginas
  { id: "nav-dashboard", label: "Dashboard", description: "Visão geral da loja", icon: <LayoutDashboard size={16} />, group: "Páginas", href: "/dashboard" },
  { id: "nav-admin", label: "Painel Global Admin", description: "Monitoramento de consumo de IA e lojistas", icon: <ShieldCheck size={16} />, group: "Páginas", href: "/dashboard/admin", isAdmin: true },
  { id: "nav-fiscal", label: "Documentos & Fiscal", description: "Módulo fiscal e recibos comerciais", icon: <FileText size={16} />, group: "Páginas", href: "/dashboard/fiscal" },
  { id: "nav-ia", label: "IA Gerente", description: "Inteligência artificial integrada", icon: <Brain size={16} />, group: "Páginas", href: "/dashboard/ia" },
  { id: "nav-pdv", label: "PDV / Caixa", description: "Ponto de venda", icon: <Monitor size={16} />, group: "Páginas", href: "/dashboard/pdv" },
  { id: "nav-produtos", label: "Produtos", description: "Catálogo de produtos", icon: <Package size={16} />, group: "Páginas", href: "/dashboard/produtos", disabled: true },
  { id: "nav-clientes", label: "Clientes", description: "Base de clientes", icon: <Users size={16} />, group: "Páginas", href: "/dashboard/clientes", disabled: true },
  { id: "nav-fidelidade", label: "Fidelidade & Cashback", description: "Gerenciar pontos, recompensas e ranking", icon: <Gift size={16} />, group: "Páginas", href: "/dashboard/fidelidade" },
  { id: "nav-estoque", label: "Estoque", description: "Controle de estoque", icon: <Warehouse size={16} />, group: "Páginas", href: "/dashboard/estoque", disabled: true },
  { id: "nav-compras", label: "Compras", description: "Pedidos de compra e reposição", icon: <ShoppingBag size={16} />, group: "Páginas", href: "/dashboard/compras" },
  { id: "nav-fornecedores", label: "Fornecedores", description: "Análise e cadastro de fornecedores", icon: <Truck size={16} />, group: "Páginas", href: "/dashboard/fornecedores" },
  { id: "nav-financeiro", label: "Financeiro", description: "Contas a pagar e receber", icon: <DollarSign size={16} />, group: "Páginas", href: "/dashboard/financeiro" },
  { id: "nav-relatorios", label: "Relatórios", description: "Relatórios gerenciais", icon: <BarChart3 size={16} />, group: "Páginas", href: "/dashboard/relatorios", disabled: true },
  { id: "nav-usuarios", label: "Usuários", description: "Gerenciar acessos", icon: <UserPlus size={16} />, group: "Páginas", href: "/dashboard/usuarios", disabled: true },
  { id: "nav-config", label: "Configurações", description: "Configurações da loja", icon: <Settings size={16} />, group: "Páginas", href: "/dashboard/configuracoes", disabled: true },
  { id: "nav-assinatura", label: "Assinatura", description: "Plano e cobrança", icon: <CreditCard size={16} />, group: "Páginas", href: "/dashboard/assinatura", disabled: true },

  // Ações Rápidas
  { id: "act-nova-venda", label: "Nova Venda", description: "Abrir o PDV para nova venda", icon: <Monitor size={16} />, group: "Ações Rápidas" },
  { id: "act-abrir-caixa", label: "Abrir Caixa", description: "Abrir turno de caixa", icon: <Calculator size={16} />, group: "Ações Rápidas", disabled: true },
  { id: "act-novo-produto", label: "Novo Produto", description: "Cadastrar novo produto", icon: <Package size={16} />, group: "Ações Rápidas", disabled: true },
  { id: "act-novo-cliente", label: "Novo Cliente", description: "Cadastrar novo cliente", icon: <Users size={16} />, group: "Ações Rápidas", disabled: true },
  { id: "act-falar-ia", label: "Falar com IA Gerente", description: "Obter recomendações inteligentes", icon: <Brain size={16} />, group: "Ações Rápidas", href: "/dashboard/ia" },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  userTipo = "caixa",
  userEmail = "",
}) => {
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Filter items based on query and role
  const filteredItems = React.useMemo(() => {
    let items = DEFAULT_ITEMS;

    // Apenas exibe itens de admin para o e-mail do administrador global
    items = items.filter(item => {
      if ((item as any).isAdmin) {
        return userEmail === "datacentershope@gmail.com";
      }
      return true;
    });

    if (userTipo === "estoquista") {
      // estoquista has NO access to: financeiro, caixa (PDV/Caixa, Controle de Caixa), configuracoes, usuarios, assinatura
      items = items.filter(item => 
        !["nav-pdv", "nav-caixa", "nav-financeiro", "nav-relatorios", "nav-usuarios", "nav-config", "nav-assinatura", "act-nova-venda", "act-abrir-caixa"].includes(item.id)
      );
    } else if (userTipo === "caixa") {
      // caixa has NO access to: compras, estoque, produtos, fornecedores, ia gerente, financeiro, relatorios, usuarios, configuracoes, assinatura
      items = items.filter(item => 
        ["nav-dashboard", "nav-pdv", "nav-caixa", "nav-clientes", "act-nova-venda", "act-abrir-caixa", "act-novo-cliente"].includes(item.id)
      );
    }

    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [query, userTipo]);

  // Group items
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Flat list for keyboard navigation
  const flatList = React.useMemo(() => {
    return Object.values(groupedItems).flat();
  }, [groupedItems]);

  // Focus input on open
  React.useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Lock body scroll
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        const selected = flatList[selectedIndex];
        if (selected && !selected.disabled) {
          if (selected.href) {
            window.location.href = selected.href;
          }
          if (selected.action) {
            selected.action();
          }
          onClose();
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Scroll selected item into view
  React.useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Command Panel */}
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col max-h-[60vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Buscar páginas, produtos, clientes, ações..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground select-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {flatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhum resultado encontrado
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Tente buscar por outro termo
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([group, items]) => (
              <div key={group} className="mb-2">
                <h6 className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/60 select-none">
                  {group}
                </h6>

                {items.map((item) => {
                  flatIndex++;
                  const currentFlatIndex = flatIndex;
                  const isSelected = currentFlatIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      data-index={currentFlatIndex}
                      disabled={item.disabled}
                      onClick={() => {
                        if (item.disabled) return;
                        if (item.href) window.location.href = item.href;
                        if (item.action) item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-100 cursor-pointer",
                        {
                          "bg-primary/10 text-primary": isSelected && !item.disabled,
                          "text-foreground hover:bg-muted/50": !isSelected && !item.disabled,
                          "text-muted-foreground/40 cursor-not-allowed": item.disabled,
                        }
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                          {
                            "bg-primary/10 border-primary/20 text-primary": isSelected && !item.disabled,
                            "bg-muted border-border text-muted-foreground": !isSelected || item.disabled,
                          }
                        )}
                      >
                        {item.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-2">
                          {item.label}
                          {item.disabled && (
                            <span className="text-[8px] bg-muted text-muted-foreground/60 px-1 py-0.5 rounded font-bold uppercase border border-border/30">
                              BREVE
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </div>

                      {isSelected && !item.disabled && (
                        <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-fade-in" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[9px] font-bold">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[9px] font-bold">↵</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[9px] font-bold">esc</kbd>
              fechar
            </span>
          </div>
          <span className="flex items-center gap-1 font-bold">
            <Command size={10} />
            ShopMind
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to listen for Ctrl+K / Cmd+K globally and toggle the command palette.
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
