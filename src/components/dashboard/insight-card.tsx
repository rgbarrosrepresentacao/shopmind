import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Brain, Sparkles } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export interface InsightCardProps {
  title: string;
  message: string;
  priority: "alta" | "media" | "baixa";
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  message,
  priority,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-card border-l-4 border-l-ia border-y-border/60 border-r-border/60 border rounded-xl p-5 shadow-md shadow-ia-glow/5 hover:shadow-glow-purple transition-all duration-300 select-none animate-slide-up",
        className
      )}
    >
      {/* Background Brain Icon Watermark with subtle glow */}
      <div className="absolute right-4 top-4 text-ia/5 pointer-events-none">
        <Brain size={80} className="stroke-[1]" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ia/10 flex items-center justify-center text-ia shadow-sm shadow-ia/20">
            <Brain className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-foreground tracking-tight">
            {title}
          </h4>
        </div>
        
        <Badge
          variant={
            priority === "alta" ? "error" : priority === "media" ? "warning" : "default"
          }
          showDot
        >
          {priority === "alta" ? "Alta" : priority === "media" ? "Média" : "Baixa"}
        </Badge>
      </div>

      {/* Body Message */}
      <p className="text-xs text-muted-foreground leading-relaxed pr-8 mb-4">
        {message}
      </p>

      {/* Action Button */}
      {actionLabel && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAction}
            className="text-xs font-semibold text-ia hover:text-ia/90 hover:bg-ia/5 px-2.5 py-1.5 rounded-md flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{actionLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
};
