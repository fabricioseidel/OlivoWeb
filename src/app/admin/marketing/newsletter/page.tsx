"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  NewspaperIcon,
  TrashIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/shell";

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
  const [search, setSearch] = useState("");
  const { showToast } = useToast();

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
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

  const stats = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter((s) => s.is_active).length;
    const inactive = total - active;
    const sources = new Set(subscribers.map((s) => s.source)).size;
    return { total, active, inactive, sources };
  }, [subscribers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return subscribers;
    const q = search.trim().toLowerCase();
    return subscribers.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q)
    );
  }, [subscribers, search]);

  const columns: Column<Subscriber>[] = [
    {
      key: "email",
      header: "Email",
      cell: (s) => (
        <div>
          <div className="text-sm font-bold text-gray-700">{s.email}</div>
          {s.name && (
            <div className="text-xs text-gray-500">{s.name}</div>
          )}
        </div>
      ),
    },
    {
      key: "source",
      header: "Fuente",
      cell: (s) => (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold">
          {s.source}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (s) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ${
            s.is_active
              ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
              : "bg-rose-100 text-rose-700 ring-rose-200"
          }`}
        >
          {s.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Fecha",
      cell: (s) => (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {new Date(s.subscribed_at).toLocaleDateString("es-CL")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (s) =>
        s.is_active ? (
          <button
            onClick={() => unsubscribe(s.email)}
            className="p-2 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
            title="Desuscribir"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-[10px] text-gray-400 italic">—</span>
        ),
    },
  ];

  const renderMobileCard = (s: Subscriber) => (
    <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-700 truncate">{s.email}</p>
          {s.name && (
            <p className="text-xs text-gray-500 truncate">{s.name}</p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ${
            s.is_active
              ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
              : "bg-rose-100 text-rose-700 ring-rose-200"
          }`}
        >
          {s.is_active ? "Activo" : "Inactivo"}
        </span>
      </div>
      <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-gray-100">
        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
          {s.source}
        </span>
        <span>{new Date(s.subscribed_at).toLocaleDateString("es-CL")}</span>
        {s.is_active && (
          <button
            onClick={() => unsubscribe(s.email)}
            className="p-1.5 text-rose-700 bg-rose-50 rounded-lg min-h-[32px] min-w-[32px]"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Marketing"
          title="Newsletter"
          subtitle="Lista de suscriptores capturada desde la tienda online"
          icon={<NewspaperIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <button
              onClick={loadSubscribers}
              disabled={loading}
              className="p-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-emerald-100 hover:bg-white/15 transition-colors min-h-[36px]"
              title="Actualizar"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Total"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<NewspaperIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Activos"
          value={stats.active.toLocaleString()}
          tone="emerald"
          icon={<CheckBadgeIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Inactivos"
          value={stats.inactive.toLocaleString()}
          tone="rose"
        />
        <StatsCard
          label="Fuentes únicas"
          value={stats.sources.toLocaleString()}
          tone="indigo"
        />
      </StatsRow>

      {subscribers.length > 0 && (
        <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email, nombre o fuente…"
              className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
        </div>
      ) : (
        <ResponsiveTable<Subscriber>
          columns={columns}
          rows={filtered}
          rowKey={(s) => String(s.id)}
          renderMobileCard={renderMobileCard}
          emptyState={
            <EmptyState
              icon={<EnvelopeIcon className="h-7 w-7" />}
              title={
                subscribers.length === 0
                  ? "Sin suscriptores"
                  : "Sin coincidencias"
              }
              description={
                subscribers.length === 0
                  ? "Los clientes se suscribirán desde el widget del sitio web."
                  : "Probá con otro término."
              }
            />
          }
        />
      )}
    </PageShell>
  );
}
