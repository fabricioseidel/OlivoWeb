"use client";

import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface SettingsHeaderProps {
  showSuccess: boolean;
  error: string | null;
}

export default function SettingsHeader({ showSuccess, error }: SettingsHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
            <p className="mt-1 text-sm text-slate-500">
              Personaliza tu tienda online
            </p>
          </div>
          {showSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">Guardado</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <XCircleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700 font-medium">{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
