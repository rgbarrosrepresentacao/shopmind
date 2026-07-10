"use client";

import * as React from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

type Listener = (toasts: Toast[]) => void;
let listeners: Listener[] = [];
let toasts: Toast[] = [];

export const toast = {
  success: (msg: string, duration?: number) => addToast("success", msg, duration),
  error: (msg: string, duration?: number) => addToast("error", msg, duration),
  warning: (msg: string, duration?: number) => addToast("warning", msg, duration),
  info: (msg: string, duration?: number) => addToast("info", msg, duration),
  dismiss: (id: string) => removeToast(id),
};

function addToast(type: Toast["type"], message: string, duration = 4000) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: Toast = { id, type, message, duration };
  toasts = [...toasts, newToast];
  notify();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

function notify() {
  listeners.forEach((l) => l(toasts));
}

export function useToasts() {
  const [activeToasts, setActiveToasts] = React.useState<Toast[]>(toasts);

  React.useEffect(() => {
    const handleUpdate = (updatedToasts: Toast[]) => {
      setActiveToasts(updatedToasts);
    };

    listeners.push(handleUpdate);
    // Initial sync
    setActiveToasts(toasts);

    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  return {
    toasts: activeToasts,
    dismiss: removeToast,
  };
}

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((item) => {
        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-card text-foreground shadow-2xl transition-all duration-300 animate-slide-down",
              {
                "border-success/30 shadow-success/5": item.type === "success",
                "border-destructive/30 shadow-destructive/5": item.type === "error",
                "border-warning/30 shadow-warning/5": item.type === "warning",
                "border-primary/30 shadow-primary/5": item.type === "info",
              }
            )}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {item.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-success" />
              )}
              {item.type === "error" && (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              {item.type === "warning" && (
                <AlertTriangle className="w-5 h-5 text-warning" />
              )}
              {item.type === "info" && (
                <Info className="w-5 h-5 text-primary" />
              )}
            </div>

            {/* Message */}
            <div className="flex-1 text-sm font-medium leading-normal pr-2">
              {item.message}
            </div>

            {/* Close Button */}
            <button
              onClick={() => dismiss(item.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground cursor-pointer rounded p-0.5 hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
