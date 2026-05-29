"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingBagIcon,
  DocumentArrowDownIcon,
  Squares2X2Icon,
  PhotoIcon,
  CheckBadgeIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { exportToExcel, exportToPDF, exportToCSV } from "@/lib/exportUtils";
import Button from "@/components/ui/Button";
import { useProducts } from "@/contexts/ProductContext";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useCategories } from "@/hooks/useCategories";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/shell";
import type { ProductUI } from "@/types";

type SortField = "name" | "price" | "stock" | "category" | "createdAt";
type SortDir = "asc" | "desc";

export default function AdminProductsPage() {
  const { products, deleteProduct, toggleFeatured, toggleActive } = useProducts();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { categories, loading: categoriesLoading } = useCategories();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [onlyEditedToday, setOnlyEditedToday] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === "Todas" ||
          (Array.isArray(product.categories) &&
            product.categories.includes(selectedCategory));

        let matchesEditedToday = true;
        if (onlyEditedToday) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const updateDate = product.createdAt
            ? new Date(product.createdAt)
            : null;
          matchesEditedToday = updateDate ? updateDate >= today : false;
        }

        return matchesSearch && matchesCategory && matchesEditedToday;
      }),
    [products, searchTerm, selectedCategory, onlyEditedToday]
  );

  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    arr.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "price") {
        comparison = a.price - b.price;
      } else if (sortField === "stock") {
        comparison = a.stock - b.stock;
      } else if (sortField === "category") {
        const aCat =
          Array.isArray(a.categories) && a.categories.length > 0
            ? a.categories[0]
            : "";
        const bCat =
          Array.isArray(b.categories) && b.categories.length > 0
            ? b.categories[0]
            : "";
        comparison = aCat.localeCompare(bCat);
      } else if (sortField === "createdAt") {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = aTime - bTime;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return arr;
  }, [filteredProducts, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, onlyEditedToday]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Eliminar producto",
      message: `¿Estás seguro de que deseas eliminar el producto "${name}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (confirmed) {
      deleteProduct(id);
      showToast(`Producto "${name}" eliminado correctamente`, "success");
    }
  };

  const exportSuffix = () => {
    if (onlyEditedToday) return "-editados-hoy";
    if (searchTerm || selectedCategory !== "Todas") return "-filtrado";
    return "";
  };

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.isActive).length;
    const featured = products.filter((p) => p.featured).length;
    const lowStock = products.filter((p) => p.stock <= 10).length;
    return { total, active, featured, lowStock };
  }, [products]);

  if (categoriesLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <span className="animate-pulse">Cargando categorías...</span>
      </div>
    );
  }
  if (!categories || categories.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No se encontraron categorías.{" "}
        <Link
          href="/admin/categorias"
          className="text-emerald-700 hover:underline"
        >
          Crear una categoría
        </Link>
      </div>
    );
  }

  const SortHeader = ({
    field,
    children,
    align = "left",
  }: {
    field: SortField;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => {
    const active = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`inline-flex items-center gap-1 focus:outline-none ${
          align === "right" ? "ml-auto" : ""
        }`}
      >
        {children}
        {active &&
          (sortDirection === "asc" ? (
            <ArrowUpIcon className="h-3 w-3" />
          ) : (
            <ArrowDownIcon className="h-3 w-3" />
          ))}
      </button>
    );
  };

  const columns: Column<ProductUI>[] = [
    {
      key: "name",
      header: <SortHeader field="name">Producto</SortHeader>,
      cell: (p) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const updateDate = p.createdAt ? new Date(p.createdAt) : null;
        const editedToday = !!updateDate && updateDate >= today;
        return (
          <div className="flex items-center">
            <div className="h-14 w-14 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden ring-1 ring-gray-100 p-1.5">
              <ImageWithFallback
                className="h-full w-full object-contain mix-blend-multiply"
                src={p.image}
                alt={p.name}
              />
            </div>
            <div className="ml-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-gray-900 tracking-tight truncate">
                  {p.name}
                </span>
                {editedToday && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase tracking-tighter rounded-md">
                    Editado hoy
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                ID: {p.id.substring(0, 8)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      header: <SortHeader field="category">Categoría</SortHeader>,
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(p.categories) && p.categories.length > 0 ? (
            p.categories.map((cat, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-md"
              >
                {cat}
              </span>
            ))
          ) : (
            <span className="italic text-gray-300 text-[10px] font-bold uppercase tracking-widest">
              Sin categoría
            </span>
          )}
        </div>
      ),
    },
    {
      key: "price",
      header: <SortHeader field="price">Precio</SortHeader>,
      cell: (p) => (
        <span className="text-sm font-black text-gray-900">
          ${p.price.toLocaleString("es-CL")}
        </span>
      ),
      align: "right",
    },
    {
      key: "stock",
      header: <SortHeader field="stock">Stock</SortHeader>,
      cell: (p) => (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ${
            p.stock > 10
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : p.stock > 0
              ? "bg-amber-50 text-amber-700 ring-amber-100"
              : "bg-rose-50 text-rose-700 ring-rose-100"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              p.stock > 10
                ? "bg-emerald-500"
                : p.stock > 0
                ? "bg-amber-500"
                : "bg-rose-500 animate-pulse"
            }`}
          />
          {p.stock} u.
        </div>
      ),
    },
    {
      key: "featured",
      header: "Destacado",
      cell: (p) => (
        <button
          onClick={async () => {
            try {
              await toggleFeatured(p.id, !p.featured);
              showToast(
                !p.featured ? "Producto destacado ✨" : "Quitado de destacados",
                "success"
              );
            } catch {
              showToast("No se pudo actualizar", "error");
            }
          }}
          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ring-1 min-h-[36px] ${
            p.featured
              ? "bg-amber-500 text-white ring-amber-500 shadow shadow-amber-500/20"
              : "bg-white text-gray-500 ring-gray-200 hover:ring-amber-200 hover:text-amber-700"
          }`}
        >
          {p.featured ? "Destacado" : "Normal"}
        </button>
      ),
      hideOnMobile: true,
    },
    {
      key: "active",
      header: "Activo",
      cell: (p) => (
        <button
          onClick={async () => {
            try {
              await toggleActive(p.id, !p.isActive);
              showToast(
                !p.isActive ? "Producto activado ✓" : "Producto desactivado",
                "success"
              );
            } catch {
              showToast("No se pudo actualizar", "error");
            }
          }}
          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ring-1 min-h-[36px] ${
            p.isActive
              ? "bg-emerald-100 text-emerald-700 ring-emerald-200 hover:bg-emerald-200"
              : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200"
          }`}
        >
          {p.isActive ? "Activo" : "Inactivo"}
        </button>
      ),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/productos/${p.id}`}
            className="size-9 inline-flex items-center justify-center bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-700 hover:text-white transition-all shadow-sm"
            title="Editar"
          >
            <PencilIcon className="size-4" />
          </Link>
          <button
            onClick={() => handleDeleteProduct(p.id, p.name)}
            className="size-9 inline-flex items-center justify-center bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-700 hover:text-white transition-all shadow-sm"
            title="Eliminar"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (p: ProductUI) => (
    <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 space-y-3">
      <div className="flex gap-3">
        <div className="h-20 w-20 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden ring-1 ring-gray-100">
          <ImageWithFallback
            className="h-full w-full object-cover"
            src={p.image}
            alt={p.name}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{p.name}</h3>
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
            {p.description}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-emerald-700">
              ${p.price.toLocaleString("es-CL")}
            </span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                p.stock > 10
                  ? "bg-emerald-100 text-emerald-700"
                  : p.stock > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-rose-100 text-rose-700"
              }`}
            >
              {p.stock} u.
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={() => toggleFeatured(p.id, !p.featured)}
            className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg ring-1 transition-colors min-h-[36px] ${
              p.featured
                ? "bg-amber-50 ring-amber-200 text-amber-700"
                : "bg-gray-50 ring-gray-200 text-gray-500"
            }`}
          >
            ★ {p.featured ? "Destacado" : "Normal"}
          </button>
          <button
            onClick={() => toggleActive(p.id, !p.isActive)}
            className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg ring-1 transition-colors min-h-[36px] ${
              p.isActive
                ? "bg-emerald-50 ring-emerald-200 text-emerald-700"
                : "bg-gray-50 ring-gray-200 text-gray-500"
            }`}
          >
            {p.isActive ? "Activo" : "Inactivo"}
          </button>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/productos/${p.id}`}
            className="p-2 text-blue-700 bg-blue-50 rounded-lg min-h-[36px] min-w-[36px] inline-flex items-center justify-center"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
          <button
            onClick={() => handleDeleteProduct(p.id, p.name)}
            className="p-2 text-rose-700 bg-rose-50 rounded-lg min-h-[36px] min-w-[36px]"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Catálogo"
          title="Gestión de Productos"
          subtitle="Control total sobre el catálogo de Olivo Market"
          icon={<ShoppingBagIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  exportToExcel(
                    filteredProducts,
                    `inventario-olivo${exportSuffix()}.xlsx`
                  )
                }
                className="px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/15 transition-all inline-flex items-center gap-2 min-h-[36px]"
                title="Exportar a Excel"
              >
                <DocumentArrowDownIcon className="size-4 text-emerald-300" />
                Excel
              </button>
              <button
                onClick={() =>
                  exportToCSV(
                    filteredProducts,
                    `inventario-olivo${exportSuffix()}.csv`
                  )
                }
                className="px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/15 transition-all inline-flex items-center gap-2 min-h-[36px]"
                title="Exportar a CSV"
              >
                <DocumentArrowDownIcon className="size-4 text-sky-300" />
                CSV
              </button>
              <button
                onClick={() =>
                  exportToPDF(
                    filteredProducts,
                    `inventario-olivo${exportSuffix()}.pdf`
                  )
                }
                className="px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/15 transition-all inline-flex items-center gap-2 min-h-[36px]"
                title="Exportar a PDF"
              >
                <DocumentArrowDownIcon className="size-4 text-rose-300" />
                PDF
              </button>
              <Link href="/admin/productos/edicion-masiva">
                <button className="px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/15 transition-all inline-flex items-center gap-2 min-h-[36px]">
                  <Squares2X2Icon className="size-4" />
                  Masivo
                </button>
              </Link>
              <Link href="/admin/productos/imagenes">
                <button className="px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/15 transition-all inline-flex items-center gap-2 min-h-[36px]">
                  <PhotoIcon className="size-4" />
                  Imágenes
                </button>
              </Link>
              <Link href="/admin/productos/nuevo">
                <button className="px-4 py-2 bg-emerald-500 rounded-xl text-emerald-950 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 min-h-[36px]">
                  <PlusIcon className="size-4" />
                  Nuevo
                </button>
              </Link>
            </div>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Total productos"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<ShoppingBagIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Activos"
          value={stats.active.toLocaleString()}
          tone="emerald"
          icon={<CheckBadgeIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Destacados"
          value={stats.featured.toLocaleString()}
          tone="amber"
          icon={<StarIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Stock bajo"
          value={stats.lowStock.toLocaleString()}
          tone="rose"
          hint="≤ 10 unidades"
        />
      </StatsRow>

      <div className="bg-white p-4 sm:p-5 rounded-2xl ring-1 ring-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div className="md:col-span-2 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <FunnelIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
            <select
              className="block w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="Todas">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyEditedToday(!onlyEditedToday)}
              className={`flex-1 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 min-h-[44px] ${
                onlyEditedToday
                  ? "bg-emerald-500 text-white ring-emerald-500 shadow shadow-emerald-500/20"
                  : "bg-gray-50 text-gray-500 ring-transparent hover:bg-gray-100"
              }`}
            >
              {onlyEditedToday ? "✓ Editados Hoy" : "Editados Hoy"}
            </button>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("Todas");
                setOnlyEditedToday(false);
                setCurrentPage(1);
                showToast("Filtros limpiados", "info");
              }}
              className="px-4 py-3 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all min-h-[44px]"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <span className="text-emerald-700">Catálogo actual</span>
          <span className="h-1 w-1 rounded-full bg-gray-300" />
          <span>
            {filteredProducts.length === 0
              ? "Sin resultados"
              : `${filteredProducts.length} productos encontrados`}
          </span>
        </div>
      </div>

      <ResponsiveTable<ProductUI>
        columns={columns}
        rows={currentItems}
        rowKey={(p) => p.id}
        renderMobileCard={renderMobileCard}
        emptyState={
          <EmptyState
            icon={<ShoppingBagIcon className="h-7 w-7" />}
            title="No se encontraron productos"
            description="Ajustá la búsqueda, cambiá la categoría o creá un nuevo producto."
            cta={
              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("Todas");
                    setOnlyEditedToday(false);
                  }}
                  variant="secondary"
                >
                  Limpiar filtros
                </Button>
                <Link href="/admin/productos/nuevo">
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Crear producto
                  </Button>
                </Link>
              </div>
            }
          />
        }
      />

      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 ring-1 ring-gray-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-bold">{indexOfFirstItem + 1}</span> a{" "}
            <span className="font-bold">
              {Math.min(indexOfLastItem, filteredProducts.length)}
            </span>{" "}
            de <span className="font-bold">{filteredProducts.length}</span>
          </p>
          <nav
            className="inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
          >
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-200 bg-white text-sm font-medium ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="sr-only">Anterior</span>
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => paginate(index + 1)}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium ${
                  currentPage === index + 1
                    ? "z-10 bg-emerald-50 border-emerald-500 text-emerald-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {index + 1}
              </button>
            ))}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-200 bg-white text-sm font-medium ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="sr-only">Siguiente</span>
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </nav>
        </div>
      )}
    </PageShell>
  );
}
