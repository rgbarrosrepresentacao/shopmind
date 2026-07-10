import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-card/30 max-w-md mx-auto",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center mb-4 text-muted-foreground">
          <Icon className="w-6 h-6" />
        </div>
      )}
      
      <h3 className="text-sm font-bold text-foreground mb-1.5 leading-none">
        {title}
      </h3>
      
      <p className="text-xs text-muted-foreground leading-normal mb-5 max-w-[280px]">
        {description}
      </p>
      
      {action && (
        <div className="flex items-center justify-center animate-fade-in">
          {action}
        </div>
      )}
    </div>
  );
};
