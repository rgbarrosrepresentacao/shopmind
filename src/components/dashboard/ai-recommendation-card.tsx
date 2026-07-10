import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Brain, Sparkles, Check, X, ShoppingBag, Tag, Warehouse } from "lucide-react";
import { Button } from "../ui/button";

export interface AIRecommendationCardProps {
  type: "compra" | "preco" | "estoque";
  title: string;
  description: string;
  onAccept?: () => void;
  onIgnore?: () => void;
  className?: string;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  type,
  title,
  description,
  onAccept,
  onIgnore,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-card border border-border/60 rounded-xl shadow-md hover:shadow-glow-purple/20 hover:border-ia/30 transition-all duration-300 animate-slide-up flex flex-col",
        className
      )}
    >
      {/* Top Purple Gradient Header */}
      <div className="bg-gradient-to-r from-ia/20 to-primary/10 border-b border-border/40 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-ia/20 flex items-center justify-center text-ia shadow-sm shadow-ia/30 animate-pulse-glow">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-ia">
            IA Gerente Recomenda
          </span>
        </div>
        
        {/* Recommended Icon Type */}
        <div className="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-full border border-border">
          {type === "compra" && (
            <>
              <ShoppingBag className="w-3 h-3 text-emerald-500" />
              <span>Compra</span>
            </>
          )}
          {type === "preco" && (
            <>
              <Tag className="w-3 h-3 text-sky-500" />
              <span>Preço</span>
            </>
          )}
          {type === "estoque" && (
            <>
              <Warehouse className="w-3 h-3 text-amber-500" />
              <span>Estoque</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h4 className="text-sm font-bold text-foreground mb-1.5 tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 pr-4">
          {description}
        </p>

        {/* Buttons Action Group */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onIgnore}
            className="text-xs font-semibold hover:bg-muted text-muted-foreground py-1.5 h-8"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Ignorar
          </Button>
          
          <Button
            variant="ai"
            size="sm"
            onClick={onAccept}
            className="text-xs font-semibold py-1.5 h-8 shadow-none"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
};
