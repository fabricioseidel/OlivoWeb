"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  NewspaperIcon,
  TrashIcon,
  ArrowPathIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";

type Subscriber = {
  id: number;
  email: string;
  name?: string;
  is_active: boolean;
  source: string;
  subscribed_at: string;
};

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadSubscribers = useCallback(async () => {
    try {
      const res = await fetch("/api/newsletter");
      if (res.ok) setSubscribers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  const unsubscribe = async (email: string) => {
    if (!confirm(`¿Desuscribir a ${email}?`)) return;
    try {
      await fetch(`/api/newsletter?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      showToast("Desuscrito", "success");
      loadSubscribers();
    } catch {
      showToast("Error", "error");
    }
  };

  const activeCount = subscribers.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <NewspaperIcon className="h-7 w-7 text-purple-600" />
            Newsletter
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeCount} suscriptores activos de {subscribers.length} total
          </p>
        </div>
        <button
          onClick={loadSubscribers}
          className="p-2 text-slate-400 hover:text-slate-600"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
        </div>
      ) : subscribers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <EnvelopeIcon className="h-16 w-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-400">
            Sin suscriptores
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Los clientes se suscribirán desde el widget del sitio web
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Fuente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Fecha
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">
                      {s.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {s.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold">
                        {s.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          s.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(s.subscribed_at).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-4 py-3">
                      {s.is_active && (
                        <button
                          onClick={() => unsubscribe(s.email)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
