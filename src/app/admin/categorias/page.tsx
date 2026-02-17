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
import Button from "@/components/ui/Button";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import { getImageUrlWithRandomTimestamp } from "@/utils/image";
import ImageWithFallback from '@/components/ui/ImageWithFallback';

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

// Los datos ahora provienen de la API (/api/categories)

export default function CategoriesPage() {
  // Usar el hook de manejo de errores globales
  useErrorHandler();

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactiveCategories, setShowInactiveCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [imageRefreshMap, setImageRefreshMap] = useState<Map<string, number>>(new Map());

  // Función para obtener URL de imagen con timestamp único por categoría
  const getImageUrlForCategory = (categoryId: string, imageUrl: string | undefined) => {
    if (!imageUrl) return '/file.svg';
    // Usar la función de utilidad normalizada
    return getImageUrlWithRandomTimestamp(imageUrl);
  };

  // Modal para crear/editar categoría
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Estado para el formulario de categoría
  const initialFormData: CategoryForm = {
    name: "",
    slug: "",
    description: "",
    image: "",
    isActive: true,
  };

  const [formData, setFormData] = useState<CategoryForm>(initialFormData);
  const [formErrors, setFormErrors] = useState<{ name?: string; slug?: string }>({});

  // Función para cargar categorías con mejor manejo de errores
  const loadCategories = async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const res = await safeFetch('/api/categories', { cache: 'no-store' });
      const data = await safeJsonParse<Category[]>(res);

      console.debug('Fetched /api/categories response:', data);

      if (!Array.isArray(data)) {
        throw new Error('Respuesta inválida de /api/categories - esperaba un array');
      }

      setCategories(data);
    } catch (e: any) {
      const errorMessage = e.message || 'Error desconocido al cargar categorías';
      console.error('Error loading categories:', e);
      setGlobalError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar categorías desde la API al montar
  useEffect(() => {
    const load = async () => {
      await loadCategories();
    };
    load();
  }, []);

  const normalizeSlug = (value: string) => value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Filtrar categorías (proteger description nulo)
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

  // Abrir modal para crear nueva categoría
  const handleCreateCategory = () => {
    console.debug('Opening create category modal');
    setEditingCategory(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  // Abrir modal para editar categoría
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: (category as any).image || "",
      isActive: category.isActive
    });
    setIsModalOpen(true);
  };

  // Cerrar modal y resetear estado del formulario
  const closeModal = () => {
    console.debug('Closing category modal');
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormErrors({});
    setFormData(initialFormData);
  };

  // Focus + ESC handler for modal
  useEffect(() => {
    if (isModalOpen) {
      // focus next tick
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isModalOpen]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : value,
    }));

    // Generar slug automáticamente desde el nombre
    if (name === "name") {
      const slug = normalizeSlug(value);
      setFormData((prev) => ({ ...prev, slug }));
    }

    // Limpiar errores al escribir
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Manejar checkbox
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // Guardar categoría
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validaciones básicas
    const errors: { name?: string; slug?: string } = {};
    if (!formData.name.trim()) errors.name = 'El nombre es obligatorio';
    const finalSlug = normalizeSlug(formData.slug);
    if (!finalSlug) errors.slug = 'El slug es obligatorio';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setGlobalError(null);
    try {
      // Subir imagen si es data-URL (nueva imagen) con mejor manejo de errores
      let finalImageUrl = formData.image;
      if (formData.image && formData.image.startsWith('data:')) {
        try {
          const uploadRes = await safeFetch('/api/admin/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: formData.image })
          });

          const uploadData = await safeJsonParse(uploadRes);
          finalImageUrl = uploadData.url;
          console.log('Image uploaded successfully:', finalImageUrl);
        } catch (uploadError: any) {
          console.error('Error en la subida de imagen:', uploadError);
          const errorMessage = `Error subiendo la imagen: ${uploadError.message}`;
          setGlobalError(errorMessage);
          showToast(errorMessage, 'error');
          return;
        }
      }

      if (editingCategory) {
        // Actualizar categoría existente vía API
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: finalSlug,
            description: formData.description,
            image: finalImageUrl,
            isActive: formData.isActive,
          }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          if (res.status === 409) setFormErrors(prev => ({ ...prev, slug: data.error || 'Slug o nombre ya existe' }));
          else setGlobalError(data.error || 'No se pudo actualizar la categoría');
          return;
        }
        setCategories(prev => prev.map(c => c.id === data.id ? data : c));

        // Forzar actualización de imagen para esta categoría específica
        setImageRefreshMap(prev => {
          const newMap = new Map(prev);
          newMap.set(editingCategory.id, Date.now());
          return newMap;
        });

        showToast(`Categoría "${formData.name}" actualizada correctamente`, "success");

        // Recargar la lista después de un breve delay
        setTimeout(() => {
          loadCategories();
        }, 200);
      } else {
        // Crear nueva categoría vía API con mejor manejo de errores
        const res = await safeFetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: finalSlug,
            description: formData.description,
            image: finalImageUrl,
            isActive: formData.isActive,
          }),
        });

        const data = await safeJsonParse(res);
        console.log('Category created successfully:', data);

        setCategories(prev => [data, ...prev]);

        // Forzar carga de imagen para la nueva categoría
        setImageRefreshMap(prev => {
          const newMap = new Map(prev);
          newMap.set(data.id, Date.now());
          return newMap;
        });

        showToast(`Categoría "${formData.name}" creada correctamente`, "success");
      }
      // Cerrar modal y limpiar estado
      closeModal();
    } catch (err: any) {
      const errorMessage = err.message || 'Error de red al guardar categoría';
      console.error('Error saving category:', err);
      setGlobalError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar categoría
  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const confirmed = await confirm({
      title: "Eliminar categoría",
      message: `¿Estás seguro de que deseas eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      confirmButtonClass: "bg-red-600 hover:bg-red-700"
    });

    if (!confirmed) return;

    setGlobalError(null);
    try {
      await safeFetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
      console.log('Category deleted successfully');

      setCategories(prev => prev.filter((cat) => cat.id !== categoryId));
      showToast(`Categoría "${category.name}" eliminada correctamente`, "success");
    } catch (e: any) {
      const errorMessage = e.message || 'No se pudo eliminar la categoría';
      console.error('Error deleting category:', e);
      setGlobalError(errorMessage);
      showToast(errorMessage, "error");
    }
  };

  // Alternar estado de categoría (activa/inactiva)
  const toggleCategoryStatus = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const confirmed = await confirm({
      title: category.isActive ? "Desactivar categoría" : "Activar categoría",
      message: `¿Estás seguro de que deseas ${category.isActive ? "desactivar" : "activar"} la categoría "${category.name}"?`,
      confirmText: category.isActive ? "Desactivar" : "Activar",
      cancelText: "Cancelar",
      confirmButtonClass: category.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
    });

    if (!confirmed) return;

    setGlobalError(null);
    try {
      const res = await safeFetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      const data = await safeJsonParse(res);
      console.log('Category status updated successfully:', data);

      setCategories(prev => prev.map(c => c.id === categoryId ? data : c));
      showToast(`Categoría "${category.name}" ${category.isActive ? "desactivada" : "activada"} correctamente`, "success");
    } catch (e: any) {
      const errorMessage = e.message || 'Error actualizando estado';
      console.error('Error updating category status:', e);
      setGlobalError(errorMessage);
      showToast(errorMessage, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header con título y botón */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              Categorías de Productos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Organiza tus productos en categorías para facilitar la navegación en la tienda
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => loadCategories()}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg shadow-sm transition-colors border border-gray-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </Button>
            <Button
              onClick={handleCreateCategory}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-1.5" />
              Nueva Categoría
            </Button>
          </div>
        </div>
      </div>

      {/* Mensaje de error global */}
      {globalError && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 shadow-sm flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>{globalError}</div>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 sm:text-sm"
              placeholder="Buscar categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center">
            <input
              id="showInactive"
              type="checkbox"
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition"
              checked={showInactiveCategories}
              onChange={(e) => setShowInactiveCategories(e.target.checked)}
            />
            <label htmlFor="showInactive" className="ml-2 block text-sm font-medium text-gray-700">
              Mostrar categorías inactivas
            </label>
          </div>

          <div className="text-left md:text-right flex items-center justify-start md:justify-end">
            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              {filteredCategories.length} de {categories.length} categorías
            </span>
            {(searchTerm || !showInactiveCategories) && (
              <button
                onClick={() => { setSearchTerm(''); setShowInactiveCategories(true); }}
                className="ml-3 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de categorías */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Imagen
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={7}>
                    <div className="flex justify-center items-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Cargando categorías...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {category.image ? (
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <ImageWithFallback
                          key={`${category.id}-${imageRefreshMap.get(category.id) || 0}`}
                          src={getImageUrlForCategory(category.id, category.image)}
                          alt={category.name}
                          className="h-12 w-12 rounded-lg object-cover"
                          fallback="/file.svg"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 border border-gray-200">Sin imagen</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 font-mono">{category.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 truncate max-w-xs">{category.description || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 font-medium">{category.productsCount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1.5 inline-flex text-xs font-semibold rounded-full ${category.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                        }`}
                    >
                      {category.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-indigo-600 hover:text-indigo-900 border border-indigo-200 rounded-lg p-2 hover:bg-indigo-50 transition-colors"
                        title="Editar categoría"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleCategoryStatus(category.id)}
                        className={`text-sm py-2 px-3 rounded-lg font-medium transition-colors ${category.isActive
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        title={category.isActive ? "Desactivar categoría" : "Activar categoría"}
                      >
                        {category.isActive ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className={`text-red-600 hover:text-red-900 border border-red-200 rounded-lg p-2 hover:bg-red-50 transition-colors ${category.productsCount > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={category.productsCount > 0}
                        title={category.productsCount > 0 ? "No se puede eliminar una categoría con productos" : "Eliminar categoría"}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sin resultados */}
        {!loading && filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-lg">No se encontraron categorías con los criterios de búsqueda.</p>
            <button
              onClick={() => { setSearchTerm(''); setShowInactiveCategories(true); }}
              className="mt-3 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Modal para crear/editar categoría */}
      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50" onClick={() => closeModal()}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0" onClick={e => e.stopPropagation()}>
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-700 bg-opacity-75 backdrop-blur-sm z-40"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-50 pointer-events-auto">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => closeModal()}
                >
                  <span className="sr-only">Cerrar</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="text-gray-700">
                <div className="bg-white px-5 py-6">
                  <div className="sm:flex sm:items-start">
                    <div className="text-center sm:text-left w-full">
                      <h3 className="text-xl leading-6 font-bold text-gray-900 mb-5" id="modal-title">
                        {editingCategory ? "Editar categoría" : "Nueva categoría"}
                      </h3>
                      <div className="space-y-5">
                        {/* Nombre */}
                        <div className="space-y-1.5">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-800">
                            Nombre <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-2.5"
                            placeholder="Electrónica, Ropa, etc."
                            value={formData.name}
                            onChange={handleChange}
                            ref={nameInputRef}
                          />
                          {formErrors.name && (
                            <p className="text-xs text-red-500 mt-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                              </svg>
                              {formErrors.name}
                            </p>
                          )}
                        </div>

                        {/* Slug */}
                        <div className="space-y-1.5">
                          <label htmlFor="slug" className="block text-sm font-medium text-gray-800">
                            Slug <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="slug"
                            id="slug"
                            required
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-2.5 font-mono"
                            placeholder="electronica, ropa-deportiva"
                            value={formData.slug}
                            onChange={handleChange}
                          />
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Identificador único para URLs (ej: laptops, smartphones)
                          </p>
                          {formErrors.slug && (
                            <p className="text-xs text-red-500 mt-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                              </svg>
                              {formErrors.slug}
                            </p>
                          )}
                        </div>

                        {/* Descripción */}
                        <div className="space-y-1.5">
                          <label htmlFor="description" className="block text-sm font-medium text-gray-800">
                            Descripción
                          </label>
                          <textarea
                            name="description"
                            id="description"
                            rows={3}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-2.5"
                            placeholder="Descripción breve de la categoría..."
                            value={formData.description}
                            onChange={handleChange}
                          ></textarea>
                        </div>

                        {/* Imagen */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-800">Imagen de categoría</label>
                          <div className="mt-1 flex items-center gap-4">
                            {/* Vista previa de imagen */}
                            {editingCategory && formData.image && !formData.image.startsWith('data:') && (
                              <div className="w-24 h-24 relative border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                                <ImageWithFallback
                                  src={getImageUrlWithRandomTimestamp(formData.image)}
                                  alt={formData.name}
                                  className="w-full h-full object-cover"
                                  fallback="/file.svg"
                                />
                              </div>
                            )}

                            {/* Imagen actual (data URL) */}
                            {formData.image && formData.image.startsWith('data:') && (
                              <div className="w-24 h-24 relative border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                                <img
                                  src={formData.image}
                                  alt="Vista previa"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            {/* Componente de subida */}
                            <div className="flex-1">
                              <SingleImageUpload
                                label="Seleccionar imagen"
                                value={formData.image}
                                onChange={(dataUrl) => setFormData(prev => ({ ...prev, image: dataUrl }))}
                                className="w-full rounded-lg"
                              />
                              <p className="mt-2 text-xs text-gray-500 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                JPG, PNG o WebP. Máximo 2MB. Tamaño recomendado: 500x500px.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Estado */}
                        <div className="space-y-1.5 bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <input
                              id="isActive"
                              name="isActive"
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              checked={formData.isActive}
                              onChange={handleCheckboxChange}
                            />
                            <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-gray-800">
                              Categoría activa
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Las categorías inactivas no se mostrarán a los clientes en la tienda.
                          </p>
                        </div>

                        {/* Mensajes de error */}
                        {globalError && (
                          <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg border border-red-100 flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {globalError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-4 sm:flex sm:flex-row-reverse border-t border-gray-100">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-2.5 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </>
                    ) : editingCategory ? (
                      "Actualizar categoría"
                    ) : (
                      "Crear categoría"
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    onClick={() => closeModal()}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
