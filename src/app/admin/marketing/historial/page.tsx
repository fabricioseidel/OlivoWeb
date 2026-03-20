"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClockIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

type EmailLog = {
  id: number;
  to_email: string;
  to_name?: string;
  from_email: string;
  subject: string;
  template_slug?: string;
  status: string;
  resend_id?: string;
  error_message?: string;
  sent_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  bounced: "bg-amber-100 text-amber-700",
  opened: "bg-blue-100 text-blue-700",
  clicked: "bg-purple-100 text-purple-700",
};

const TEMPLATE_LABELS: Record<string, string> = {
  order_confirmation: "Confirmación Pedido",
  pos_receipt: "Boleta POS",
  welcome: "Bienvenida",
  points_earned: "Puntos Ganados",
  campaign: "Campaña",
};

export default function HistorialPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/email/log?limit=100";
      if (filter) url += `&status=${filter}`;
      const res = await fetch(url);
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const counts = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ClockIcon className="h-7 w-7 text-rose-500" />
            Historial de Emails
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {counts.total} emails · {counts.sent} enviados · {counts.failed}{" "}
            fallidos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todos</option>
            <option value="sent">Enviados</option>
            <option value="failed">Fallidos</option>
            <option value="opened">Abiertos</option>
          </select>
          <button
            onClick={loadLogs}
            className="p-2 text-slate-400 hover:text-slate-600"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <EnvelopeIcon className="h-16 w-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-400">Sin emails enviados</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Mobile view */}
          <div className="md:hidden divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-bold text-slate-700 truncate">
                      {log.subject}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {log.to_email}
                    </p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>
                    {TEMPLATE_LABELS[log.template_slug || ""] ||
                      log.template_slug ||
                      "Custom"}
                  </span>
                  <span>
                    {new Date(log.sent_at).toLocaleDateString("es-CL")}
                  </span>
                </div>
                {log.error_message && (
                  <p className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                    {log.error_message}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Destinatario
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Asunto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-slate-700">
                        {log.to_name || log.to_email}
                      </p>
                      {log.to_name && (
                        <p className="text-xs text-slate-400">{log.to_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[250px] truncate">
                      {log.subject}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold">
                        {TEMPLATE_LABELS[log.template_slug || ""] ||
                          log.template_slug ||
                          "Custom"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.sent_at).toLocaleString("es-CL")}
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

function StatusBadge({ status }: { status: string }) {
  const Icon = status === "sent" ? CheckCircleIcon : XCircleIcon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
        STATUS_COLORS[status] || "bg-slate-100 text-slate-500"
      }`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}
