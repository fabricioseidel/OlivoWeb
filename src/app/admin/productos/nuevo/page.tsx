"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import MultiImageUpload from "@/components/ui/MultiImageUpload";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import { useCategories } from "@/hooks/useCategories";
import { normalizeImageUrl } from '@/utils/image';

export default function NewProductPage() {
  const router = useRouter();
  const { addProduct } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

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

  // Estado temporal para agregar proveedor
  const [tempSupplier, setTempSupplier] = useState({
    supplierId: "",
    priceWithVat: "",
    priceWithoutVat: "",
  });

  // Estado para el formulario
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: string;
    stock: string;
    categories: string[];
    featured: boolean;
    image: string;
    gallery: string[];
    features: string[];
    measurementUnit: string;
    measurementValue: string;
    suggestedPrice: string;
    offerPrice: string;
    isActive: boolean;
    barcode: string;
  }>({
    name: "",
    description: "",
    price: "",
    stock: "",
    categories: [],
    featured: false,
    image: "",
    gallery: [],
    features: ["", "", "", "", ""],
    measurementUnit: "ml",
    measurementValue: "",
    suggestedPrice: "",
    offerPrice: "",
    isActive: false,
    barcode: "",
  });

  useEffect(() => {
    // Cargar proveedores
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const res = await fetch('/api/admin/suppliers');
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data);
        }
      } catch (error) {
        console.error("Error loading suppliers:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Estado para errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));

    // Limpiar error al editar el campo
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Manejar cambios en arrays (gallery, features)
  const handleArrayChange = (array: string, index: number, value: string) => {
    setFormData((prev) => {
      const newArray = [...prev[array as keyof typeof prev] as string[]];
      newArray[index] = value;
      return { ...prev, [array]: newArray };
    });
  };

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
      // Si ingresa con IVA, calculamos sin IVA (dividiendo por 1.19)
      const withoutVat = numValue / 1.19;
      setTempSupplier(prev => ({
        ...prev,
        priceWithVat: value,
        priceWithoutVat: withoutVat.toFixed(2),
      }));
      
      // Calcular precio sugerido: (Precio Compra con IVA) / 0.65
      const suggested = numValue / 0.65;
      setFormData(prev => ({ ...prev, suggestedPrice: suggested.toFixed(0) }));

    } else {
      // Si ingresa sin IVA, calculamos con IVA (multiplicando por 1.19)
      const withVat = numValue * 1.19;
      setTempSupplier(prev => ({
        ...prev,
        priceWithoutVat: value,
        priceWithVat: withVat.toFixed(2),
      }));

      // Calcular precio sugerido: (Precio Compra con IVA) / 0.65
      const suggested = withVat / 0.65;
      setFormData(prev => ({ ...prev, suggestedPrice: suggested.toFixed(0) }));
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

    // Verificar si ya existe
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

    // Resetear form temporal
    setTempSupplier({
      supplierId: "",
      priceWithVat: "",
      priceWithoutVat: "",
    });
  };

  const removeSupplier = (supplierId: string) => {
    setProductSuppliers(prev => prev.filter(ps => ps.supplierId !== supplierId));
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }

    if (!formData.description.trim()) {
      newErrors.description = "La descripción es obligatoria";
    }

    if (!formData.price.trim()) {
      newErrors.price = "El precio es obligatorio";
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = "El precio debe ser un número mayor que cero";
    }

    if (!formData.stock.trim()) {
      newErrors.stock = "El stock es obligatorio";
    } else if (isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0) {
      newErrors.stock = "El stock debe ser un número entero no negativo";
    }

    if (!formData.image.trim()) {
      newErrors.image = "La imagen principal es obligatoria";
    }

    if (formData.categories.length === 0) {
      newErrors.categories = "Debe seleccionar al menos una categoría";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // If image or gallery entries are data URLs, upload them to server to get /uploads/ URLs
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

      const imageUrl = await uploadIfDataUrl(formData.image);
      const galleryUrls = await Promise.all(formData.gallery.map(g => uploadIfDataUrl(g)));

      // Generar un ID único (barcode) para el producto si no existe
      const generatedId = `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const finalBarcode = formData.barcode.trim() || generatedId;

      // Preparar datos del producto
      const productData = {
        id: generatedId,
        barcode: finalBarcode,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        categories: formData.categories,
        featured: formData.featured,
        image: imageUrl,
        gallery: galleryUrls.filter(url => url && url.trim() !== ""),
        features: formData.features.filter(feature => feature.trim() !== ""),
        slug: formData.name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-'),
        measurement_unit: formData.measurementUnit,
        measurement_value: parseFloat(formData.measurementValue) || 0,
        suggested_price: parseFloat(formData.suggestedPrice) || 0,
        offer_price: parseFloat(formData.offerPrice) || null,
        is_active: formData.isActive,
      };

      // Usar el contexto para añadir el producto
      await addProduct(productData);

      // Guardar asignaciones de proveedores
      if (productSuppliers.length > 0) {
        try {
          await Promise.all(productSuppliers.map(ps =>
            fetch("/api/admin/product-suppliers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: generatedId,
                supplierId: ps.supplierId,
                priority: 1,
                unitCost: ps.priceWithoutVat, // Guardamos el precio sin IVA
                notes: "Asignado al crear el producto"
              }),
            })
          ));
        } catch (supplierError) {
          console.error("Error asignando proveedores:", supplierError);
          showToast("Producto creado, pero hubo errores asignando proveedores", "warning");
        }
      }

      // Mostrar mensaje de éxito
      showToast(`Producto "${productData.name}" creado correctamente`, "success");

      // Redireccionar a la lista de productos
      router.push("/admin/productos");
    } catch (error) {
      console.error("Error al crear producto:", error);
      showToast("Error al crear el producto. Inténtalo de nuevo.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center">
        <Link href="/admin/productos" className="mr-4">
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Producto</h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea un nuevo producto para tu tienda
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Información básica */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Información básica</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Nombre del producto *"
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Código de Barras (Opcional)"
                    id="barcode"
                    name="barcode"
                    type="text"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Dejar vacío para generar automáticamente"
                  />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        label="Medida"
                        id="measurementValue"
                        name="measurementValue"
                        type="number"
                        value={formData.measurementValue}
                        onChange={handleChange}
                        placeholder="Ej: 1.5"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                      <select
                        name="measurementUnit"
                        value={formData.measurementUnit}
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

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${errors.description ? "border-red-300" : ""
                      }`}
                    value={formData.description}
                    onChange={handleChange}
                  ></textarea>
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div>
                  <Input
                    label="Precio de Venta (Público) *"
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    error={errors.price}
                  />
                </div>

                <div>
                  <Input
                    label="Precio Sugerido (Calculado)"
                    id="suggestedPrice"
                    name="suggestedPrice"
                    type="number"
                    value={formData.suggestedPrice}
                    onChange={handleChange}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Input
                    label="Precio Oferta (Opcional)"
                    id="offerPrice"
                    name="offerPrice"
                    type="number"
                    step="0.01"
                    value={formData.offerPrice}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Input
                    label="Stock Inicial *"
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={handleChange}
                    error={errors.stock}
                  />
                </div>

                {/* Sección de Proveedores */}
                <div className="sm:col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Proveedores y Costos</h3>

                  <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
                        <select
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={tempSupplier.priceWithoutVat}
                          onChange={(e) => handlePriceCalculation('without', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Button type="button" size="sm" onClick={addSupplier} fullWidth>
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

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Categorías
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={formData.categories.includes(category.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                categories: [...prev.categories, category.name]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                categories: prev.categories.filter(c => c !== category.name)
                              }));
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        No hay categorías disponibles.
                        <Link href="/admin/categorias" className="text-blue-600 hover:text-blue-500">
                          Crear categorías primero
                        </Link>
                      </p>
                    )}
                  </div>
                  {formData.categories.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        Seleccionadas: <span className="font-medium">{formData.categories.join(", ")}</span>
                      </p>
                    </div>
                  )}
                  {errors.categories && (
                    <p className="mt-1 text-sm text-red-600">{errors.categories}</p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    id="featured"
                    name="featured"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.featured}
                    onChange={handleChange}
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">
                    Destacar este producto en la página principal
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Producto Activo (Visible en tienda)
                  </label>
                </div>
              </div>
            </div>

            {/* Imágenes */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Imágenes</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <SingleImageUpload
                    label="Imagen principal *"
                    value={formData.image}
                    onChange={(data) => setFormData(prev => ({ ...prev, image: data }))}
                    error={errors.image}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <MultiImageUpload
                    label="Galería (opcional)"
                    values={formData.gallery}
                    onChange={(arr) => setFormData(prev => ({ ...prev, gallery: arr }))}
                    maxImages={5}
                  />
                </div>
              </div>
            </div>

            {/* Características */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Características</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Características principales
                  </label>
                  <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <Input
                        key={index}
                        id={`feature-${index}`}
                        type="text"
                        value={feature}
                        onChange={(e) => handleArrayChange("features", index, e.target.value)}
                        placeholder={`Característica ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/productos")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || Object.keys(errors).length > 0}>
              {loading ? "Guardando..." : "Guardar Producto"}
            </Button>
            {Object.keys(errors).length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                Corrige los errores antes de guardar.
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
