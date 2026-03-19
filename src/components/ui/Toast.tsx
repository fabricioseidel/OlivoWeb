"use client";

import { Fragment, useEffect } from "react";
import { Transition } from "@headlessui/react";
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type: ToastType;
  message: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast = ({ type = "info", message, show, onClose, duration = 4000 }: ToastProps) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => onClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    info: {
      icon: Info,
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
  }[type];

  const Icon = config.icon;

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-200"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
    >
      <div className={`max-w-[calc(100vw-2rem)] w-72 pointer-events-auto overflow-hidden rounded-[2rem] bg-white/90 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-black/5 transition-all border ${config.border}`}>
        <div className="p-3">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 rounded-full p-2 ${config.bg}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-900 truncate">
                {message}
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={onClose}
                className="p-1 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Subtle Progress Bar */}
        <div className="h-1 w-full bg-gray-100/50">
          <div
            className={`h-full ${config.color.replace('text-', 'bg-')} opacity-60`}
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
        <style jsx>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </Transition>
  );
};

export default Toast;
