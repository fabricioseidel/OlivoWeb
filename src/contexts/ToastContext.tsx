"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType; duration: number }>>([]);

  const showToast = (message: string, type: ToastType = "info", duration: number = 4000) => {
    const id = Date.now() + Math.random() * 1000;
    setToasts(prev => {
      const next = [...prev, { id, message, type, duration }];
      return next.length > 3 ? next.slice(1) : next;
    });
    if (duration > 0) {
      setTimeout(() => handleClose(id), duration);
    }
  };

  const handleClose = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // No central queue animation needed; we render stacked toasts concurrently.

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast stack: bottom-right to be less invasive */}
      <div className="fixed bottom-20 sm:bottom-8 right-0 sm:right-8 z-[100] pointer-events-none flex flex-col items-center sm:items-end gap-2 px-4 w-full sm:w-auto">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            show={true}
            message={t.message}
            type={t.type}
            onClose={() => handleClose(t.id)}
            duration={t.duration}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
