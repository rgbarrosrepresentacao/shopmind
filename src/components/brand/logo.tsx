import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  /** "full" = icon + wordmark, "compact" = icon + SM, "icon" = icon only */
  variant?: "full" | "compact" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * ShopMind brand logo with gradient icon.
 * The icon represents a neural brain inside a rounded square (intelligence + commerce).
 */
export const Logo: React.FC<LogoProps> = ({
  variant = "full",
  size = "md",
  className,
}) => {
  const iconSize = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[size];

  const textSize = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  }[size];

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* Icon Mark */}
      <div
        className={cn(
          iconSize,
          "rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 relative overflow-hidden"
        )}
      >
        {/* Neural brain SVG inside the icon */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Brain silhouette */}
          <path
            d="M20 10c-4.5 0-8 2.8-8 6.8 0 2 1.1 3.8 2.8 5L14.2 30h4.3l.5-6.5h2l.5 6.5h4.3l-.6-8.2c1.7-1.2 2.8-3 2.8-5 0-4-3.5-6.8-8-6.8z"
            fill="white"
            opacity="0.95"
          />
          {/* Eyes */}
          <circle cx="17" cy="16.5" r="1.3" fill="#6366f1" />
          <circle cx="23" cy="16.5" r="1.3" fill="#6366f1" />
          {/* Smile */}
          <path
            d="M17.5 17c0 0 1.2 2.5 2.5 2.5s2.5-2.5 2.5-2.5"
            stroke="#6366f1"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Sparkle dots */}
          <circle cx="10" cy="10" r="1.5" fill="#93c5fd" opacity="0.6" />
          <circle cx="32" cy="8" r="1" fill="#c4b5fd" opacity="0.5" />
          <circle cx="34" cy="17" r="0.8" fill="#93c5fd" opacity="0.4" />
        </svg>
      </div>

      {/* Wordmark */}
      {variant !== "icon" && (
        <span
          className={cn(
            textSize,
            "font-extrabold tracking-tight leading-none"
          )}
        >
          {variant === "compact" ? (
            <>
              <span className="text-foreground">S</span>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                M
              </span>
            </>
          ) : (
            <>
              <span className="text-foreground">Shop</span>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Mind
              </span>
            </>
          )}
        </span>
      )}
    </div>
  );
};
