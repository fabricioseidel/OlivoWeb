"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PaperAirplaneIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import OlivoButton from "@/components/OlivoButton";
import { useToast } from "@/contexts/ToastContext";

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-slate-100 text-slate-600" },
  scheduled: { label: "Programada", color: "bg-blue-100 text-blue-700" },
  sending: { label: "Enviando", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Enviada", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
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
    if (!confirm("¿Enviar esta campaña ahora? Se enviará a todos los suscriptores activos.")) return;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <PaperAirplaneIcon className="h-7 w-7 text-blue-600" />
            Campañas de Email
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Crea y envía campañas masivas a tus suscriptores
          </p>
        </div>
        <OlivoButton onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-1" /> Nueva Campaña
        </OlivoButton>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200 flex justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nueva Campaña</h2>
              <button onClick={() => setShowForm(false)}>
                <XMarkIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm(f => ({...f, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Promo Marzo 2026" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Asunto del email</label>
                <input type="text" value={form.subject}
                  onChange={(e) => setForm(f => ({...f, subject: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="🎉 ¡Ofertas increíbles solo para ti!" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Audiencia</label>
                <select value={form.audience}
                  onChange={(e) => setForm(f => ({...f, audience: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="all">Todos los suscriptores</option>
                  <option value="customers">Solo clientes existentes</option>
                  <option value="newsletter">Solo suscriptores newsletter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Contenido HTML (opcional)</label>
                <textarea value={form.htmlContent}
                  onChange={(e) => setForm(f => ({...f, htmlContent: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 h-32 font-mono"
                  placeholder="<h1>¡Hola {{customerName}}!</h1><p>...</p>" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-slate-600">Cancelar</button>
              <OlivoButton onClick={createCampaign} disabled={saving}>
                {saving ? "Creando..." : "Crear Campaña"}
              </OlivoButton>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <PaperAirplaneIcon className="h-16 w-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-400">Sin campañas</h3>
          <p className="text-sm text-slate-400 mt-1">Crea tu primera campaña de email marketing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const statusInfo = STATUS_LABELS[c.status] || STATUS_LABELS.draft;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">Asunto: {c.subject}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Creada: {new Date(c.created_at).toLocaleDateString("es-CL")}
                      {c.sent_at && ` · Enviada: ${new Date(c.sent_at).toLocaleDateString("es-CL")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === "sent" && c.stats && (
                      <div className="flex gap-3 text-center mr-4">
                        <div>
                          <p className="text-xs text-slate-400 font-bold">Enviados</p>
                          <p className="text-sm font-black text-slate-700">{c.stats.sent}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold">Abiertos</p>
                          <p className="text-sm font-black text-blue-600">{c.stats.opened}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold">Fallidos</p>
                          <p className="text-sm font-black text-red-500">{c.stats.failed}</p>
                        </div>
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
    </div>
  );
}
