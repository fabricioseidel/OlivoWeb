"use client";

import { ShareIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { InputField } from "./fields";
import AvisoConcursoInstagram from "@/components/AvisoConcursoInstagram";
import { DEFAULT_INSTAGRAM_CONTEST } from "@/lib/settings-shared";

interface SocialSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

export default function SocialSection({ settings, handleChange }: SocialSectionProps) {
  const contest = settings.socialMedia?.contest || settings.instagramContest || DEFAULT_INSTAGRAM_CONTEST;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ShareIcon className="h-5 w-5 text-pink-500" />
            Redes Sociales
          </h2>
          <p className="text-sm text-slate-500 mt-1">Enlaces a tus perfiles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Facebook"
            value={settings.socialMedia?.facebook || ""}
            onChange={(val) => handleChange(["socialMedia", "facebook"], val)}
            placeholder="https://facebook.com/..."
          />
          <InputField
            label="Instagram"
            value={settings.socialMedia?.instagram || ""}
            onChange={(val) => handleChange(["socialMedia", "instagram"], val)}
            placeholder="https://instagram.com/..."
          />
          <InputField
            label="Twitter / X"
            value={settings.socialMedia?.twitter || ""}
            onChange={(val) => handleChange(["socialMedia", "twitter"], val)}
            placeholder="https://twitter.com/..."
          />
          <InputField
            label="TikTok"
            value={settings.socialMedia?.tiktok || ""}
            onChange={(val) => handleChange(["socialMedia", "tiktok"], val)}
            placeholder="https://tiktok.com/@..."
          />
          <InputField
            label="YouTube"
            value={settings.socialMedia?.youtube || ""}
            onChange={(val) => handleChange(["socialMedia", "youtube"], val)}
            placeholder="https://youtube.com/..."
          />
          <InputField
            label="LinkedIn"
            value={settings.socialMedia?.linkedin || ""}
            onChange={(val) => handleChange(["socialMedia", "linkedin"], val)}
            placeholder="https://linkedin.com/..."
          />
          <InputField
            label="WhatsApp"
            value={settings.socialMedia?.whatsapp || ""}
            onChange={(val) => handleChange(["socialMedia", "whatsapp"], val)}
            placeholder="+56912345678"
          />
        </div>
      </div>

      {/* Tarjeta Concurso / Sorteo en Instagram */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-fuchsia-600 text-white shadow-sm">
              <SparklesIcon className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Aviso de Concurso / Sorteo en Instagram
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Muestra una tarjeta destacada con enlace directo al Reel de Instagram en la portada
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={contest.enabled !== false}
              onChange={(e) => handleChange(["socialMedia", "contest", "enabled"], e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
            <span className="ml-3 text-sm font-semibold text-slate-700">
              {contest.enabled !== false ? "Visible en portada" : "Oculto"}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <InputField
            label="Título del aviso"
            value={contest.title ?? DEFAULT_INSTAGRAM_CONTEST.title}
            onChange={(val) => handleChange(["socialMedia", "contest", "title"], val)}
            placeholder="¡Estamos de concurso en Instagram!"
          />
          <InputField
            label="Texto del botón"
            value={contest.buttonText ?? DEFAULT_INSTAGRAM_CONTEST.buttonText}
            onChange={(val) => handleChange(["socialMedia", "contest", "buttonText"], val)}
            placeholder="Participar ahora"
          />
          <div className="md:col-span-2">
            <InputField
              label="Instrucciones / Descripción"
              value={contest.description ?? DEFAULT_INSTAGRAM_CONTEST.description}
              onChange={(val) => handleChange(["socialMedia", "contest", "description"], val)}
              placeholder="Participa por tu premio: dale like, sigue @olivomarkett y comenta el reel."
            />
          </div>
          <InputField
            label="Enlace al Reel o publicación (Instagram)"
            value={contest.reelUrl ?? DEFAULT_INSTAGRAM_CONTEST.reelUrl}
            onChange={(val) => handleChange(["socialMedia", "contest", "reelUrl"], val)}
            placeholder="https://www.instagram.com/reel/..."
          />
          <InputField
            label="Fecha límite de vigencia"
            type="date"
            value={contest.endDate ?? DEFAULT_INSTAGRAM_CONTEST.endDate}
            onChange={(val) => handleChange(["socialMedia", "contest", "endDate"], val)}
            hint="Pasada esta fecha, el aviso se oculta solo automáticamente sin tocar código"
          />
        </div>

        {/* Vista previa en vivo */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Vista previa del aviso en la portada
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 overflow-hidden">
            <AvisoConcursoInstagram
              customConfig={{
                enabled: contest.enabled !== false,
                title: contest.title ?? DEFAULT_INSTAGRAM_CONTEST.title,
                description: contest.description ?? DEFAULT_INSTAGRAM_CONTEST.description,
                buttonText: contest.buttonText ?? DEFAULT_INSTAGRAM_CONTEST.buttonText,
                reelUrl: contest.reelUrl ?? DEFAULT_INSTAGRAM_CONTEST.reelUrl,
                endDate: contest.endDate ?? DEFAULT_INSTAGRAM_CONTEST.endDate,
              }}
              previewMode={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
