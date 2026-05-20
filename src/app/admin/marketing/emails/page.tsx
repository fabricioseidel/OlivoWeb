"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  EnvelopeIcon,
  PencilSquareIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  CodeBracketIcon,
  EyeIcon,
  MegaphoneIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  EmptyState,
} from "@/components/admin/shell";

type EmailTemplate = {
  slug: string;
  subject: string;
  body_html: string;
  description: string;
  updated_at: string;
};

const PLACEHOLDERS_BY_SLUG: Record<string, string[]> = {
  welcome: ["customerName", "year", "couponBlock", "pointsBlock"],
  order_confirmation: [
    "customerName",
    "year",
    "orderId",
    "total",
    "itemCount",
    "paymentMethod",
    "itemsTable",
    "whatsappLink",
  ],
  order_status_update: [
    "customerName",
    "year",
    "orderId",
    "status",
    "address",
  ],
};

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: "Bienvenida",
  order_confirmation: "Confirmación de pedido",
  order_status_update: "Actualización de estado",
  pos_receipt: "Boleta POS",
  points_earned: "Puntos ganados",
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [originalSnapshot, setOriginalSnapshot] =
    useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");
  const { showToast } = useToast();

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/emails");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data[0]);
          setOriginalSnapshot(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTemplate = (t: EmailTemplate) => {
    if (
      isDirty &&
      !confirm("Tenés cambios sin guardar. ¿Descartar y cambiar de plantilla?")
    ) {
      return;
    }
    setSelectedTemplate(t);
    setOriginalSnapshot(t);
    setPreviewMode("edit");
  };

  const isDirty = useMemo(() => {
    if (!selectedTemplate || !originalSnapshot) return false;
    return (
      selectedTemplate.subject !== originalSnapshot.subject ||
      selectedTemplate.body_html !== originalSnapshot.body_html
    );
  }, [selectedTemplate, originalSnapshot]);

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedTemplate),
      });
      if (res.ok) {
        showToast("Plantilla actualizada con éxito", "success");
        await fetchTemplates();
        setOriginalSnapshot(selectedTemplate);
      } else {
        throw new Error("Error al guardar");
      }
    } catch (err) {
      showToast("Error de servidor al guardar cambios", "error");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplate) return;
    const friendly =
      TEMPLATE_LABELS[selectedTemplate.slug] || selectedTemplate.slug;
    if (
      !confirm(
        `¿Enviar la plantilla "${friendly}" a TODOS los suscriptores activos?\n\nEsta acción no se puede deshacer.`
      )
    )
      return;
    if (isDirty) {
      showToast("Guardá los cambios antes de enviar", "warning");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/admin/email-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: selectedTemplate.slug }),
      });
      if (res.ok) {
        showToast("Campaña enviándose…", "success");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Error al enviar");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const discardChanges = () => {
    if (originalSnapshot) setSelectedTemplate(originalSnapshot);
    setPreviewMode("edit");
  };

  const copyPlaceholder = (placeholder: string) => {
    const text = `{{${placeholder}}}`;
    navigator.clipboard.writeText(text);
    showToast(`${text} copiado`, "success");
  };

  const placeholders = useMemo(() => {
    if (!selectedTemplate) return ["customerName", "year"];
    return (
      PLACEHOLDERS_BY_SLUG[selectedTemplate.slug] || ["customerName", "year"]
    );
  }, [selectedTemplate]);

  const stats = useMemo(() => {
    const total = templates.length;
    const recentlyUpdated = templates.filter((t) => {
      const updated = new Date(t.updated_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return updated > sevenDaysAgo;
    }).length;
    return { total, recentlyUpdated };
  }, [templates]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Marketing"
          title="Plantillas de email"
          subtitle="Editá los emails transaccionales y campañas automatizadas de la tienda"
          icon={<EnvelopeIcon className="w-6 h-6 text-emerald-300" />}
          right={
            isDirty && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 ring-1 ring-amber-200 text-amber-900 text-xs font-bold uppercase tracking-widest">
                <ExclamationCircleIcon className="h-4 w-4" />
                Cambios sin guardar
              </span>
            )
          }
        />
      }
    >
      <StatsRow cols={2}>
        <StatsCard
          label="Plantillas totales"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<EnvelopeIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Editadas (7d)"
          value={stats.recentlyUpdated.toLocaleString()}
          tone="emerald"
          icon={<PencilSquareIcon className="w-4 h-4" />}
        />
      </StatsRow>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Sidebar: lista + placeholders */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/40">
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-900 flex items-center gap-2">
                <EnvelopeIcon className="h-4 w-4" />
                Plantillas base
              </h2>
            </div>
            <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
              {templates.map((t) => {
                const active = selectedTemplate?.slug === t.slug;
                return (
                  <button
                    key={t.slug}
                    onClick={() => selectTemplate(t)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all min-h-[64px] ${
                      active
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "hover:bg-emerald-50 text-gray-700"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`font-black text-[10px] uppercase tracking-widest mb-0.5 ${
                          active ? "text-emerald-100" : "text-gray-400"
                        }`}
                      >
                        {TEMPLATE_LABELS[t.slug] || t.slug}
                      </span>
                      <span className="font-bold text-sm truncate">
                        {t.subject}
                      </span>
                    </div>
                    <ChevronRightIcon
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        active
                          ? "translate-x-0.5 opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Placeholders */}
          <div className="bg-emerald-950 rounded-2xl p-5 text-white ring-1 ring-white/5">
            <p className="font-black uppercase tracking-widest text-emerald-300 text-xs mb-3 flex items-center gap-2">
              <CodeBracketIcon className="h-4 w-4" />
              Placeholders disponibles
            </p>
            {selectedTemplate ? (
              <div className="flex flex-wrap gap-1.5">
                {placeholders.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => copyPlaceholder(p)}
                    className="group inline-flex items-center gap-1 bg-white/10 px-2 py-1 rounded-md text-emerald-300 font-bold border border-white/5 hover:bg-white/15 text-xs"
                    title="Click para copiar"
                  >
                    <span>{`{{${p}}}`}</span>
                    <ClipboardDocumentIcon className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-emerald-100/50 text-xs italic">
                Seleccioná una plantilla.
              </p>
            )}
            <p className="mt-4 text-emerald-100/40 leading-relaxed text-xs italic border-t border-white/5 pt-3">
              Click para copiar. Pegá la variable en el cuerpo HTML para inyectar
              datos reales del cliente o la orden.
            </p>
          </div>
        </div>

        {/* Main: Editor */}
        <div className="lg:col-span-8">
          {selectedTemplate ? (
            <div className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm flex flex-col min-h-[600px] overflow-hidden">
              <div className="px-5 sm:px-7 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/40 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <PencilSquareIcon className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 truncate">
                      {TEMPLATE_LABELS[selectedTemplate.slug] ||
                        selectedTemplate.slug}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium truncate">
                      {selectedTemplate.description}
                    </p>
                  </div>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewMode("edit")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all min-h-[36px] ${
                      previewMode === "edit"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => setPreviewMode("preview")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all min-h-[36px] ${
                      previewMode === "preview"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    Vista previa
                  </button>
                </div>
              </div>

              <div className="flex-1 p-5 sm:p-7 flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Asunto del correo
                  </label>
                  <input
                    className="w-full h-12 px-4 rounded-xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none font-bold text-gray-900 text-sm"
                    value={selectedTemplate.subject}
                    onChange={(e) =>
                      setSelectedTemplate({
                        ...selectedTemplate,
                        subject: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex-1 flex flex-col space-y-1.5 min-h-[300px]">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Cuerpo HTML
                    </label>
                    <span className="text-[10px] text-gray-400 italic">
                      Soporta HTML/CSS en línea
                    </span>
                  </div>

                  {previewMode === "edit" ? (
                    <textarea
                      className="flex-1 w-full p-4 rounded-2xl bg-gray-950 text-emerald-300 font-mono text-xs ring-1 ring-gray-800 outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none overflow-y-auto"
                      value={selectedTemplate.body_html}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          body_html: e.target.value,
                        })
                      }
                      spellCheck={false}
                    />
                  ) : (
                    <div className="flex-1 w-full rounded-2xl ring-2 ring-gray-100 overflow-hidden bg-white shadow-inner min-h-[300px]">
                      <iframe
                        srcDoc={selectedTemplate.body_html}
                        className="w-full h-full border-0"
                        title="Preview"
                        sandbox=""
                      />
                    </div>
                  )}
                </div>
              </div>

              <div
                className="px-5 sm:px-7 py-4 bg-gray-50/40 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap"
                style={{
                  paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
                }}
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Button
                    variant="outline"
                    onClick={handleSendCampaign}
                    disabled={isSending || isSaving || isDirty}
                    className="!px-4 !py-2.5 !rounded-xl !border-2 !border-emerald-200 !text-emerald-700 hover:!bg-emerald-50 !font-bold !text-sm min-h-[44px]"
                  >
                    <MegaphoneIcon className="h-4 w-4 mr-1.5" />
                    {isSending ? "Enviando…" : "Enviar campaña"}
                  </Button>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">
                    Última edición:{" "}
                    {new Date(selectedTemplate.updated_at).toLocaleString(
                      "es-CL"
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <button
                      type="button"
                      onClick={discardChanges}
                      className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl min-h-[44px]"
                    >
                      Descartar
                    </button>
                  )}
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving || isSending || !isDirty}
                    className="!px-5 !py-2.5 !rounded-xl !shadow-lg !shadow-emerald-600/20 min-h-[44px]"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Guardando…
                      </span>
                    ) : (
                      "Guardar cambios"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl ring-1 ring-dashed ring-gray-300">
              <EmptyState
                icon={<EnvelopeIcon className="h-7 w-7" />}
                title="Seleccioná una plantilla"
                description="Elegí una de la lista para empezar a editarla."
              />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
