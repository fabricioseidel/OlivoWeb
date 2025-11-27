"use client";

import { Fragment, useEffect } from "react";
import { Transition } from "@headlessui/react";
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type: ToastType;
  message: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast = ({ type = "info", message, show, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => onClose(), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="h-6 w-6 text-green-500" aria-hidden="true" />;
      case "error":
        return <ExclamationCircleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />;
      case "warning":
        return <ExclamationCircleIcon className="h-6 w-6 text-yellow-500" aria-hidden="true" />;
      case "info":
      default:
        return <CheckCircleIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />;
    }
  };

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="max-w-xs w-auto bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden hover:shadow-md transition-all">
        <div className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{message}</p>
            </div>
            <div className="flex-shrink-0">
              <button
                className="bg-transparent rounded-md p-1 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none hover:bg-gray-50"
                onClick={onClose}
              >
                <span className="sr-only">Cerrar</span>
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
};

export default Toast;
