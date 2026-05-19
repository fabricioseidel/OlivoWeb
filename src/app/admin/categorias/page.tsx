"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useErrorHandler, safeFetch, safeJsonParse } from "@/hooks/useErrorHandler";
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  TagIcon,
  CheckBadgeIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { Sparkles } from "lucide-react";
import { getCategoryStyle, iconOptions } from "@/utils/categoryStyles";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/shell";

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
  const [formErrors, setFormErrors] = useState<{ name?: string; slug?: string }>(
    {}
  );

  const loadCategories = async () => {
    try {
      const res = await safeFetch("/api/categories", { cache: "no-store" });
      const data = await safeJsonParse<Category[]>(res);
      if (!Array.isArray(data)) {
        throw new Error("Respuesta inválida de /api/categories");
      }
      setCategories(data);
    } catch (e: any) {
      const errorMessage = e.message || "Error al cargar categorías";
      showToast(errorMessage, "error");
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeSlug = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
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

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.isActive).length;
    const withProducts = categories.filter((c) => c.productsCount > 0).length;
    const empty = categories.filter((c) => c.productsCount === 0).length;
    return { total, active, withProducts, empty };
  }, [categories]);

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
      isActive: category.isActive,
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
      if (e.key === "Escape" && isModalOpen) closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    if (!formData.name.trim()) errors.name = "El nombre es obligatorio";
    const finalSlug = normalizeSlug(formData.slug);
    if (!finalSlug) errors.slug = "El slug es obligatorio";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (editingCategory) {
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: finalSlug,
            description: (formData.description || "").trim(),
            image: formData.image,
            isActive: formData.isActive,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 409)
            setFormErrors((prev) => ({ ...prev, slug: "Slug ya existe" }));
          else showToast(data.error || "No se pudo actualizar", "error");
          return;
        }
        setCategories((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        showToast(`Categoría "${formData.name}" actualizada`, "success");
      } else {
        const res = await safeFetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: finalSlug,
            description: (formData.description || "").trim(),
            image: formData.image,
            isActive: formData.isActive,
          }),
        });
        const data = await safeJsonParse(res);
        setCategories((prev) => [data, ...prev]);
        showToast(`Categoría "${formData.name}" creada`, "success");
      }
      closeModal();
      loadCategories();
    } catch (err: any) {
      showToast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    if (
      !(await confirm({
        title: "Eliminar categoría",
        message: `¿Borrar "${category.name}"?`,
        confirmText: "Eliminar",
        cancelText: "Cancelar",
        confirmButtonClass: "bg-red-600",
      }))
    )
      return;

    try {
      await safeFetch(`/api/categories/${categoryId}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
      showToast("Eliminada correctamente", "success");
    } catch (e: any) {
      showToast(e.message || "Error al eliminar", "error");
    }
  };

  const toggleCategoryStatus = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    try {
      const res = await safeFetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      const data = await safeJsonParse(res);
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? data : c)));
      showToast("Estado actualizado", "success");
    } catch {
      showToast("Error al actualizar estado", "error");
    }
  };

  const CategoryIcon = ({ cat }: { cat: Category }) => {
    const style = getCategoryStyle(cat.name, cat.image);
    const Icon = style.icon;
    return (
      <div
        className={`size-12 rounded-2xl ${style.bg} flex items-center justify-center ring-2 ring-white shadow-sm`}
      >
        <Icon className={`size-6 ${style.color}`} />
      </div>
    );
  };

  const columns: Column<Category>[] = [
    {
      key: "appearance",
      header: "Apariencia",
      cell: (cat) => <CategoryIcon cat={cat} />,
      width: "100px",
      hideOnMobile: true,
    },
    {
      key: "name",
      header: "Categoría",
      cell: (cat) => (
        <div>
          <p className="font-black text-gray-900">{cat.name}</p>
          <p className="text-xs text-emerald-700 font-mono mt-0.5">
            /{cat.slug}
          </p>
        </div>
      ),
    },
    {
      key: "products",
      header: "Productos",
      cell: (cat) => (
        <span className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-xs font-black text-gray-600">
          {cat.productsCount} items
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (cat) => (
        <button
          onClick={() => toggleCategoryStatus(cat.id)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all min-h-[36px] ${
            cat.isActive
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-rose-100 text-rose-700 hover:bg-rose-200"
          }`}
        >
          {cat.isActive ? "Activa" : "Inactiva"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (cat) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleEditCategory(cat)}
            className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
            title="Editar"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            onClick={() =>
              cat.productsCount > 0
                ? showToast(
                    `No se puede eliminar: tiene ${cat.productsCount} producto(s)`,
                    "error"
                  )
                : handleDeleteCategory(cat.id)
            }
            title={
              cat.productsCount > 0
                ? `Tiene ${cat.productsCount} productos`
                : "Eliminar"
            }
            className={`p-2 rounded-lg transition-all min-h-[36px] min-w-[36px] inline-flex items-center justify-center ${
              cat.productsCount > 0
                ? "text-gray-300 cursor-not-allowed bg-gray-50"
                : "text-rose-700 bg-rose-50 hover:bg-rose-100"
            }`}
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (cat: Category) => (
    <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 space-y-3">
      <div className="flex gap-3 items-start">
        <CategoryIcon cat={cat} />
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 truncate">{cat.name}</p>
          <p className="text-xs text-emerald-700 font-mono">/{cat.slug}</p>
          {cat.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {cat.description}
            </p>
          )}
        </div>
        <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded-full text-gray-600 whitespace-nowrap">
          {cat.productsCount} items
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={() => toggleCategoryStatus(cat.id)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider min-h-[36px] ${
            cat.isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {cat.isActive ? "Activa" : "Inactiva"}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => handleEditCategory(cat)}
            className="p-2 text-emerald-700 bg-emerald-50 rounded-lg min-h-[36px] min-w-[36px]"
            title="Editar"
          >
            <PencilIcon className="size-4" />
          </button>
          <button
            onClick={() =>
              cat.productsCount > 0
                ? showToast(
                    `No se puede eliminar: tiene ${cat.productsCount} producto(s)`,
                    "error"
                  )
                : handleDeleteCategory(cat.id)
            }
            className={`p-2 rounded-lg min-h-[36px] min-w-[36px] ${
              cat.productsCount > 0
                ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                : "text-rose-700 bg-rose-50"
            }`}
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Organización"
          title="Categorías"
          subtitle="Gestión visual de secciones de la tienda"
          icon={<TagIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadCategories()}
                className="px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:bg-white/15 transition-all min-h-[36px]"
              >
                Actualizar
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-emerald-500 rounded-xl text-emerald-950 text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 min-h-[36px]"
              >
                <PlusIcon className="size-4" />
                Nueva
              </button>
            </div>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Total"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<TagIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Activas"
          value={stats.active.toLocaleString()}
          tone="emerald"
          icon={<CheckBadgeIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Con productos"
          value={stats.withProducts.toLocaleString()}
          tone="sky"
          icon={<CubeIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Vacías"
          value={stats.empty.toLocaleString()}
          tone="amber"
        />
      </StatsRow>

      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div className="md:col-span-3 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <label className="flex items-center justify-between bg-gray-50 px-5 py-3 rounded-xl cursor-pointer">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                className="size-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-gray-300"
                checked={showInactiveCategories}
                onChange={(e) => setShowInactiveCategories(e.target.checked)}
              />
              <span className="text-xs font-black text-gray-600 uppercase tracking-widest">
                Mostrar inactivas
              </span>
            </span>
          </label>
        </div>
      </div>

      <ResponsiveTable<Category>
        columns={columns}
        rows={filteredCategories}
        rowKey={(c) => c.id}
        renderMobileCard={renderMobileCard}
        emptyState={
          <EmptyState
            icon={<TagIcon className="h-7 w-7" />}
            title="No se encontraron categorías"
            description="Probá ajustar el filtro o crear una nueva."
            cta={
              <button
                onClick={handleCreateCategory}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 min-h-[44px]"
              >
                <PlusIcon className="size-4" />
                Nueva categoría
              </button>
            }
          />
        }
      />

      {/* Modal de creación/edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white max-h-[90vh] flex flex-col">
            <div className="px-8 pt-8 pb-4 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900">
                {editingCategory ? "Editar" : "Nueva"} Categoría
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Cerrar"
              >
                <svg
                  className="size-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSaveCategory}
              className="px-8 pb-8 space-y-5 overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Nombre
                  </label>
                  <input
                    ref={nameInputRef}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ej: Snacks"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                    required
                  />
                  {formErrors.name && (
                    <p className="text-[10px] text-rose-600 font-bold pl-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    Slug (Link)
                  </label>
                  <input
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl font-mono text-[11px] text-gray-500"
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                      Apariencia
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, image: "" }))
                      }
                      title="Auto-detectar icono"
                      className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-all"
                    >
                      <Sparkles className="size-3" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">
                        Sugerencia IA
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-100 max-h-40 overflow-y-auto">
                  {Object.entries(iconOptions).map(([name, Icon]) => {
                    const autoStyle = getCategoryStyle(formData.name);
                    const isAuto = autoStyle.iconName === name;
                    const isSelected =
                      formData.image === name || (isAuto && !formData.image);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, image: name }))
                        }
                        className={`relative size-10 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-md scale-105 z-10"
                            : "bg-white text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-100"
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

              <div className="py-6 px-4 bg-emerald-50/30 rounded-3xl border border-emerald-100/50 flex flex-col items-center justify-center gap-3">
                {(() => {
                  const style = getCategoryStyle(formData.name, formData.image);
                  const Icon = style.icon;
                  return (
                    <div
                      className={`size-20 rounded-2xl ${style.bg} flex items-center justify-center border-2 border-white shadow-xl`}
                    >
                      <Icon size={40} strokeWidth={2.5} className={style.color} />
                    </div>
                  );
                })()}
                <div className="text-center">
                  <p className="text-emerald-950 font-black text-sm uppercase tracking-widest">
                    Vista previa
                  </p>
                  <p className="text-emerald-700/60 text-[9px] font-black uppercase tracking-tighter mt-0.5">
                    {formData.name || "Sin nombre"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
                  Descripción corta
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Información adicional (opcional)..."
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-2 rounded-full ${
                      formData.isActive
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-gray-300"
                    }`}
                  />
                  <p className="font-bold text-gray-800 text-xs">
                    Categoría activa
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleCheckboxChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl font-black text-gray-500 hover:bg-gray-100 transition-all text-sm min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm min-h-[44px]"
                >
                  {saving
                    ? "Guardando..."
                    : editingCategory
                    ? "Guardar cambios"
                    : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
