"use client";

/**
 * Editor del carrusel de la portada.
 *
 * Edita sólo las diapositivas del bloque "hero" (`config.slides`) y devuelve
 * la lista completa de bloques con el resto de las secciones intactas. Antes
 * trabajaba sobre `appearance.blocks` completo: mostraba "Ofertas" o
 * "Categorías" como diapositivas y borrar una quitaba esa sección de la
 * portada.
 *
 * Los cambios quedan en el formulario y se guardan con el botón "Guardar" de
 * Configuración, igual que el resto de la apariencia. Una imagen recién subida
 * también: guardarla automáticamente desde aquí mandaba el estado ANTERIOR
 * (la función de guardar se crea antes de que el cambio llegue al estado).
 */

import SingleImageUpload from "@/components/ui/SingleImageUpload";
import { uploadImageServerAction } from "@/actions/upload";
import type { PageBlock } from "@/lib/page-blocks";
import {
  bloqueHero,
  conSlides,
  enlaceValido,
  moverSlide,
  nuevaSlide,
  slidesDelHero,
  type HeroSlide,
} from "@/lib/hero-slides";
import { InputField, TextAreaField, CheckBoxField } from "./fields";
import { TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export default function HeroCarouselEditor({
  blocks,
  onChange,
}: {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
}) {
  const slides = slidesDelHero(bloqueHero(blocks));
  const guardar = (nuevas: HeroSlide[]) => onChange(conSlides(blocks, nuevas));

  const actualizar = (id: string, campo: keyof HeroSlide, valor: unknown) =>
    guardar(slides.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));

  const quitar = (s: HeroSlide, i: number) => {
    if (!window.confirm(`¿Quitar la diapositiva ${i + 1}${s.title ? ` («${s.title}»)` : ""}?`)) return;
    guardar(slides.filter((x) => x.id !== s.id));
  };

  return (
    <div className="space-y-4">
      {slides.length === 0 && (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Sin diapositivas, la portada muestra el encabezado clásico. Agrega una para convertirlo en carrusel.
        </p>
      )}

      {slides.map((slide, idx) => {
        const enlaceMalo = Boolean(slide.linkUrl) && !enlaceValido(slide.linkUrl);
        return (
          <div key={slide.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-slate-800">
                Diapositiva {idx + 1}
                {slide.active === false && <span className="ml-2 text-xs font-semibold text-slate-500">(oculta)</span>}
              </h4>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => guardar(moverSlide(slides, idx, -1))} disabled={idx === 0} aria-label="Subir" className="p-2 hover:bg-slate-100 rounded disabled:opacity-40">
                  <ChevronUpIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => guardar(moverSlide(slides, idx, 1))} disabled={idx === slides.length - 1} aria-label="Bajar" className="p-2 hover:bg-slate-100 rounded disabled:opacity-40">
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => quitar(slide, idx)} aria-label="Quitar diapositiva" className="p-2 hover:bg-red-50 text-red-600 rounded">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InputField
                  label="Título"
                  value={slide.title || ""}
                  onChange={(val) => actualizar(slide.id, "title", val)}
                  placeholder="Ej: Ofertas de la semana"
                />
                <TextAreaField
                  label="Descripción"
                  value={slide.description || ""}
                  onChange={(val) => actualizar(slide.id, "description", val)}
                  rows={2}
                  placeholder="Una o dos líneas"
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Texto del botón"
                    value={slide.linkText || ""}
                    onChange={(val) => actualizar(slide.id, "linkText", val)}
                    placeholder="Ver ofertas"
                  />
                  <InputField
                    label="Enlace del botón"
                    value={slide.linkUrl || ""}
                    onChange={(val) => actualizar(slide.id, "linkUrl", val)}
                    placeholder="/ofertas"
                  />
                </div>
                {enlaceMalo && (
                  <p className="text-xs font-semibold text-red-600">
                    El enlace debe empezar con «/» (una página de la tienda, ej. /ofertas) o con https://. Así el botón no se muestra.
                  </p>
                )}
                <CheckBoxField
                  label="Mostrar en la portada"
                  checked={slide.active !== false}
                  onChange={(val) => actualizar(slide.id, "active", val)}
                />
              </div>

              <div className="space-y-3">
                <span className="block text-sm font-medium text-slate-900">Imagen de fondo (opcional)</span>
                <p className="text-xs text-slate-500">Horizontal, de al menos 1600 × 600 px. El texto va a la izquierda: deja ese lado despejado.</p>
                {slide.imageUrl && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200">
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide.imageUrl})` }} />
                  </div>
                )}
                <SingleImageUpload
                  label={slide.imageUrl ? "Cambiar imagen" : "Subir imagen"}
                  value={slide.imageUrl || ""}
                  onChange={async (dataUrl) => {
                    if (!dataUrl) return actualizar(slide.id, "imageUrl", "");
                    if (!dataUrl.startsWith("data:image")) return actualizar(slide.id, "imageUrl", dataUrl);
                    try {
                      const resp = await uploadImageServerAction(dataUrl, slide.imageUrl || undefined);
                      if (resp.ok && resp.url) actualizar(slide.id, "imageUrl", resp.url);
                      else window.alert("No se pudo subir la imagen. Intenta de nuevo.");
                    } catch {
                      window.alert("No se pudo subir la imagen. Intenta de nuevo.");
                    }
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => guardar([...slides, nuevaSlide(crypto.randomUUID())])}
        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-bold hover:border-emerald-600 hover:text-emerald-700 transition-colors flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
        Agregar diapositiva
      </button>
      <p className="text-xs text-slate-500">Los cambios se aplican al pulsar «Guardar» en esta página.</p>
    </div>
  );
}
