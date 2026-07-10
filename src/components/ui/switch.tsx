import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, checked, onChange, ...props }, ref) => {
    const switchId = id || React.useId();
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
            id={switchId}
            ref={ref}
            type="checkbox"
            checked={internalChecked}
            onChange={handleChange}
            className="peer sr-only"
            {...props}
          />
          
          <div
            onClick={() => {
              const el = document.getElementById(switchId) as HTMLInputElement;
              if (el) el.click();
            }}
            className={cn(
              "w-9 h-5 rounded-full bg-border transition-colors duration-200 cursor-pointer relative p-0.5",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              {
                "bg-primary": internalChecked,
                "hover:bg-border/80": !internalChecked,
              }
            )}
          >
            <div
              className={cn(
                "w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                {
                  "transform translate-x-4": internalChecked,
                  "transform translate-x-0": !internalChecked,
                }
              )}
            />
          </div>
        </div>
        
        {(label || description) && (
          <label htmlFor={switchId} className="flex flex-col cursor-pointer select-none">
            {label && (
              <span className="text-sm font-medium text-foreground leading-none">
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

Switch.displayName = "Switch";
