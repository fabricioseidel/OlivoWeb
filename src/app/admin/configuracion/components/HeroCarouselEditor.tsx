"use client";

import { useState } from "react";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import { uploadImageServerAction } from "@/actions/upload";
import { InputField, TextAreaField, CheckBoxField } from "./fields";
import { TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export default function HeroCarouselEditor({
  blocks,
  onChange,
  saveSettings
}: {
  blocks: any[];
  onChange: (blocks: any[]) => void;
  saveSettings: () => Promise<void>;
}) {
  const slides = blocks || [];

  const addSlide = () => {
    const newSlide = {
      id: crypto.randomUUID(),
      type: "carousel_slide",
      title: "",
      description: "",
      imageUrl: "",
      linkText: "Ver m\u00E1s",
      linkUrl: "/",
      active: true,
      order: slides.length
    };
    onChange([...slides, newSlide]);
  };

  const updateSlide = (id: string, field: string, value: any) => {
    onChange(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSlide = (id: string) => {
    onChange(slides.filter(s => s.id !== id));
  };

  const moveSlide = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const newSlides = [...slides];
      [newSlides[index - 1], newSlides[index]] = [newSlides[index], newSlides[index - 1]];
      onChange(newSlides);
    } else if (direction === "down" && index < slides.length - 1) {
      const newSlides = [...slides];
      [newSlides[index + 1], newSlides[index]] = [newSlides[index], newSlides[index + 1]];
      onChange(newSlides);
    }
  };

  return (
    <div className="space-y-4">
      {slides.map((slide, idx) => (
        <div key={slide.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-slate-800">Slide {idx + 1}</h4>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => moveSlide(idx, "up")} disabled={idx === 0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-50">
                <ChevronUpIcon className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => moveSlide(idx, "down")} disabled={idx === slides.length - 1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-50">
                <ChevronDownIcon className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => removeSlide(slide.id)} className="p-1 hover:bg-red-50 text-red-500 rounded">
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InputField
                label="T\u00EDtulo"
                value={slide.title || ""}
                onChange={(val) => updateSlide(slide.id, "title", val)}
                placeholder="Ej: Ofertas del Mes"
              />
              <TextAreaField
                label="Descripci\u00F3n"
                value={slide.description || ""}
                onChange={(val) => updateSlide(slide.id, "description", val)}
                rows={2}
                placeholder="Ingresa un texto descriptivo..."
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Texto del Bot\u00F3n"
                  value={slide.linkText || ""}
                  onChange={(val) => updateSlide(slide.id, "linkText", val)}
                  placeholder="Ver ofertas"
                />
                <InputField
                  label="URL del Enlace"
                  value={slide.linkUrl || ""}
                  onChange={(val) => updateSlide(slide.id, "linkUrl", val)}
                  placeholder="/ofertas"
                />
              </div>
              <CheckBoxField
                label="Slide Activo"
                checked={slide.active !== false}
                onChange={(val) => updateSlide(slide.id, "active", val)}
              />
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-900">Imagen de Fondo (opcional)</label>
              {slide.imageUrl && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide.imageUrl})` }} />
                </div>
              )}
              <SingleImageUpload
                label={slide.imageUrl ? "Cambiar imagen" : "Subir imagen"}
                value={slide.imageUrl || ""}
                onChange={async (dataUrl) => {
                  try {
                    if (dataUrl.startsWith("data:image")) {
                      const resp = await uploadImageServerAction(dataUrl, slide.imageUrl || undefined);
                      if (resp.ok && resp.url) {
                        updateSlide(slide.id, "imageUrl", resp.url);
                        await saveSettings();
                      }
                    } else {
                      updateSlide(slide.id, "imageUrl", dataUrl);
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addSlide}
        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
        Agregar Nuevo Slide
      </button>
    </div>
  );
}
