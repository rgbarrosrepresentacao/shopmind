import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options = [], placeholder, id, children, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold tracking-wider uppercase text-muted-foreground select-none">
            {label}
          </label>
        )}
        
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "w-full bg-input text-foreground border border-border rounded-lg text-sm transition-all duration-200 outline-none appearance-none cursor-pointer",
              "focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10",
              {
                "border-destructive focus:border-destructive focus:ring-destructive/10": !!error,
              },
              "py-2.5 pl-3.5 pr-10",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                {opt.label}
              </option>
            ))}
            
            {children}
          </select>
          
          <div className="absolute right-3.5 text-muted-foreground pointer-events-none flex items-center justify-center">
            <ChevronDown size={16} />
          </div>
        </div>
        
        {error && (
          <span className="text-xs text-destructive font-medium animate-slide-up">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
