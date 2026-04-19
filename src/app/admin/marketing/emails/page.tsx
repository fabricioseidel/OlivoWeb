"use client";

import React, { useState, useEffect } from "react";
import {
  EnvelopeIcon,
  PencilSquareIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CodeBracketIcon,
  EyeIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";

type EmailTemplate = {
  slug: string;
  subject: string;
  body_html: string;
  description: string;
  updated_at: string;
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/emails");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedTemplate),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Plantilla actualizada con éxito" });
        fetchTemplates();
      } else {
        throw new Error("Error al guardar");
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error de servidor al guardar cambios" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplate) return;
    if (!confirm(`¿Estás seguro de enviar esta plantilla a TODOS los suscriptores activos?`)) return;

    setIsSending(true);
    setMessage(null);
    try {
       const res = await fetch("/api/admin/email-campaign", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ templateSlug: selectedTemplate.slug }),
       });

       if (res.ok) {
         setMessage({ type: "success", text: "Campaña procesada y enviada a los suscriptores" });
       } else {
         const data = await res.json();
         throw new Error(data.error || "Error al enviar");
       }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const getPlaceholders = (slug: string) => {
    const common = ["customerName", "year"];
    switch (slug) {
      case 'welcome': return [...common, "couponBlock", "pointsBlock"];
      case 'order_confirmation': return [...common, "orderId", "total", "itemCount", "paymentMethod", "itemsTable", "whatsappLink"];
      case 'order_status_update': return [...common, "orderId", "status", "address"];
      default: return common;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Editor de Plantillas</h1>
          <p className="text-gray-500 font-medium">Personaliza la comunicación automática de tu tienda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Template List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
              <h2 className="text-sm font-black uppercase tracking-widest text-emerald-950 flex items-center gap-2">
                <EnvelopeIcon className="h-4 w-4" />
                Plantillas Base
              </h2>
            </div>
            <div className="p-2 space-y-1">
              {templates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => setSelectedTemplate(t)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all group ${
                    selectedTemplate?.slug === t.slug
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "hover:bg-emerald-50 text-gray-600"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-black text-[10px] uppercase tracking-widest opacity-60 mb-1">{t.slug}</span>
                    <span className="font-bold text-sm truncate max-w-[180px]">{t.subject}</span>
                  </div>
                  <ChevronRightIcon className={`h-4 w-4 transition-transform ${selectedTemplate?.slug === t.slug ? "translate-x-1" : "opacity-0"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-emerald-950 rounded-[2rem] p-6 text-white text-xs border border-white/5">
             <p className="font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                <CodeBracketIcon className="h-4 w-4" />
                Placeholders Disponibles
             </p>
             <div className="flex flex-wrap gap-2">
                {selectedTemplate && getPlaceholders(selectedTemplate.slug).map(p => (
                  <code key={p} className="bg-white/10 px-2 py-1 rounded-md text-emerald-300 font-bold border border-white/5">
                    {"{{"}{p}{"}}"}
                  </code>
                ))}
                {!selectedTemplate && <p className="opacity-50">Selecciona una plantilla para ver variables.</p>}
             </div>
             <p className="mt-6 opacity-60 leading-relaxed italic border-t border-white/5 pt-4">
                Usa las llaves dobles para inyectar datos reales del cliente o la orden en el cuerpo del correo.
             </p>
          </div>
        </div>

        {/* Main: Template Editor */}
        <div className="lg:col-span-8">
          {selectedTemplate ? (
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/80 border border-gray-100 flex flex-col min-h-[700px] overflow-hidden">
               <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                       <PencilSquareIcon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-emerald-950">{selectedTemplate.slug.toUpperCase()}</h3>
                      <p className="text-xs text-gray-400 font-bold">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setPreviewMode("edit")}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewMode === "edit" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"}`}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => setPreviewMode("preview")}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewMode === "preview" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"}`}
                    >
                      Previsualizar
                    </button>
                  </div>
               </div>

               <div className="flex-1 p-8 flex flex-col gap-6">
                  {message && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 overflow-hidden ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                       {message.type === "success" ? <CheckCircleIcon className="h-5 w-5" /> : <ExclamationCircleIcon className="h-5 w-5" />}
                       <span className="text-sm font-bold">{message.text}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Asunto del Correo</label>
                    <input 
                      className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500/50 focus:bg-white transition-all outline-none font-bold text-gray-900"
                      value={selectedTemplate.subject}
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}
                    />
                  </div>

                  <div className="flex-1 flex flex-col space-y-2 min-h-[400px]">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cuerpo HTML</label>
                      <span className="text-[9px] text-gray-400 font-bold italic">Soporta HTML/CSS en línea</span>
                    </div>
                    
                    {previewMode === "edit" ? (
                      <textarea 
                        className="flex-1 w-full p-6 rounded-[2rem] bg-gray-950 text-emerald-400 font-mono text-xs border border-gray-800 outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none overflow-y-auto"
                        value={selectedTemplate.body_html}
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, body_html: e.target.value})}
                      />
                    ) : (
                      <div className="flex-1 w-full rounded-[2rem] border-4 border-gray-100 overflow-hidden bg-white shadow-inner">
                         <iframe 
                            srcDoc={selectedTemplate.body_html}
                            className="w-full h-full border-0"
                            title="Preview Content"
                         />
                      </div>
                    )}
                  </div>
               </div>

               <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline"
                      className="h-14 px-6 rounded-2xl border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all font-bold"
                      onClick={handleSendCampaign}
                      disabled={isSending || isSaving}
                    >
                      <MegaphoneIcon className="h-5 w-5 mr-2" />
                      {isSending ? "Enviando..." : "Enviar Campaña"}
                    </Button>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                       Última actualización: {new Date(selectedTemplate.updated_at).toLocaleString('es-CL')}
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    className="h-14 px-10 rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-white bg-emerald-600"
                    onClick={handleSave}
                    disabled={isSaving || isSending}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Guardando...
                      </span>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>
               </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-20 text-center h-full">
               <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                  <EnvelopeIcon className="h-10 w-10 text-gray-200" />
               </div>
               <h3 className="text-xl font-black text-gray-900 mb-2">Selecciona una plantilla</h3>
               <p className="text-gray-500 font-medium max-w-xs leading-relaxed">Haz clic en una de las plantillas de la izquierda para comenzar a editar su contenido automático.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
