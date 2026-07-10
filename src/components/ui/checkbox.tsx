import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, checked, onChange, ...props }, ref) => {
    const checkboxId = id || React.useId();
    const [internalChecked, setInternalChecked] = React.useState(checked || false);

    React.useEffect(() => {
      if (checked !== undefined) {
        setInternalChecked(checked);
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) {
        setInternalChecked(e.target.checked);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="flex items-start gap-3 select-none">
        <div className="relative flex items-center h-5">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            checked={internalChecked}
            onChange={handleChange}
            className="peer sr-only"
            {...props}
          />
          
          <div
            onClick={() => {
              const el = document.getElementById(checkboxId) as HTMLInputElement;
              if (el) el.click();
            }}
            className={cn(
              "w-5 h-5 rounded-md border border-border bg-input transition-all duration-200 cursor-pointer flex items-center justify-center",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              {
                "bg-primary border-primary text-white shadow-sm shadow-primary/20 scale-100": internalChecked,
                "hover:border-primary/50": !internalChecked,
              }
            )}
          >
            {internalChecked && (
              <Check className="w-3.5 h-3.5 stroke-[3] animate-scale-in" />
            )}
          </div>
        </div>
        
        {(label || description) && (
          <label htmlFor={checkboxId} className="flex flex-col cursor-pointer select-none">
            {label && (
              <span className="text-sm font-medium text-foreground leading-none peer-disabled:opacity-50">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground mt-1 leading-normal">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
