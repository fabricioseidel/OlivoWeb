"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClockIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/shell";

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
  sent: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  failed: "bg-rose-100 text-rose-700 ring-rose-200",
  bounced: "bg-amber-100 text-amber-700 ring-amber-200",
  opened: "bg-sky-100 text-sky-700 ring-sky-200",
  clicked: "bg-purple-100 text-purple-700 ring-purple-200",
};

const TEMPLATE_LABELS: Record<string, string> = {
  order_confirmation: "Confirmación Pedido",
  pos_receipt: "Boleta POS",
  welcome: "Bienvenida",
  points_earned: "Puntos Ganados",
  campaign: "Campaña",
};

function StatusBadge({ status }: { status: string }) {
  const Icon = status === "sent" ? CheckCircleIcon : XCircleIcon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ${
        STATUS_COLORS[status] || "bg-gray-100 text-gray-500 ring-gray-200"
      }`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

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

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l) => l.status === "sent").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const opened = logs.filter((l) => l.status === "opened").length;
    return { total, sent, failed, opened };
  }, [logs]);

  const columns: Column<EmailLog>[] = [
    {
      key: "recipient",
      header: "Destinatario",
      cell: (log) => (
        <div>
          <p className="text-sm font-bold text-gray-700">
            {log.to_name || log.to_email}
          </p>
          {log.to_name && (
            <p className="text-xs text-gray-400">{log.to_email}</p>
          )}
        </div>
      ),
    },
    {
      key: "subject",
      header: "Asunto",
      cell: (log) => (
        <span className="text-sm text-gray-600 line-clamp-2">
          {log.subject}
        </span>
      ),
    },
    {
      key: "template",
      header: "Template",
      cell: (log) => (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold">
          {TEMPLATE_LABELS[log.template_slug || ""] ||
            log.template_slug ||
            "Custom"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (log) => <StatusBadge status={log.status} />,
    },
    {
      key: "date",
      header: "Fecha",
      cell: (log) => (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(log.sent_at).toLocaleString("es-CL")}
        </span>
      ),
    },
  ];

  const renderMobileCard = (log: EmailLog) => (
    <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-700 truncate">
            {log.subject}
          </p>
          <p className="text-xs text-gray-400 truncate">
            Para: {log.to_email}
          </p>
        </div>
        <StatusBadge status={log.status} />
      </div>
      <div className="flex items-center justify-between gap-3 text-[10px] text-gray-400 pt-2 border-t border-gray-100">
        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
          {TEMPLATE_LABELS[log.template_slug || ""] ||
            log.template_slug ||
            "Custom"}
        </span>
        <span>{new Date(log.sent_at).toLocaleDateString("es-CL")}</span>
      </div>
      {log.error_message && (
        <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 px-2 py-1 rounded">
          {log.error_message}
        </p>
      )}
    </div>
  );

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Marketing"
          title="Historial de emails"
          subtitle="Auditá envíos, fallos y aperturas de todos los emails transaccionales y campañas"
          icon={<ClockIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white/10 ring-1 ring-white/15 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-emerald-400 min-h-[36px]"
              >
                <option value="" className="text-gray-900">
                  Todos
                </option>
                <option value="sent" className="text-gray-900">
                  Enviados
                </option>
                <option value="failed" className="text-gray-900">
                  Fallidos
                </option>
                <option value="opened" className="text-gray-900">
                  Abiertos
                </option>
              </select>
              <button
                onClick={loadLogs}
                disabled={loading}
                className="p-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-emerald-100 hover:bg-white/15 transition-colors min-h-[36px]"
                title="Actualizar"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Total"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<EnvelopeIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Enviados"
          value={stats.sent.toLocaleString()}
          tone="emerald"
          icon={<CheckCircleIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Abiertos"
          value={stats.opened.toLocaleString()}
          tone="sky"
        />
        <StatsCard
          label="Fallidos"
          value={stats.failed.toLocaleString()}
          tone="rose"
          icon={<ExclamationCircleIcon className="w-4 h-4" />}
        />
      </StatsRow>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
        </div>
      ) : (
        <ResponsiveTable<EmailLog>
          columns={columns}
          rows={logs}
          rowKey={(log) => String(log.id)}
          renderMobileCard={renderMobileCard}
          emptyState={
            <EmptyState
              icon={<EnvelopeIcon className="h-7 w-7" />}
              title="Sin emails enviados"
              description={filter ? "Cambiá el filtro para ver más." : undefined}
            />
          }
        />
      )}
    </PageShell>
  );
}
