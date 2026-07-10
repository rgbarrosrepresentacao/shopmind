"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { StoreSwitcher } from "./store-switcher";
import { Logo } from "@/components/brand/logo";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Monitor,
  Calculator,
  Users,
  Truck,
  ShoppingBag,
  DollarSign,
  BarChart3,
  Brain,
  UserPlus,
  Settings,
  CreditCard,
  LogOut,
  X,
  Sparkles,
  ShieldCheck,
  Gift,
  FileText,
  Building2,
  TrendingUp,
} from "lucide-react";

interface SidebarProps {
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
  onClose?: () => void; // for mobile drawer close
}

export const Sidebar: React.FC<SidebarProps> = ({
  store,
  profile,
  signOutAction,
  className,
  onClose,
}) => {
  const pathname = usePathname();

  interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<any>;
    disabled?: boolean;
    isAI?: boolean;
    isAdmin?: boolean;
    isOwner?: boolean;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const navigationGroups: NavGroup[] = [
    {
      title: "Administração",
      items: [
        { name: "Painel Global", href: "/dashboard/admin", icon: ShieldCheck, isAdmin: true },
        { name: "Centro de Comando", href: "/dashboard/corporativo", icon: TrendingUp, isOwner: true },
        { name: "Multi-Lojas", href: "/dashboard/multilojas", icon: Building2, isOwner: true },
        { name: "Estoque Corporativo", href: "/dashboard/estoque/corporativo", icon: Warehouse, isOwner: true },
        { name: "Documentos & Fiscal", href: "/dashboard/fiscal", icon: FileText },
      ],
    },
    {
      title: "Geral",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "IA Gerente", href: "/dashboard/ia", icon: Brain, isAI: true },
      ],
    },
    {
      title: "Operações",
      items: [
        { name: "PDV / Caixa", href: "/dashboard/pdv", icon: Monitor },
        { name: "Controle de Caixa", href: "/dashboard/caixa", icon: Calculator },
        { name: "Compras", href: "/dashboard/compras", icon: ShoppingBag },
        { name: "Estoque", href: "/dashboard/estoque", icon: Warehouse },
        { name: "Transferências", href: "/dashboard/estoque/transferencias", icon: Truck },
      ],
    },
    {
      title: "Cadastros",
      items: [
        { name: "Produtos", href: "/dashboard/produtos", icon: Package },
        { name: "Clientes", href: "/dashboard/clientes", icon: Users },
        { name: "Fidelidade", href: "/dashboard/fidelidade", icon: Gift },
        { name: "Fornecedores", href: "/dashboard/fornecedores", icon: Truck },
      ],
    },
    {
      title: "Relatórios & Finanças",
      items: [
        { name: "Financeiro", href: "/dashboard/financeiro", icon: DollarSign },
        { name: "Relatórios", href: "/dashboard/relatorios", icon: BarChart3 },
      ],
    },
    {
      title: "Sistema",
      items: [
        { name: "Usuários", href: "/dashboard/usuarios", icon: UserPlus, isOwner: true },
        { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
        { name: "Assinatura", href: "/dashboard/assinatura", icon: CreditCard, disabled: true },
      ],
    },
  ];

  const userTipo = profile?.tipo || "caixa";
  const userEmail = profile?.email || "";

  const visibleGroups = navigationGroups.map(group => {
    let items = group.items;

    // Filtros de acesso por nível / admin
    items = items.filter(item => {
      if ((item as any).isAdmin) {
        return userEmail === "datacentershope@gmail.com";
      }
      if ((item as any).isOwner) {
        return userTipo === "dono";
      }
      return true;
    });

    if (userTipo === "estoquista") {
      // estoquista: Vê apenas: Produtos, Estoque, Compras, Fornecedores e o Dashboard principal + Transferências
      items = items.filter(item => 
        ["Dashboard", "Produtos", "Estoque", "Compras", "Fornecedores", "Transferências"].includes(item.name)
      );
    } else if (userTipo === "caixa" || userTipo === "vendedor") {
      // caixa / vendedor: Vê apenas: PDV, Controle de Caixa, Clientes, e Dashboard
      items = items.filter(item => 
        ["Dashboard", "PDV / Caixa", "Controle de Caixa", "Clientes"].includes(item.name)
      );
    } else if (userTipo === "financeiro") {
      // financeiro: Vê apenas: Financeiro, Relatórios, Dashboard + Estoque Corporativo e Transferências
      items = items.filter(item => 
        ["Dashboard", "Financeiro", "Relatórios", "Estoque Corporativo", "Transferências"].includes(item.name)
      );
    }

    return { ...group, items };
  }).filter(group => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex flex-col w-64 border-r border-border bg-card/60 backdrop-blur-md text-foreground h-full transition-all duration-300 relative select-none",
        className
      )}
    >
      {/* Sidebar Brand / Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border/80">
        <Logo variant="full" size="md" />
        
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>
      
      {/* Tenant info / Store Switcher */}
      <div className="px-4 pt-4">
        <StoreSwitcher />
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h5 className="px-3 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
              {group.title}
            </h5>
            
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/dashboard'
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                
                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground/40 cursor-not-allowed group"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto text-[8px] bg-muted text-muted-foreground/70 px-1.5 py-0.5 rounded font-bold border border-border/30">
                        BREVE
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 relative group",
                      {
                        // Active styles
                        "text-primary bg-primary/10 border-l-2 border-l-primary rounded-l-none pl-2.5":
                          isActive && !item.isAI,
                        "text-ia bg-ia/10 border-l-2 border-l-ia rounded-l-none pl-2.5 shadow-glow-purple/5":
                          isActive && item.isAI,
                        
                        // Inactive styles
                        "text-muted-foreground hover:text-foreground hover:bg-muted/50":
                          !isActive && !item.isAI,
                        
                        // IA Special styling (inactive)
                        "text-ia/80 hover:text-ia hover:bg-ia/5":
                          !isActive && item.isAI,
                      }
                    )}
                  >
                    <Icon
                      className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-105", {
                        "text-primary": isActive && !item.isAI,
                        "text-ia animate-pulse-glow": item.isAI,
                      })}
                    />
                    <span className="truncate">{item.name}</span>
                    
                    {item.isAI && (
                      <span className="ml-auto flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-ia animate-pulse" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Footer with Logout & User Profile */}
      <div className="p-4 border-t border-border/80 bg-muted/20">
        <div className="flex items-center gap-3 mb-3.5 px-2">
          {/* User initials avatar */}
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs text-muted-foreground flex-shrink-0">
            {profile?.nome ? profile.nome.substring(0, 2).toUpperCase() : "U"}
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-foreground truncate leading-none">
              {profile?.nome || "Usuário"}
            </span>
            <span className="text-[9px] text-muted-foreground mt-1 truncate">
              {profile?.email || "email@shopmind.com"}
            </span>
          </div>
        </div>

        <button
          onClick={signOutAction}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 hover:border-destructive/30 border border-transparent transition-all duration-200 cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
};
