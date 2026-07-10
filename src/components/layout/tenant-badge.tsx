import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "../ui/badge";

export interface TenantBadgeProps {
  storeName: string;
  planName?: string;
  status?: "ativo" | "trial" | "suspenso";
  className?: string;
}

export const TenantBadge: React.FC<TenantBadgeProps> = ({
  storeName,
  planName = "Plano Único",
  status = "trial",
  className,
}) => {
  // Get store initials
  const initials = storeName
    ? storeName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SM";

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border transition-all duration-200 select-none",
        className
      )}
    >
      {/* Avatar with Gradient Background */}
      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-primary to-ia text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/15 flex-shrink-0">
        {initials}
      </div>

      {/* Details */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-foreground truncate leading-none">
            {storeName || "Minha Loja"}
          </span>
          
          {/* Status Dot */}
          <span
            className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", {
              "bg-success animate-pulse": status === "ativo",
              "bg-warning": status === "trial",
              "bg-destructive": status === "suspenso",
            })}
            title={
              status === "ativo"
                ? "Ativo"
                : status === "trial"
                ? "Período de Testes (Trial)"
                : "Assinatura Suspensa"
            }
          />
        </div>
        
        {/* Subscription Plan */}
        <span className="text-[10px] text-muted-foreground mt-1 truncate">
          {planName}
        </span>
      </div>
    </div>
  );
};
