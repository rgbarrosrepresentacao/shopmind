import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pill";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto select-none",
        {
          "border-b border-border w-full": variant === "underline",
          "bg-input p-1 rounded-lg w-fit border border-border": variant === "pill",
        },
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium px-4 py-2 transition-all duration-200 cursor-pointer relative",
              {
                // Underline styles
                "text-muted-foreground hover:text-foreground border-b-2 border-transparent pb-3":
                  variant === "underline" && !isActive,
                "text-primary border-b-2 border-primary pb-3 font-semibold":
                  variant === "underline" && isActive,
                  
                // Pill styles
                "text-muted-foreground hover:text-foreground rounded-md":
                  variant === "pill" && !isActive,
                "bg-card text-foreground font-semibold rounded-md shadow-sm border border-border/30":
                  variant === "pill" && isActive,
              }
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
