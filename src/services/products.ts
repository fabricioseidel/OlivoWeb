import { supabase } from '@/lib/supabase';
import { slugify } from '@/utils/string-utils';
import { SupaProduct, ProductUI } from '@/types';

// Use a repo-shipped placeholder. Files under /public/uploads may exist locally but
// won't be present in Vercel unless committed, causing 404/next-image 400.
const DEFAULT_IMAGE = "/file.svg";

export function mapSupaToUI(p: SupaProduct): ProductUI {
  const name = p.name ?? '(Sin nombre)';
  const category = p.category ?? '';
  const cats = category
    ? category.split(/[,/|]/).map((c) => c.trim()).filter(Boolean)
    : [];
  
  // Handle JSONB fields safely
  const gallery = Array.isArray(p.gallery) ? p.gallery : undefined;
  const features = Array.isArray(p.features) ? p.features : undefined;

  const rawSalePrice = Number(p.sale_price ?? 0);
  const rawOfferPrice = p.offer_price ? Number(p.offer_price) : undefined;

  // NOTE: En esta tienda, `products.sale_price` se interpreta como precio FINAL (con IVA incluido).
  // No se debe volver a multiplicar por IVA aquí, porque produciría “doble IVA”.

  // Determine effective price and original price
  // If offer_price exists and is lower than sale_price, then:
  // - price (current) = offer_price
  // - priceOriginal (was) = sale_price
  let finalPrice = Math.round(rawSalePrice);
  let originalPrice: number | undefined = undefined;

  const offerPriceFinal = rawOfferPrice !== undefined ? Math.round(rawOfferPrice) : undefined;
  if (offerPriceFinal !== undefined && offerPriceFinal > 0 && offerPriceFinal < finalPrice) {
    originalPrice = finalPrice;
    finalPrice = offerPriceFinal;
  }

  return {
    id: String(p.barcode),
    name,
    price: finalPrice,
    priceOriginal: originalPrice,
    image: p.image_url || DEFAULT_IMAGE,
    slug: slugify(name),
    description: p.description || '',
    categories: cats,
    gallery,
    features,
    stock: Number(p.stock ?? 0),
    featured: !!p.featured,
    createdAt: p.updated_at,
    views: 0,
    viewCount: 0,
    orderClicks: 0,
    reorderThreshold: p.reorder_threshold ?? undefined,
    measurementUnit: p.measurement_unit ?? undefined,
    measurementValue: p.measurement_value ?? undefined,
    suggestedPrice: p.suggested_price ?? undefined,
    offerPrice: p.offer_price ?? undefined,
    // Back-compat: si is_active es null/undefined en registros antiguos,
    // considerarlo activo para que aparezcan en la tienda pública.
    isActive: p.is_active ?? true,
  };
}

export async function fetchAllProducts(): Promise<ProductUI[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1000);
  
  if (error) throw error;
  
  // Supabase returns data as any[], we cast to SupaProduct[] for safety
  return (data as unknown as SupaProduct[]).map(mapSupaToUI);
}

export async function searchProducts(query: string): Promise<ProductUI[]> {
  const q = query.trim();
  if (!q) return fetchAllProducts();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${q}%,barcode.ilike.%${q}%,category.ilike.%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data as unknown as SupaProduct[]).map(mapSupaToUI);
}

export async function saveProduct(p: Partial<SupaProduct> & { barcode: string }) {
  // Ensure we send the correct structure to the API
  const payload = {
    barcode: p.barcode,
    name: p.name ?? null,
    category: p.category ?? null,
    purchase_price: p.purchase_price ?? 0,
    sale_price: p.sale_price ?? 0,
    expiry_date: p.expiry_date ?? null,
    stock: p.stock ?? 0,
    updated_at: new Date().toISOString(),
    image_url: p.image_url ?? null,
    gallery: Array.isArray(p.gallery) ? p.gallery : null,
    featured: p.featured,
    reorder_threshold: p.reorder_threshold ?? null,
    description: p.description ?? null,
    features: Array.isArray(p.features) ? p.features : null,
    measurement_unit: p.measurement_unit ?? null,
    measurement_value: p.measurement_value ?? null,
    suggested_price: p.suggested_price ?? null,
    offer_price: p.offer_price ?? null,
    is_active: p.is_active ?? false,
    tax_rate: p.tax_rate ?? 19,
  };

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error saving product');
  }
}

export async function deleteProduct(barcode: string) {
  const res = await fetch(`/api/products?id=${encodeURIComponent(barcode)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error deleting product');
  }
}

