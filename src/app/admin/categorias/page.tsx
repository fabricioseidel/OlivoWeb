"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useErrorHandler, safeFetch, safeJsonParse } from "@/hooks/useErrorHandler";
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import { Sparkles } from "lucide-react";
import { getCategoryStyle, iconOptions } from '@/utils/categoryStyles';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
  productsCount: number;
  isActive: boolean;
};

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
};

export default function CategoriesPage() {
  useErrorHandler();

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactiveCategories, setShowInactiveCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const initialFormData: CategoryForm = {
    name: "",
    slug: "",
    description: "",
    image: "",
    isActive: true,
  };

  const [formData, setFormData] = useState<CategoryForm>(initialFormData);
  const [formErrors, setFormErrors] = useState<{ name?: string; slug?: string }>({});

  const loadCategories = async () => {
    try {
      const res = await safeFetch('/api/categories', { cache: 'no-store' });
      const data = await safeJsonParse<Category[]>(res);
      if (!Array.isArray(data)) {
        throw new Error('Respuesta inválida de /api/categories');
      }
      setCategories(data);
    } catch (e: any) {
      const errorMessage = e.message || 'Error al cargar categorías';
      showToast(errorMessage, 'error');
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeSlug = (value: string) => value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const filteredCategories = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return categories.filter((category) => {
      const name = String(category.name || "").toLowerCase();
      const desc = String(category.description || "").toLowerCase();
      const matchesSearch = name.includes(q) || desc.includes(q);
      const matchesStatus = showInactiveCategories || category.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchTerm, showInactiveCategories]);

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
      isActive: category.isActive
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormErrors({});
    setFormData(initialFormData);
  };

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "name") {
      setFormData((prev) => ({ ...prev, slug: normalizeSlug(value) }));
    }
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; slug?: string } = {};
    if (!formData.name.trim()) errors.name = 'El nombre es obligatorio';
    const finalSlug = normalizeSlug(formData.slug);
    if (!finalSlug) errors.slug = 'El slug es obligatorio';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (editingCategory) {
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: finalSlug,
            description: (formData.description || '').trim(),
            image: formData.image,
            isActive: formData.isActive,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 409) setFormErrors(prev => ({ ...prev, slug: 'Slug ya existe' }));
          else showToast(data.error || 'No se pudo actualizar', 'error');
          return;
        }
        setCategories(prev => prev.map(c => c.id === data.id ? data : c));
        showToast(`Categoría "${formData.name}" actualizada`, "success");
      } else {
        const res = await safeFetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: finalSlug,
            description: (formData.description || '').trim(),
            image: formData.image,
            isActive: formData.isActive,
          }),
        });
        const data = await safeJsonParse(res);
        setCategories(prev => [data, ...prev]);
        showToast(`Categoría "${formData.name}" creada`, "success");
      }
      closeModal();
      loadCategories(); // Reload to sync counts
    } catch (err: any) {
      showToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    if (!await confirm({
      title: "Eliminar categoría",
      message: `¿Borrar "${category.name}"?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      confirmButtonClass: "bg-red-600"
    })) return;

    try {
      await safeFetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
      setCategories(prev => prev.filter((cat) => cat.id !== categoryId));
      showToast("Eliminada correctamente", "success");
    } catch (e: any) {
      showToast(e.message || 'Error al eliminar', "error");
    }
  };

  const toggleCategoryStatus = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    try {
      const res = await safeFetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      const data = await safeJsonParse(res);
      setCategories(prev => prev.map(c => c.id === categoryId ? data : c));
      showToast("Estado actualizado", "success");
    } catch {
      showToast("Error al actualizar estado", "error");
    }
  };

  return (
    <div className="-m-4 sm:-m-8">
      {/* Header Premium Admin */}
      <div className="bg-emerald-950 p-8 sm:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/5">
                    <Sparkles className="size-3" />
                    <span>Organización</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Categorías</h1>
                <p className="mt-2 text-emerald-100/50 font-medium italic">
                    Gestión visual de secciones de la tienda
                </p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => loadCategories()}
                    className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                    Actualizar
                </button>
                <button
                    onClick={handleCreateCategory}
                    className="px-6 py-3 bg-emerald-500 rounded-2xl text-emerald-950 text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                    <PlusIcon className="size-4" />
                    Nueva Categoría
                </button>
            </div>
        </div>
      </div>

      <div className="px-8 pb-12">
        {/* Filtros Premium */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-3 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-emerald-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder="Buscar por nombre o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center justify-between bg-gray-50 px-6 py-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="showInactive"
                            className="size-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-gray-300"
                            checked={showInactiveCategories}
                            onChange={(e) => setShowInactiveCategories(e.target.checked)}
                        />
                        <label htmlFor="showInactive" className="text-xs font-black text-gray-600 cursor-pointer uppercase tracking-widest">Inactivas</label>
                    </div>
                </div>
            </div>
        </div>

      {/* Lista / Tabla */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-bottom border-gray-100">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Apariencia</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Categoría</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Productos</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Estado</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredCategories.map(cat => {
              const style = getCategoryStyle(cat.name, cat.image);
              const Icon = style.icon;
              return (
                <tr key={cat.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className={`size-14 rounded-2xl ${style.bg} flex items-center justify-center border border-white shadow-sm ring-4 ring-gray-50 group-hover:scale-110 transition-transform`}>
                       <Icon className={`size-7 ${style.color}`} />
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-gray-900">{cat.name}</p>
                    <p className="text-xs text-emerald-600 font-mono mt-0.5">/{cat.slug}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-xs font-black text-gray-600">
                      {cat.productsCount} items
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => toggleCategoryStatus(cat.id)}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${cat.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    >
                      {cat.isActive ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEditCategory(cat)} className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><PencilIcon className="size-5" /></button>
                      <button
                        onClick={() => cat.productsCount > 0
                          ? showToast(`No se puede eliminar: tiene ${cat.productsCount} producto(s)`, 'error')
                          : handleDeleteCategory(cat.id)
                        }
                        title={cat.productsCount > 0 ? `Tiene ${cat.productsCount} productos` : 'Eliminar'}
                        className={`p-3 rounded-xl transition-all ${
                          cat.productsCount > 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <TrashIcon className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredCategories.length === 0 && (
          <div className="p-20 text-center">
            <div className="size-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
               <MagnifyingGlassIcon className="size-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold">No se encontraron categorías</p>
          </div>
        )}
      </div>

      {/* Modal Reconstruido */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white">
             <div className="px-10 pt-10 pb-6 flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-900">{editingCategory ? 'Editar' : 'Nueva'} Categoría</h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <svg className="size-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             <form onSubmit={handleSaveCategory} className="px-8 pb-8 space-y-6">
                <div className="space-y-4">
                  {/* Nombre y Slug en una fila para ahorrar espacio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nombre</label>
                      <input 
                        ref={nameInputRef}
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="Ej: Snacks"
                        className="w-full px-5 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm"
                        required
                      />
                      {formErrors.name && <p className="text-[10px] text-red-500 font-bold pl-1">{formErrors.name}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Slug (Link)</label>
                      <input 
                        name="slug" 
                        value={formData.slug} 
                        onChange={handleChange} 
                        className="w-full px-5 py-3 bg-gray-100 border-none rounded-xl font-mono text-[10px] text-gray-500"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Selector de Iconos más compacto */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pl-1">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Elegir Apariencia</label>
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                          title="Auto-detectar icono según el nombre"
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-all group/magic"
                        >
                          <Sparkles className="size-3 group-hover/magic:rotate-12 transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Sugerencia IA</span>
                        </button>
                      </div>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-100/30 px-2 py-0.5 rounded border border-emerald-100 uppercase">Premium Pack</span>
                    </div>
                    
                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-100 max-h-40 overflow-y-auto custom-scrollbar">
                      {Object.entries(iconOptions).map(([name, Icon]) => {
                        const autoStyle = getCategoryStyle(formData.name);
                        const isAuto = autoStyle.iconName === name;
                        const isSelected = formData.image === name || (isAuto && !formData.image);
                        
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, image: name }))}
                            className={`relative size-10 rounded-lg flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-emerald-600 text-white shadow-md scale-105 z-10' 
                                : 'bg-white text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-100'
                            }`}
                            title={name}
                          >
                            <Icon size={20} strokeWidth={2.5} />
                            {isAuto && !isSelected && (
                              <div className="absolute -top-1 -right-1 size-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview más centrado y realista */}
                  <div className="py-6 px-4 bg-emerald-50/30 rounded-[2rem] border border-emerald-100/50 flex flex-col items-center justify-center gap-3 relative overflow-hidden group/preview">
                     <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover/preview:opacity-[0.07] transition-opacity duration-700">
                        <Sparkles className="size-32 text-emerald-900" />
                     </div>
                     
                     {(() => {
                        const style = getCategoryStyle(formData.name, formData.image);
                        const Icon = style.icon;
                        return (
                          <div className={`size-20 rounded-2xl ${style.bg} flex items-center justify-center border-2 border-white shadow-xl group-hover/preview:scale-110 transition-transform duration-500`}>
                            <Icon size={40} strokeWidth={2.5} className={style.color} />
                          </div>
                        );
                     })()}
                     <div className="text-center relative z-10">
                        <p className="text-emerald-950 font-black text-sm uppercase tracking-widest">Vista Previa</p>
                        <p className="text-emerald-600/60 text-[9px] font-black uppercase tracking-tighter mt-0.5">
                           Diseño: {formData.name || 'Sin Nombre'}
                        </p>
                     </div>
                  </div>

                  {/* Descripción compacta */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Descripción corta</label>
                    <textarea 
                      name="description" 
                      value={formData.description} 
                      onChange={handleChange} 
                      rows={2}
                      placeholder="Información adicional (opcional)..."
                      className="w-full px-5 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-xs resize-none"
                    />
                  </div>

                  {/* Switch Estilizado */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`size-2 rounded-full ${formData.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                      <p className="font-bold text-gray-800 text-xs">Categoría Activa</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleCheckboxChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                   <button type="button" onClick={closeModal} className="flex-1 py-4 rounded-xl font-black text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all text-sm">Cancelar</button>
                   <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm"
                  >
                    {saving ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Ahora'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
