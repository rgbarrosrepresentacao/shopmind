import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "success" | "ai";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
          
          // Variants
          {
            "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-primary/20 hover:shadow-lg": variant === "primary",
            "bg-secondary text-secondary-foreground hover:bg-muted border border-border": variant === "secondary",
            "hover:bg-muted hover:text-accent-foreground text-muted-foreground": variant === "ghost",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-destructive/20": variant === "destructive",
            "bg-success text-white hover:bg-success/90 shadow-md hover:shadow-success/20": variant === "success",
            "bg-ia text-white hover:bg-ia/90 shadow-glow-purple border border-ia/30 animate-pulse-glow": variant === "ai",
          },
          
          // Sizes
          {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-4 py-2.5 text-sm": size === "md",
            "px-6 py-3.5 text-base": size === "lg",
            "h-10 w-10 p-0 flex items-center justify-center": size === "icon",
          },
          
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {size !== "icon" && <span>Carregando...</span>}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
