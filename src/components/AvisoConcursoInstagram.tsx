"use client";

import { useEffect, useState } from "react";
import { Instagram, X, ChevronRight } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import {
  DEFAULT_INSTAGRAM_CONTEST,
  type InstagramContestSettings,
} from "@/lib/settings-shared";

interface AvisoConcursoInstagramProps {
  customConfig?: InstagramContestSettings;
  /** Si es true, ignora el localStorage y fuerza mostrarse (útil para el admin) */
  previewMode?: boolean;
}

export default function AvisoConcursoInstagram({
  customConfig,
  previewMode = false,
}: AvisoConcursoInstagramProps) {
  const { settings } = useStoreSettings();

  const config =
    customConfig ||
    settings?.instagramContest ||
    settings?.socialMedia?.contest ||
    DEFAULT_INSTAGRAM_CONTEST;

  const isEnabled = config?.enabled !== false;
  const titulo = config?.title || DEFAULT_INSTAGRAM_CONTEST.title;
  const descripcion = config?.description || DEFAULT_INSTAGRAM_CONTEST.description;
  const buttonText = config?.buttonText || DEFAULT_INSTAGRAM_CONTEST.buttonText;
  const reelUrl = config?.reelUrl || DEFAULT_INSTAGRAM_CONTEST.reelUrl;
  const endDate = config?.endDate || DEFAULT_INSTAGRAM_CONTEST.endDate;

  const claveCierre = `olivo:aviso-concurso-ig:${endDate || "v1"}`;

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (previewMode) {
      setVisible(true);
      return;
    }

    if (!isEnabled) {
      setVisible(false);
      return;
    }

    // Verificar si está vigente según la fecha de término en horario de Santiago
    if (endDate) {
      try {
        const hoy = new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Santiago",
        });
        if (hoy > endDate) {
          setVisible(false);
          return;
        }
      } catch {
        // En caso de entorno sin soporte de timeZone, continuar
      }
    }

    // Comprobar si el usuario ya lo cerró
    try {
      if (typeof window !== "undefined" && localStorage.getItem(claveCierre) === "1") {
        setVisible(false);
        return;
      }
    } catch {
      // Si el navegador bloquea localStorage, se muestra igual
    }

    setVisible(true);
  }, [isEnabled, endDate, claveCierre, previewMode]);

  const cerrar = () => {
    setVisible(false);
    if (!previewMode) {
      try {
        localStorage.setItem(claveCierre, "1");
      } catch {
        // ignore
      }
    }
  };

  if (!visible && !previewMode) return null;
  if (!isEnabled && !previewMode) return null;

  return (
    <section className="px-4 pt-4">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 p-4 shadow-md sm:p-5">
        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3 sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
              <Instagram className="h-6 w-6 text-white" />
            </span>
            <div>
              <p className="text-base font-bold leading-snug text-white sm:text-lg">
                {titulo}
              </p>
              {descripcion && (
                <p className="mt-0.5 text-sm text-white/90">{descripcion}</p>
              )}
            </div>
          </div>
          {reelUrl && (
            <a
              href={reelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="o-focus inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-5 text-sm font-bold text-pink-700 transition-colors hover:bg-pink-50 shadow-sm"
            >
              {buttonText || "Participar ahora"} <ChevronRight className="h-4 w-4" />
            </a>
          )}
        </div>
        {!previewMode && (
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar aviso del concurso"
            className="o-focus absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
