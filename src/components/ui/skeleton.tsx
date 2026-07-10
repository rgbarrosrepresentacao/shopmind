import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "card" | "table-row";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "text",
  ...props
}) => {
  return (
    <div
      className={cn(
        "shimmer-bg rounded",
        {
          "h-4 w-full": variant === "text",
          "h-12 w-12 rounded-full flex-shrink-0": variant === "circle",
          "h-32 w-full rounded-xl border border-border p-5": variant === "card",
          "h-10 w-full flex items-center justify-between gap-4 border-b border-border/50 py-3": variant === "table-row",
        },
        className
      )}
      {...props}
    >
      {variant === "table-row" && (
        <>
          <div className="w-[10%] h-3 bg-muted rounded" />
          <div className="w-[30%] h-3 bg-muted rounded" />
          <div className="w-[20%] h-3 bg-muted rounded" />
          <div className="w-[15%] h-3 bg-muted rounded" />
          <div className="w-[10%] h-3 bg-muted rounded" />
        </>
      )}
      
      {variant === "card" && (
        <div className="flex flex-col gap-3 h-full">
          <div className="w-[40%] h-4 bg-muted rounded" />
          <div className="w-[80%] h-6 bg-muted rounded mt-1" />
          <div className="w-[60%] h-3 bg-muted rounded mt-auto" />
        </div>
      )}
    </div>
  );
};
