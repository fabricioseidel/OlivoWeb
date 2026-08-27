"use client";

import { useState, useEffect } from "react";
import {
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import { uploadImageServerAction } from "@/actions/upload";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_DESCRIPTIONS,
  type PageBlock,
  type PageBlockType,
} from "@/lib/page-blocks";

const ALL_BLOCK_TYPES = Object.keys(BLOCK_TYPE_LABELS) as PageBlockType[];

type EditableField =
  | 'subtitle'
  | 'title'
  | 'description'
  | 'buttonText'
  | 'buttonLink'
  | 'itemsToShow';

// Campos editables según el tipo de bloque.
// `subtitle` existía en PageBlock y la portada lo renderizaba, pero no estaba
// aquí: el texto sobre el título no se podía cambiar desde el panel.
const EDITABLE_FIELDS: Record<PageBlockType, EditableField[]> = {
  hero: ['subtitle', 'title', 'description', 'buttonText', 'buttonLink'],
  features: [],
  products: ['title', 'itemsToShow'],
  banner: ['subtitle', 'title', 'description', 'buttonText', 'buttonLink'],
  offers: ['title', 'itemsToShow'],
  categories: ['title'],
  more_products: ['title', 'itemsToShow'],
  newsletter: ['title', 'description'],
};

// Etiquetas por tipo: "Título" significa cosas distintas en el hero (es el H1
// de la portada) que en una grilla de productos.
const FIELD_LABELS: Partial<Record<PageBlockType, Partial<Record<EditableField, string>>>> = {
  hero: {
    subtitle: 'Texto sobre el título',
    title: 'Título principal (H1)',
    description: 'Descripción',
  },
  banner: {
    subtitle: 'Texto pequeño',
    title: 'Título del banner',
  },
};

const fieldLabel = (type: PageBlockType, field: EditableField, fallback: string) =>
  FIELD_LABELS[type]?.[field] ?? fallback;

/**
 * Guía de SEO para el título del hero.
 *
 * Ese campo es el <h1> de la portada, la señal más fuerte que recibe un
 * buscador sobre de qué trata el sitio. Como ahora es editable desde el panel,
 * conviene avisar en el momento de escribirlo y no descubrir el problema meses
 * después: longitud utilizable, mención de la comuna (que es lo que decide una
 * búsqueda local como "minimarket en ñuñoa") y del rubro.
 */
