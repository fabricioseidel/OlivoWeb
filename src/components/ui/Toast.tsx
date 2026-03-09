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
      <div className={`max-w-md w-full sm:w-80 pointer-events-auto overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 transition-all hover:shadow-2xl border ${config.border}`}>
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 rounded-xl p-2 ${config.bg}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-semibold text-gray-900">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </p>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{message}</p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={onClose}
                className="inline-flex rounded-lg p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                <span className="sr-only">Cerrar</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="h-1 w-full bg-gray-50">
          <div 
            className={`h-full ${config.color.replace('text-', 'bg-')} transition-all duration-[4000ms] ease-linear`}
            style={{ width: show ? '0%' : '100%' }}
          />
        </div>
      </div>
    </Transition>
  );
};

export default Toast;
