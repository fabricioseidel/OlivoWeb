"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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
  
  // Estado para el formulario
  const [formData, setFormData] = useState<{ 
    name: string;
    description: string;
    price: string;
    stock: string;
    categories: string[]; // Cambiado a array de categorías
    featured: boolean;
    image: string;
    gallery: string[];
    features: string[];
  }>({
    name: "",
    description: "",
    price: "",
    stock: "",
    categories: [], // Inicializar como array vacío
    featured: false,
    image: "",
    gallery: [],
    features: ["", "", "", "", ""],
  });

  useEffect(() => {
    // No necesitamos auto-seleccionar categorías, el usuario las elegirá
  }, [categories]);
  
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

      // Preparar datos del producto
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        categories: formData.categories, // Cambio: usar categories en lugar de category
        featured: formData.featured,
        image: imageUrl,
        gallery: galleryUrls.filter(url => url && url.trim() !== ""),
        features: formData.features.filter(feature => feature.trim() !== ""),
        slug: formData.name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-'),
      };

      // Usar el contexto para añadir el producto
      addProduct(productData);

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
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      errors.description ? "border-red-300" : ""
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
                    label="Precio *"
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
                    label="Stock *"
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={handleChange}
                    error={errors.stock}
                  />
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
