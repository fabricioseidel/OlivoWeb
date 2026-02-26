"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import { useCategories } from "@/hooks/useCategories";
import Button from "@/components/ui/Button";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import MultiImageUpload from "@/components/ui/MultiImageUpload";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";


interface FormState {
  name: string;
  price: string;
  image: string;
  description: string;
  categories: string[]; // Cambio: ahora es array
  stock: string;
  featured: boolean;
  gallery: string[];
  features: string;
  slug: string;
  measurementUnit: string;
  measurementValue: string;
  suggestedPrice: string;
  offerPrice: string;
  isActive: boolean;
  barcode: string;
}

export default function EditProductPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { getProductById, updateProduct, deleteProduct } = useProducts();
  const { categories } = useCategories();
  const { showToast } = useToast();
  const product = getProductById(id);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado para proveedores
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Estado para asignaciones de proveedores
  const [productSuppliers, setProductSuppliers] = useState<{
    supplierId: string;
    supplierName: string;
    priceWithoutVat: number;
    priceWithVat: number;
  }[]>([]);

  // Para rastrear eliminaciones
  const [initialSupplierIds, setInitialSupplierIds] = useState<string[]>([]);

  // Estado temporal para agregar proveedor
  const [tempSupplier, setTempSupplier] = useState({
    supplierId: "",
    priceWithVat: "",
    priceWithoutVat: "",
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        price: product.price.toString(),
        image: product.image,
        description: product.description,
        categories: product.categories || [], // Usar categories del producto
        stock: product.stock.toString(),
        featured: Boolean(product.featured),
        gallery: product.gallery || [],
        features: (product.features || []).join("\n"),
        slug: product.slug,
        measurementUnit: product.measurementUnit || "ml",
        measurementValue: product.measurementValue?.toString() || "",
        suggestedPrice: product.suggestedPrice?.toString() || "",
        offerPrice: product.offerPrice?.toString() || "",
        isActive: Boolean(product.isActive),
        barcode: product.id, // Assuming ID is barcode as per context
      });
      setLoading(false);
    } else {
      // Si no está en el contexto, podría estar cargando o no existir
      // Por ahora asumimos que si useProducts ya cargó, y no está, es que no existe
      // Pero useProducts podría no haber terminado. 
      // Simplificación: si pasaron 2 segundos y no hay producto, mostrar error?
      // Mejor: el componente padre debería manejar la carga inicial de productos.
      if (loading) {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [product, loading]);

  useEffect(() => {
    // Cargar proveedores y asignaciones
    const fetchData = async () => {
      try {
        setLoadingSuppliers(true);
        // 1. Cargar lista de proveedores
        const resSuppliers = await fetch('/api/admin/suppliers');
        if (resSuppliers.ok) {
          const data = await resSuppliers.json();
          setSuppliers(data);
        }

        // 2. Cargar asignaciones actuales del producto
        if (id) {
          const resAssignments = await fetch(`/api/admin/product-suppliers?productId=${id}`);
          if (resAssignments.ok) {
            const assignments = await resAssignments.json();
            const mappedAssignments = assignments.map((a: any) => ({
              supplierId: a.supplier_id,
              supplierName: a.supplier?.name || 'Desconocido',
              priceWithoutVat: Number(a.unit_cost || 0),
              priceWithVat: Number(a.unit_cost || 0) * 1.19,
            }));
            setProductSuppliers(mappedAssignments);
            setInitialSupplierIds(mappedAssignments.map((a: any) => a.supplierId));
          }
        }
      } catch (error) {
        console.error("Error loading supplier data:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchData();
  }, [id]);

  // Lógica de cálculo de precios con/sin IVA
  const handlePriceCalculation = (field: 'with' | 'without', value: string) => {
    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      setTempSupplier(prev => ({
        ...prev,
        priceWithVat: field === 'with' ? value : prev.priceWithVat,
        priceWithoutVat: field === 'without' ? value : prev.priceWithoutVat,
      }));
      return;
    }

    if (field === 'with') {
      const withoutVat = numValue / 1.19;
      setTempSupplier(prev => ({
        ...prev,
        priceWithVat: value,
        priceWithoutVat: withoutVat.toFixed(2),
      }));

      // Calcular precio sugerido: (Precio Compra con IVA) / 0.65
      const suggested = numValue / 0.65;
      setForm(prev => prev ? ({ ...prev, suggestedPrice: suggested.toFixed(0) }) : prev);

    } else {
      const withVat = numValue * 1.19;
      setTempSupplier(prev => ({
        ...prev,
        priceWithoutVat: value,
        priceWithVat: withVat.toFixed(2),
      }));

      // Calcular precio sugerido: (Precio Compra con IVA) / 0.65
      const suggested = withVat / 0.65;
      setForm(prev => prev ? ({ ...prev, suggestedPrice: suggested.toFixed(0) }) : prev);
    }
  };

  const addSupplier = () => {
    if (!tempSupplier.supplierId) {
      showToast("Selecciona un proveedor", "error");
      return;
    }
    if (!tempSupplier.priceWithoutVat || isNaN(parseFloat(tempSupplier.priceWithoutVat))) {
      showToast("Ingresa un precio válido", "error");
      return;
    }

    const supplier = suppliers.find(s => s.id === tempSupplier.supplierId);
    if (!supplier) return;

    if (productSuppliers.some(ps => ps.supplierId === tempSupplier.supplierId)) {
      showToast("Este proveedor ya está agregado", "warning");
      return;
    }

    setProductSuppliers(prev => [...prev, {
      supplierId: supplier.id,
      supplierName: supplier.name,
      priceWithoutVat: parseFloat(tempSupplier.priceWithoutVat),
      priceWithVat: parseFloat(tempSupplier.priceWithVat),
    }]);

    setTempSupplier({
      supplierId: "",
      priceWithVat: "",
      priceWithoutVat: "",
    });
  };

  const removeSupplier = (supplierId: string) => {
    setProductSuppliers(prev => prev.filter(ps => ps.supplierId !== supplierId));
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!product || !form) {
    return <div className="p-6">Producto no encontrado.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => prev ? ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }) : prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    // Validaciones básicas
    if (!form.name.trim()) { showToast('Nombre requerido', 'error'); return; }
    if (!form.price || isNaN(Number(form.price))) { showToast('Precio inválido', 'error'); return; }
    if (form.categories.length === 0) { showToast('Debe seleccionar al menos una categoría', 'error'); return; }

    setSaving(true);
    try {
      const uploadIfDataUrl = async (img?: string) => {
        if (!img) return img;
        if (img.startsWith('data:image')) {
          const res = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: img }),
          });
          if (res.ok) {
            const j = await res.json().catch(() => null);
            return j?.url || img;
          }
          return img;
        }
        return img;
      };

      const imageUrl = await uploadIfDataUrl(form.image);
      const galleryUrls = await Promise.all((form.gallery || []).map(g => uploadIfDataUrl(g)));

      await updateProduct(product.id, {
        name: form.name.trim(),
        price: Number(form.price),
        image: imageUrl,
        description: form.description.trim(),
        categories: form.categories,
        stock: Number(form.stock) || 0,
        featured: form.featured,
        gallery: galleryUrls,
        features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
        slug: form.slug.trim(),
        measurementUnit: form.measurementUnit,
        measurementValue: parseFloat(form.measurementValue) || 0,
        suggestedPrice: parseFloat(form.suggestedPrice) || 0,
        offerPrice: parseFloat(form.offerPrice) || undefined,
        isActive: form.isActive,
      });

      // Sincronizar proveedores
      // 1. Eliminar los que estaban y ya no están
      const toRemove = initialSupplierIds.filter(id => !productSuppliers.some(ps => ps.supplierId === id));
      await Promise.all(toRemove.map(supplierId =>
        fetch("/api/admin/product-suppliers", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, supplierId }),
        })
      ));

      // 2. Guardar/Actualizar los actuales
      await Promise.all(productSuppliers.map(ps =>
        fetch("/api/admin/product-suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            supplierId: ps.supplierId,
            priority: 1,
            unitCost: ps.priceWithoutVat,
            notes: "Actualizado desde edición de producto"
          }),
        })
      ));

      showToast('Producto actualizado', 'success');
      router.push('/admin/productos');
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      deleteProduct(product.id);
      showToast('Producto eliminado', 'success');
      router.push('/admin/productos');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Producto</h1>
        <div className="space-x-2">
          <Button variant="secondary" onClick={() => router.push('/admin/productos')}>Volver</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
              <input name="barcode" value={form.barcode} disabled className="w-full p-2 border rounded-md bg-gray-100 text-gray-500" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Medida</label>
                <input
                  name="measurementValue"
                  type="number"
                  value={form.measurementValue}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 1.5"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <select
                  name="measurementUnit"
                  value={form.measurementUnit}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                >
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="un">un</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta *</label>
            <input name="price" value={form.price} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Sugerido</label>
            <input name="suggestedPrice" value={form.suggestedPrice} disabled className="w-full p-2 border rounded-md bg-gray-100 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio Oferta</label>
            <input name="offerPrice" value={form.offerPrice} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
            <input name="stock" value={form.stock} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <input id="featured" type="checkbox" name="featured" checked={form.featured} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">Destacado</label>
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <input id="isActive" type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Producto Activo</label>
          </div>
        </div>

        {/* Sección de Proveedores */}
        <div className="border-t pt-4 mt-2">
          <h3 className="text-md font-medium text-gray-900 mb-3">Proveedores y Costos</h3>

          <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                  value={tempSupplier.supplierId}
                  onChange={(e) => setTempSupplier(prev => ({ ...prev, supplierId: e.target.value }))}
                  disabled={loadingSuppliers}
                >
                  <option value="">Seleccionar...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Precio Compra (Con IVA)</label>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                  value={tempSupplier.priceWithVat}
                  onChange={(e) => handlePriceCalculation('with', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Precio Compra (Sin IVA)</label>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                  value={tempSupplier.priceWithoutVat}
                  onChange={(e) => handlePriceCalculation('without', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Button type="button" onClick={addSupplier} className="w-full flex justify-center items-center">
                  <PlusIcon className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Ingresa el precio con o sin IVA, el otro se calculará automáticamente (IVA 19%).
            </p>
          </div>

          {/* Lista de proveedores agregados */}
          {productSuppliers.length > 0 ? (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-2 pl-4 pr-3 text-left text-xs font-medium text-gray-500 sm:pl-6">Proveedor</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Costo (Sin IVA)</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">Costo (Con IVA)</th>
                    <th scope="col" className="relative py-2 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Eliminar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {productSuppliers.map((ps) => (
                    <tr key={ps.supplierId}>
                      <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{ps.supplierName}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">${ps.priceWithoutVat.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">${ps.priceWithVat.toFixed(2)}</td>
                      <td className="whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          type="button"
                          onClick={() => removeSupplier(ps.supplierId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic text-center py-2">No hay proveedores asignados.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categorías *</label>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
            {categories.length > 0 ? categories.map(c => (
              <label key={c.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={form.categories.includes(c.name)}
                  onChange={e => {
                    if (e.target.checked) {
                      setForm(prev => prev ? { ...prev, categories: [...prev.categories, c.name] } : prev);
                    } else {
                      setForm(prev => prev ? { ...prev, categories: prev.categories.filter(cat => cat !== c.name) } : prev);
                    }
                  }}
                />
                <span className="text-sm text-gray-700">{c.name}</span>
              </label>
            )) : (
              <span className="italic text-gray-400">No hay categorías disponibles</span>
            )}
          </div>
          {form.categories.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-600">
                Seleccionadas: <span className="font-medium">{form.categories.join(", ")}</span>
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
          <textarea name="description" rows={4} value={form.description} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Imagen principal</label>
          <SingleImageUpload value={form.image} onChange={(val) => setForm(prev => prev ? { ...prev, image: val || '' } : prev)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Galería</label>
          <MultiImageUpload values={form.gallery} onChange={(arr) => setForm(prev => prev ? { ...prev, gallery: arr } : prev)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Características (una por línea)</label>
          <textarea name="features" rows={4} value={form.features} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Button>
        </div>
      </form>
    </div>
  );
}
