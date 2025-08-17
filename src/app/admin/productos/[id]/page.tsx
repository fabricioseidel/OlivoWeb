"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeImageUrl } from '@/utils/image';
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import { useCategories } from "@/hooks/useCategories";
import Button from "@/components/ui/Button";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import MultiImageUpload from "@/components/ui/MultiImageUpload";

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

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        price: product.price.toString(),
        image: product.image,
        description: product.description,
        categories: product.categories || [], // Usar categories del producto
        stock: product.stock.toString(),
        featured: product.featured,
        gallery: product.gallery || [],
        features: (product.features || []).join("\n"),
        slug: product.slug,
      });
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [product]);

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

      updateProduct(product.id, {
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
      });
      showToast('Producto actualizado', 'success');
      // Redirigir de vuelta a la lista de productos después de actualizar
      router.push('/admin/productos');
    } catch (e) {
      showToast('Error al actualizar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    deleteProduct(product.id);
    showToast('Producto eliminado', 'success');
    router.push('/admin/productos');
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input name="slug" value={form.slug} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
            <input name="price" value={form.price} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
            <input name="stock" value={form.stock} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <input id="featured" type="checkbox" name="featured" checked={form.featured} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">Destacado</label>
          </div>
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
