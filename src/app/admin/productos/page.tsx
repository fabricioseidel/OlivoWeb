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
} from "@heroicons/react/24/outline";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import Button from "@/components/ui/Button";
import { useProducts } from "@/contexts/ProductContext";
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

// Categorías disponibles
import { useCategories } from "@/hooks/useCategories";

export default function AdminProductsPage() {
  const { products, deleteProduct, toggleFeatured, toggleActive } = useProducts();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { categories, loading: categoriesLoading } = useCategories();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Filtrar productos por término de búsqueda y categoría
  const filteredProducts = useMemo(() => (
    products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "Todas" || (Array.isArray(product.categories) && product.categories.includes(selectedCategory));
      return matchesSearch && matchesCategory;
    })
  ), [products, searchTerm, selectedCategory]);

  // Ordenar productos
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === "price") {
      comparison = a.price - b.price;
    } else if (sortField === "stock") {
      comparison = a.stock - b.stock;
    } else if (sortField === "category") {
      // Ordenar por la primera categoría si hay varias
      const aCat = Array.isArray(a.categories) && a.categories.length > 0 ? a.categories[0] : "";
      const bCat = Array.isArray(b.categories) && b.categories.length > 0 ? b.categories[0] : "";
      comparison = aCat.localeCompare(bCat);
    } else if (sortField === "createdAt") {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      comparison = aTime - bTime;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Paginación
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);

  // Cambiar página
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Resetear a la primera página cuando cambian los filtros para evitar páginas vacías
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Cambiar ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Manejar eliminación de producto
  const handleDeleteProduct = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Eliminar producto",
      message: `¿Estás seguro de que deseas eliminar el producto "${name}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });

    if (confirmed) {
      deleteProduct(id);
      showToast(
        `Producto "${name}" eliminado correctamente`,
        "success"
      );
    }
  };

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
        No se encontraron categorías. <Link href="/admin/categorias" className="text-blue-600 hover:underline">Crear una categoría</Link>
      </div>
    );
  }
  return (
    <div className="-m-4 sm:-m-8">
      {/* Header Premium Admin */}
      <div className="bg-emerald-950 p-8 sm:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/5">
                    <ShoppingBagIcon className="size-3" />
                    <span>Inventario</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Gestión de Productos</h1>
                <p className="mt-2 text-emerald-100/50 font-medium italic">
                    Control total sobre el catálogo de Olivo Market
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button 
                    onClick={() => exportToExcel(products)}
                    className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                    <DocumentArrowDownIcon className="size-4 text-emerald-400" />
                    Excel
                </button>
                <button 
                    onClick={() => exportToPDF(products)}
                    className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                >
                    <DocumentArrowDownIcon className="size-4 text-rose-400" />
                    PDF
                </button>
                <Link href="/admin/productos/edicion-masiva">
                    <button className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                        📋 Edición Masiva
                    </button>
                </Link>
                <Link href="/admin/productos/nuevo">
                    <button className="px-6 py-3 bg-emerald-500 rounded-2xl text-emerald-950 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                        <PlusIcon className="size-4" />
                        Nuevo
                    </button>
                </Link>
            </div>
        </div>
      </div>

      <div className="px-8 pb-12">

        {/* Filtros y búsqueda Premium */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-2 relative">
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

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FunnelIcon className="h-4 w-4 text-emerald-500" />
                    </div>
                    <select
                        className="block w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
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

                <div className="flex items-center gap-3 justify-end">
                    <button
                        onClick={() => { setSearchTerm(""); setSelectedCategory("Todas"); setCurrentPage(1); showToast('Filtros limpiados', 'info'); }}
                        className="px-6 py-4 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all"
                    >
                        Limpiar
                    </button>
                </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">Catálogo Actual</span>
                    <div className="h-1 w-1 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                        {filteredProducts.length === 0
                            ? "Sin resultados"
                            : `${filteredProducts.length} productos encontrados`}
                    </span>
                </div>
            </div>
        </div>

      {/* Vista de Lista para Móviles */}
      <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
        {currentItems.map((product) => (
          <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex gap-4">
              <div className="h-20 w-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                <ImageWithFallback className="h-full w-full object-cover" src={product.image} alt={product.name} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate">{product.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{product.description}</p>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-600">${product.price.toFixed(2)}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-700' :
                      product.stock > 0 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                    {product.stock} un.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFeatured(product.id, !product.featured)}
                  className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-lg border transition-colors ${product.featured ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                >
                  ★ {product.featured ? 'Destacado' : 'Normal'}
                </button>
                <button
                  onClick={() => toggleActive(product.id, !product.isActive)}
                  className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-lg border transition-colors ${product.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                >
                  {product.isActive ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/admin/productos/${product.id}`}
                  className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                >
                  <PencilIcon className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDeleteProduct(product.id, product.name)}
                  className="p-2 text-red-600 bg-red-50 rounded-lg"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {currentItems.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Tabla de productos (Oculta en móviles, visible en tablets/escritorio) */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort("name")}
                  >
                    Producto
                    {sortField === "name" && (
                      sortDirection === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 ml-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort("category")}
                  >
                    Categoría
                    {sortField === "category" && (
                      sortDirection === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 ml-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort("price")}
                  >
                    Precio
                    {sortField === "price" && (
                      sortDirection === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 ml-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort("stock")}
                  >
                    Stock
                    {sortField === "stock" && (
                      sortDirection === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 ml-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destacado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort("createdAt")}
                  >
                    Fecha
                    {sortField === "createdAt" && (
                      sortDirection === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 ml-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentItems.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-16 w-16 flex-shrink-0 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 p-2 group-hover:scale-105 transition-transform duration-500">
                        <ImageWithFallback className="h-full w-full object-contain mix-blend-multiply" src={product.image} alt={product.name} />
                      </div>
                      <div className="ml-6">
                        <div className="text-sm font-black text-gray-900 tracking-tight">{product.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">ID: {product.id.substring(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(product.categories) && product.categories.length > 0
                        ? product.categories.map((cat, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                {cat}
                            </span>
                          ))
                        : <span className="italic text-gray-300 text-[10px] font-bold uppercase tracking-widest">Sin categoría</span>}
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="text-sm font-black text-gray-900">${product.price.toLocaleString('es-CL')}</div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        product.stock > 10 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        product.stock > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                        'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                        <div className={`size-1.5 rounded-full ${
                            product.stock > 10 ? 'bg-emerald-500' : 
                            product.stock > 0 ? 'bg-amber-500' : 
                            'bg-rose-500 animate-pulse'
                        }`} />
                        {product.stock} unids.
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <button
                      onClick={async () => {
                        try {
                          await toggleFeatured(product.id, !product.featured);
                          showToast(
                            !product.featured ? 'Producto destacado ✨' : 'Quitado de destacados',
                            'success'
                          );
                        } catch {
                          showToast('No se pudo actualizar', 'error');
                        }
                      }}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${product.featured
                          ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                          : 'bg-white text-gray-400 border-gray-100 hover:border-amber-200 hover:text-amber-500'
                        }`}
                    >
                      {product.featured ? 'Destacado' : 'Normal'}
                    </button>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <button
                      onClick={async () => {
                        try {
                          await toggleActive(product.id, !product.isActive);
                          showToast(
                            !product.isActive ? 'Producto activado ✓' : 'Producto desactivado ×',
                            'success'
                          );
                        } catch {
                          showToast('No se pudo actualizar', 'error');
                        }
                      }}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${product.isActive
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/productos/${product.id}`}
                        className="size-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Editar"
                      >
                        <PencilIcon className="size-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="size-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        title="Eliminar"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {currentItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-medium text-gray-700">No se encontraron productos</span>
                      <span className="text-xs text-gray-500">Ajusta la búsqueda, cambia la categoría o crea un nuevo producto.</span>
                      <div className="flex gap-2">
                        <Button onClick={() => { setSearchTerm(""); setSelectedCategory("Todas"); }} variant="secondary">Limpiar filtros</Button>
                        <Link href="/admin/productos/nuevo" className="inline-flex">
                          <Button>
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Crear producto
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredProducts.length)}
                  </span>{" "}
                  de <span className="font-medium">{filteredProducts.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-500 hover:bg-gray-50"
                      }`}
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => paginate(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${currentPage === index + 1
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      {index + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-500 hover:bg-gray-50"
                      }`}
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
