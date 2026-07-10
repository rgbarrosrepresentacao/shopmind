import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "ai" | "outline";
  showDot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", showDot = false, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold select-none border tracking-wide",
          {
            "bg-muted text-muted-foreground border-border": variant === "default",
            "bg-success/10 text-success border-success/20": variant === "success",
            "bg-warning/10 text-warning border-warning/20": variant === "warning",
            "bg-destructive/10 text-destructive border-destructive/20": variant === "error",
            "bg-primary/10 text-primary border-primary/20": variant === "info",
            "bg-ia/15 text-ia border-ia/30 animate-pulse-glow shadow-glow-purple": variant === "ai",
            "bg-transparent text-foreground border-border": variant === "outline",
          },
          className
        )}
        {...props}
      >
        {showDot && (
          <span
            className={cn("w-1.5 h-1.5 rounded-full", {
              "bg-muted-foreground": variant === "default" || variant === "outline",
              "bg-success": variant === "success",
              "bg-warning": variant === "warning",
              "bg-destructive": variant === "error",
              "bg-primary": variant === "info",
              "bg-ia": variant === "ai",
            })}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
