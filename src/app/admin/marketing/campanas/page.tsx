"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  PaperAirplaneIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  EnvelopeOpenIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import OlivoButton from "@/components/OlivoButton";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  EmptyState,
} from "@/components/admin/shell";

type Campaign = {
  id: number;
  name: string;
  subject: string;
  status: string;
  audience: string;
  stats: { total: number; sent: number; opened: number; failed: number };
  created_at: string;
  sent_at?: string;
};

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  draft: { label: "Borrador", classes: "bg-gray-100 text-gray-600 ring-gray-200" },
  scheduled: { label: "Programada", classes: "bg-sky-100 text-sky-700 ring-sky-200" },
  sending: { label: "Enviando", classes: "bg-amber-100 text-amber-700 ring-amber-200" },
  sent: { label: "Enviada", classes: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  cancelled: { label: "Cancelada", classes: "bg-rose-100 text-rose-700 ring-rose-200" },
};

export default function CampanasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    audience: "all",
  });

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) setCampaigns(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const createCampaign = async () => {
    if (!form.name || !form.subject) {
      showToast("Nombre y asunto son obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          html_content: form.htmlContent || null,
          audience: form.audience,
        }),
      });
      if (res.ok) {
        showToast("Campaña creada", "success");
        setShowForm(false);
        setForm({ name: "", subject: "", htmlContent: "", audience: "all" });
        loadCampaigns();
      } else {
        const data = await res.json();
        showToast(data.error || "Error", "error");
      }
    } catch {
      showToast("Error de red", "error");
    } finally {
      setSaving(false);
    }
  };

  const sendCampaign = async (id: number) => {
    if (
      !confirm(
        "¿Enviar esta campaña ahora? Se enviará a todos los suscriptores activos."
      )
    )
      return;
    try {
      const res = await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "send" }),
      });
      if (res.ok) {
        showToast("Campaña enviándose...", "success");
        loadCampaigns();
      }
    } catch {
      showToast("Error al enviar", "error");
    }
  };

  const stats = useMemo(() => {
    const total = campaigns.length;
    const drafts = campaigns.filter((c) => c.status === "draft").length;
    const sent = campaigns.filter((c) => c.status === "sent").length;
    const totalOpened = campaigns.reduce(
      (sum, c) => sum + (c.stats?.opened || 0),
      0
    );
    return { total, drafts, sent, totalOpened };
  }, [campaigns]);

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Marketing"
          title="Campañas de Email"
          subtitle="Creá y enviá emails masivos a tus suscriptores"
          icon={<PaperAirplaneIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-xl text-emerald-950 text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 min-h-[36px]"
            >
              <PlusIcon className="h-4 w-4" />
              Nueva campaña
            </button>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Total campañas"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<PaperAirplaneIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Borradores"
          value={stats.drafts.toLocaleString()}
          tone="amber"
        />
        <StatsCard
          label="Enviadas"
          value={stats.sent.toLocaleString()}
          tone="emerald"
        />
        <StatsCard
          label="Aperturas totales"
          value={stats.totalOpened.toLocaleString()}
          tone="sky"
          icon={<EnvelopeOpenIcon className="w-4 h-4" />}
        />
      </StatsRow>

      {/* Modal de creación */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Nueva campaña</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Cerrar"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="Promo Marzo 2026"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Asunto del email
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="🎉 ¡Ofertas increíbles solo para ti!"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Audiencia
                </label>
                <select
                  value={form.audience}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, audience: e.target.value }))
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Todos los suscriptores</option>
                  <option value="customers">Solo clientes existentes</option>
                  <option value="newsletter">Solo suscriptores newsletter</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                  Contenido HTML (opcional)
                </label>
                <textarea
                  value={form.htmlContent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, htmlContent: e.target.value }))
                  }
                  className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-mono h-32 focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="<h1>¡Hola {{customerName}}!</h1><p>...</p>"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl min-h-[44px]"
              >
                Cancelar
              </button>
              <OlivoButton onClick={createCampaign} disabled={saving}>
                {saving ? "Creando..." : "Crear campaña"}
              </OlivoButton>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-200">
          <EmptyState
            icon={<PaperAirplaneIcon className="h-7 w-7" />}
            title="Sin campañas"
            description="Creá tu primera campaña de email marketing."
            cta={
              <OlivoButton onClick={() => setShowForm(true)}>
                <PlusIcon className="h-4 w-4 mr-1" /> Nueva campaña
              </OlivoButton>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const statusInfo =
              STATUS_LABELS[c.status] || STATUS_LABELS.draft;
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl ring-1 ring-gray-200 p-4 sm:p-5 hover:ring-emerald-300 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                        {c.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ${statusInfo.classes}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      Asunto: {c.subject}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Creada:{" "}
                      {new Date(c.created_at).toLocaleDateString("es-CL")}
                      {c.sent_at &&
                        ` · Enviada: ${new Date(c.sent_at).toLocaleDateString(
                          "es-CL"
                        )}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {c.status === "sent" && c.stats && (
                      <div className="flex gap-3 text-center">
                        <Stat label="Enviados" value={c.stats.sent} tone="" />
                        <Stat
                          label="Abiertos"
                          value={c.stats.opened}
                          tone="text-sky-700"
                          icon={<EyeIcon className="w-3 h-3" />}
                        />
                        <Stat
                          label="Fallidos"
                          value={c.stats.failed}
                          tone="text-rose-700"
                          icon={<ExclamationCircleIcon className="w-3 h-3" />}
                        />
                      </div>
                    )}
                    {c.status === "draft" && (
                      <OlivoButton size="sm" onClick={() => sendCampaign(c.id)}>
                        <PaperAirplaneIcon className="h-4 w-4 mr-1" /> Enviar
                      </OlivoButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-center">
        {icon}
        {label}
      </p>
      <p className={`text-sm font-black ${tone || "text-gray-700"}`}>{value}</p>
    </div>
  );
}