function HeroTitleHint({ value }: { value?: string }) {
  const text = (value || '').trim();
  const len = text.length;
  const lower = text.toLowerCase();

  const checks = [
    {
      ok: len >= 20 && len <= 70,
      label:
        len === 0
          ? 'Escribe un título'
          : len < 20
          ? `Muy corto (${len} caracteres): apunta a 20-70`
          : len > 70
          ? `Muy largo (${len} caracteres): apunta a 20-70`
          : `Largo adecuado (${len} caracteres)`,
    },
    {
      ok: /ñuñoa|nunoa/.test(lower),
      label: 'Menciona la comuna (Ñuñoa)',
      why: 'Es lo que decide las búsquedas locales del tipo "minimarket cerca de mí".',
    },
    {
      // Se aceptan las palabras del rubro real, no sólo una: el título puede
      // encabezar por almacén, por despacho o por encomiendas según la época.
      ok: /minimarket|market|almac[ée]n|abarrote|supermercado|encomienda|env[íi]o|despacho|domicilio|venezolan/.test(
        lower
      ),
      label: 'Menciona el rubro o el servicio',
      why: 'Ayuda al buscador a entender qué vendes, no solo cómo te llamas.',
    },
  ];

  return (
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li key={c.label} className="flex items-start gap-1.5 text-xs">
          <span aria-hidden="true" className={c.ok ? 'text-brand-600' : 'text-amber-600'}>
            {c.ok ? '✓' : '!'}
          </span>
          <span className={c.ok ? 'text-slate-500' : 'text-amber-700'}>
            {c.label}
            {!c.ok && c.why && <span className="block text-slate-500">{c.why}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ConstructorPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setBlocks(data.appearance?.blocks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveAppearanceImage = async (field: "logoUrl" | "faviconUrl", dataUrl: string) => {
    setSaving(true);
    try {
      let url = dataUrl;
      if (dataUrl.startsWith("data:image")) {
        const oldUrl = settings?.appearance?.[field] || undefined;
        const resp = await uploadImageServerAction(dataUrl, oldUrl);
        if (!resp.ok || !resp.url) {
          console.error("Error subiendo imagen:", resp.error);
          return;
        }
        url = resp.url;
      }

      const newSettings = {
        ...settings,
        appearance: {
          ...settings?.appearance,
          [field]: url,
        },
      };

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (res.ok) {
        setSettings(newSettings as StoreSettings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const saveBlocks = async (updatedBlocks: PageBlock[]) => {
    setSaving(true);
    try {
      const newSettings = {
        ...settings,
        appearance: {
          ...settings?.appearance,
          blocks: updatedBlocks
        }
      };

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (res.ok) {
        setBlocks(updatedBlocks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    saveBlocks(newBlocks);
  };

  const toggleBlock = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], enabled: !newBlocks[index].enabled };
    saveBlocks(newBlocks);
  };

  const updateBlockData = (id: string, data: Partial<PageBlock>) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...data } : b);
    saveBlocks(newBlocks);
  };

  const addBlock = (type: PageBlockType) => {
    const newBlock: PageBlock = {
      id: `b_${Date.now()}`,
      type,
      enabled: true,
      title: BLOCK_TYPE_LABELS[type],
    };
    setShowTypePicker(false);
    saveBlocks([...blocks, newBlock]);
    setEditingBlockId(newBlock.id);
  };

  const removeBlock = (block: PageBlock) => {
    const label = BLOCK_TYPE_LABELS[block.type] ?? block.type;
    if (!window.confirm(`¿Eliminar el bloque "${block.title || label}"? Esta acción no se puede deshacer.`)) return;
    if (editingBlockId === block.id) setEditingBlockId(null);
    saveBlocks(blocks.filter(b => b.id !== block.id));
  };

  const missingTypes = ALL_BLOCK_TYPES.filter(t => !blocks.some(b => b.type === t));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <SparklesIcon className="w-8 h-8 text-brand-500" />
            Constructor Visual
          </h1>
          <p className="text-gray-500 font-medium mt-1">Configura el orden y contenido de tu página de inicio.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => window.open('/', '_blank')}>
                <EyeIcon className="w-4 h-4 mr-2" />
                Ver Tienda
            </Button>
        </div>
      </div>

      {/* Marca de la tienda: logo y favicon */}
      <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-bold text-gray-900">Marca de la tienda</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            El logo aparece en el menú superior de tu tienda. El favicon es el ícono pequeño que se ve en la pestaña del navegador y en los resultados de Google.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Logo</label>
            <SingleImageUpload
              label={settings?.appearance?.logoUrl ? "Cambiar logo" : "Subir logo"}
              value={settings?.appearance?.logoUrl || ""}
              onChange={(dataUrl) => saveAppearanceImage("logoUrl", dataUrl)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Favicon</label>
            <SingleImageUpload
              label={settings?.appearance?.faviconUrl ? "Cambiar favicon" : "Subir favicon"}
              value={settings?.appearance?.faviconUrl || ""}
              onChange={(dataUrl) => saveAppearanceImage("faviconUrl", dataUrl)}
            />
            <p className="text-[11px] text-gray-400">Ideal: imagen cuadrada, fondo simple. Se ajusta automáticamente.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {blocks.map((block, index) => {
          const label = BLOCK_TYPE_LABELS[block.type] ?? block.type;
          const fields = EDITABLE_FIELDS[block.type] ?? [];
          return (
          <div
            key={block.id}
            className={`bg-white rounded-[2rem] border transition-all duration-300 ${block.enabled ? 'border-gray-200 shadow-sm' : 'border-dashed border-gray-300 opacity-60'}`}
          >
            <div className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <button
                    disabled={index === 0 || saving}
                    onClick={() => moveBlock(index, 'up')}
                    className="p-1 text-gray-400 hover:text-brand-600 disabled:opacity-20"
                  >
                    <ChevronUpIcon className="w-5 h-5" />
                  </button>
                  <button
                    disabled={index === blocks.length - 1 || saving}
                    onClick={() => moveBlock(index, 'down')}
                    className="p-1 text-gray-400 hover:text-brand-600 disabled:opacity-20"
                  >
                    <ChevronDownIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${block.enabled ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                   <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-none">
                     {block.type.substring(0, 4)}
                   </span>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    {block.title || label}
                    {!block.enabled && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">Oculto</span>}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">{label} — {BLOCK_TYPE_DESCRIPTIONS[block.type] ?? ''}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleBlock(index)}
                  className={`p-2 rounded-xl border transition-colors ${block.enabled ? 'bg-brand-50 border-brand-100 text-brand-600 hover:bg-brand-100' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                  title={block.enabled ? "Ocultar en la portada" : "Mostrar en la portada"}
                >
                  {block.enabled ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </button>
                {fields.length > 0 && (
                  <button
                    onClick={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                    title="Editar contenido"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => removeBlock(block)}
                  disabled={saving}
                  className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                  title="Eliminar bloque"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Editor de Bloque */}
            {editingBlockId === block.id && (
              <div className="px-6 pb-8 pt-2 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fields.includes('subtitle') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {fieldLabel(block.type, 'subtitle', 'Subtítulo')}
                      </label>
                      <input
                        type="text"
                        defaultValue={block.subtitle}
                        onBlur={(e) => updateBlockData(block.id, { subtitle: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500"
                      />
                    </div>
                  )}
                  {fields.includes('title') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {fieldLabel(block.type, 'title', 'Título de la sección')}
                      </label>
                      <input
                        type="text"
                        defaultValue={block.title}
                        onBlur={(e) => updateBlockData(block.id, { title: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500"
                      />
                      {block.type === 'hero' && <HeroTitleHint value={block.title} />}
                    </div>
                  )}
                  {fields.includes('description') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Descripción / Subtítulo</label>
                      <input
                        type="text"
                        defaultValue={block.description}
                        onBlur={(e) => updateBlockData(block.id, { description: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  )}
                  {fields.includes('itemsToShow') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Cantidad de productos</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        defaultValue={block.itemsToShow || 10}
                        onBlur={(e) => updateBlockData(block.id, { itemsToShow: Math.max(1, parseInt(e.target.value) || 10) })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  )}
                  {fields.includes('buttonText') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Texto del Botón</label>
                      <input
                        type="text"
                        defaultValue={block.buttonText}
                        onBlur={(e) => updateBlockData(block.id, { buttonText: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  )}
                  {fields.includes('buttonLink') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Enlace del Botón</label>
                      <input
                        type="text"
                        placeholder="/productos"
                        defaultValue={block.buttonLink}
                        onBlur={(e) => updateBlockData(block.id, { buttonLink: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                   <Button onClick={() => setEditingBlockId(null)} size="sm">
                     Cerrar Editor
                   </Button>
                </div>
              </div>
            )}
          </div>
        );})}

        {saving && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent animate-spin rounded-full" />
            <span className="text-xs font-black uppercase tracking-widest">Sincronizando...</span>
          </div>
        )}
      </div>

      {/* Agregar bloque */}
      <div className="bg-brand-50 rounded-[2.5rem] p-8 border border-brand-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-black text-brand-900 tracking-tight">¿Necesitas una sección más?</h3>
            <p className="text-brand-700 font-medium">
              {missingTypes.length > 0
                ? "Agrega los bloques que faltan en tu portada."
                : "Ya tienes todos los tipos de bloque disponibles en tu portada."}
            </p>
          </div>
          {missingTypes.length > 0 && (
            <Button
              variant="outline"
              className="border-brand-200 text-brand-700"
              onClick={() => setShowTypePicker(!showTypePicker)}
            >
              {showTypePicker ? <XMarkIcon className="w-5 h-5 mr-2" /> : <PlusIcon className="w-5 h-5 mr-2" />}
              {showTypePicker ? "Cancelar" : "Nuevo Bloque"}
            </Button>
          )}
        </div>

        {showTypePicker && missingTypes.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-300">
            {missingTypes.map(type => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                disabled={saving}
                className="text-left bg-white rounded-2xl border border-brand-100 p-4 hover:border-brand-300 hover:shadow-md transition-all"
              >
                <p className="font-black text-brand-900 text-sm">{BLOCK_TYPE_LABELS[type]}</p>
                <p className="text-xs text-brand-700/70 font-medium mt-1">{BLOCK_TYPE_DESCRIPTIONS[type]}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
