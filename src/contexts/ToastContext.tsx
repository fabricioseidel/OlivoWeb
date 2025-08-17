"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import Toast, { ToastType } from "@/components/ui/Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Array<{ message: string; type: ToastType; duration: number }>>([]);
  const [current, setCurrent] = useState<{ message: string; type: ToastType; duration: number } | null>(null);
  const [show, setShow] = useState(false);

  const showToast = (message: string, type: ToastType = "info", duration: number = 3000) => {
    setQueue(prev => [...prev, { message, type, duration }]);
  };

  const handleClose = () => {
    setShow(false);
    setCurrent(null);
  };

  // Show next toast when current is closed
  useEffect(() => {
    if (!show && queue.length > 0 && !current) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
      setShow(true);
    }
  }, [show, queue, current]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current && (
        <Toast
          show={show}
          message={current.message}
          type={current.type}
          onClose={handleClose}
          duration={current.duration}
        />
      )}
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
