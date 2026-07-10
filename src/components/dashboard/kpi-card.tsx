import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string; // e.g., 'text-blue-500'
  iconBg?: string;    // e.g., 'bg-blue-500/10'
  trend?: {
    value: number | string;
    isPositive: boolean;
  };
  progress?: {
    value: number; // 0 to 100
    maxLabel?: string;
  };
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  trend,
  progress,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-card text-card-foreground border border-border/60 rounded-xl p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:border-border hover:-translate-y-0.5 select-none animate-slide-up",
        className
      )}
    >
      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 bg-radial-gradient from-white/3 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {title}
        </span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg, iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold tracking-tight tabular-nums">
          {value}
        </span>
        
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md",
              {
                "bg-success/15 text-success": trend.isPositive,
                "bg-destructive/15 text-destructive": !trend.isPositive,
              }
            )}
          >
            {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trend.value}</span>
          </span>
        )}
      </div>

      {/* Sub-footer options (like progress bars) */}
      {progress && (
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress.value))}%` }}
            />
          </div>
          {progress.maxLabel && (
            <span className="text-[10px] text-muted-foreground text-right font-medium">
              {progress.maxLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
