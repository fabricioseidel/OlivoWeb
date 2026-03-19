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
      enter="transform ease-out duration-200 transition"
      enterFrom="translate-y-4 opacity-0 scale-95"
      enterTo="translate-y-0 opacity-100 scale-100"
      leave="transition ease-in duration-150"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
    >
      <div className={`pointer-events-auto overflow-hidden rounded-full bg-slate-900/80 backdrop-blur-lg shadow-2xl ring-1 ring-white/10 transition-all border ${config.border.replace('bg-', 'border-').replace('50', '500/20')}`}>
        <div className="px-4 py-2 flex items-center gap-2.5">
          <div className={`flex-shrink-0`}>
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white whitespace-nowrap">
            {message}
          </p>
          <button onClick={onClose} className="ml-1 p-0.5 rounded-full text-white/30 hover:text-white transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
        {/* Slim Progress Bar */}
        <div className="h-[2px] w-full bg-white/5">
          <div
            className={`h-full ${config.color.replace('text-', 'bg-')}`}
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
