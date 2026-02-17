"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType; duration: number }>>([]);

  const showToast = (message: string, type: ToastType = "info", duration: number = 10000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  const handleClose = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // No central queue animation needed; we render stacked toasts concurrently.

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast stack: fixed, floating with more margin */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[60] pointer-events-none flex flex-col-reverse items-end gap-3">
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
