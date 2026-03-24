"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  SparklesIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  ChevronUpIcon, 
  ChevronDownIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import type { StoreSettings, PageBlock } from "@/app/api/admin/settings/route";

export default function ConstructorPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

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
    newBlocks[index].enabled = !newBlocks[index].enabled;
    saveBlocks(newBlocks);
  };

  const updateBlockData = (id: string, data: Partial<PageBlock>) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...data } : b);
    saveBlocks(newBlocks);
    setEditingBlockId(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <SparklesIcon className="w-8 h-8 text-emerald-500" />
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

      <div className="space-y-4">
        {blocks.map((block, index) => (
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
                    className="p-1 text-gray-400 hover:text-emerald-600 disabled:opacity-20"
                  >
                    <ChevronUpIcon className="w-5 h-5" />
                  </button>
                  <button 
                    disabled={index === blocks.length - 1 || saving}
                    onClick={() => moveBlock(index, 'down')}
                    className="p-1 text-gray-400 hover:text-emerald-600 disabled:opacity-20"
                  >
                    <ChevronDownIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${block.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                   <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-none">
                     {block.type.substring(0, 4)}
                   </span>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    {block.title || block.type.charAt(0).toUpperCase() + block.type.slice(1)}
                    {!block.enabled && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">Oculto</span>}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Sección de {block.type}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleBlock(index)}
                  className={`p-2 rounded-xl border transition-colors ${block.enabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'}`}
                  title={block.enabled ? "Desactivar" : "Activar"}
                >
                  {block.enabled ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Editor de Bloque */}
            {editingBlockId === block.id && (
              <div className="px-6 pb-8 pt-2 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(block.type === 'hero' || block.type === 'banner' || block.type === 'products' || block.type === 'categories') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Título de la Sección</label>
                      <input 
                        type="text" 
                        defaultValue={block.title}
                        onBlur={(e) => updateBlockData(block.id, { title: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  )}
                  {(block.type === 'hero' || block.type === 'banner') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Descripción / Subtítulo</label>
                      <input 
                        type="text" 
                        defaultValue={block.description}
                        onBlur={(e) => updateBlockData(block.id, { description: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  )}
                  {block.type === 'products' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Cantidad de productos</label>
                      <input 
                        type="number" 
                        defaultValue={block.itemsToShow || 8}
                        onBlur={(e) => updateBlockData(block.id, { itemsToShow: parseInt(e.target.value) })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  )}
                  {(block.type === 'hero' || block.type === 'banner') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400">Texto del Botón</label>
                      <input 
                        type="text" 
                        defaultValue={block.buttonText}
                        onBlur={(e) => updateBlockData(block.id, { buttonText: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
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
        ))}

        {saving && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
            <span className="text-xs font-black uppercase tracking-widest">Sincronizando...</span>
          </div>
        )}
      </div>

      <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-black text-emerald-900 tracking-tight">¿Necesitas una sección especial?</h3>
            <p className="text-emerald-700 font-medium">Pronto podrás agregar nuevos bloques personalizados.</p>
          </div>
          <Button variant="outline" className="border-emerald-200 text-emerald-700 pointer-events-none opacity-50">
            <PlusIcon className="w-5 h-5 mr-2" />
            Nuevo Bloque (Próximamente)
          </Button>
      </div>
    </div>
  );
}
