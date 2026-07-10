import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    // Generate unique id if not provided for accessibility
    const inputId = id || React.useId();

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold tracking-wider uppercase text-muted-foreground select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-muted-foreground pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={inputType}
            className={cn(
              "w-full bg-input text-foreground border border-border rounded-lg text-sm transition-all duration-200 outline-none",
              "placeholder:text-muted-foreground",
              "focus:bg-card focus:border-primary focus:ring-4 focus:ring-primary/10",
              {
                "pl-10": !!leftIcon,
                "pr-10": !!rightIcon || isPassword,
                "pl-3.5": !leftIcon,
                "pr-3.5": !rightIcon && !isPassword,
                "border-destructive focus:border-destructive focus:ring-destructive/10": !!error,
              },
              "py-2.5",
              className
            )}
            {...props}
          />
          
          {/* Custom Right icon or password toggle */}
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3.5 text-muted-foreground flex items-center justify-center">
              {rightIcon}
            </div>
          ) : null}
        </div>
        
        {error ? (
          <span className="text-xs text-destructive font-medium animate-slide-up">
            {error}
          </span>
        ) : hint ? (
          <span className="text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
