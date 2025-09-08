import { supabase } from '@/lib/supabase';

export type SupaProduct = {
  barcode: string;
  name: string | null;
  category: string | null;
  purchase_price: number | null;
  sale_price: number | null;
  expiry_date: string | null;
  stock: number | null;
  updated_at?: string; // timestamptz
  image_url?: string | null; // requires products.image_url column
  gallery?: any | null; // optional JSONB array of strings
};

export type ProductUI = {
  id: string;
  name: string;
  price: number;
  priceOriginal?: number;
  image: string;
  slug: string;
  description: string;
  categories: string[];
  gallery?: string[];
  features?: string[];
  stock: number;
  featured?: boolean;
  createdAt?: string;
  views?: number;
  viewCount?: number;
  orderClicks?: number;
};

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function imgFallback(_cat?: string | null) {
  return "/uploads/upload-1755295276091-ywcxpk.png";
}


export function mapSupaToUI(p: SupaProduct): ProductUI {
  const name = p.name ?? '(Sin nombre)';
  const category = p.category ?? '';
  const cats = category
    ? category.split(/[,/|]/).map((c) => c.trim()).filter(Boolean)
    : [];
  const img = (p as any).image_url as string | null | undefined;
  const gallery = Array.isArray((p as any).gallery) ? (p as any).gallery as string[] : undefined;
  return {
    id: String(p.barcode),
    name,
    price: Number(p.sale_price ?? 0),
    priceOriginal: undefined,
    image: img || imgFallback(category),
    slug: slug(name),
    description: '',
    categories: cats,
    gallery,
    stock: Number(p.stock ?? 0),
    featured: false,
    createdAt: p.updated_at ?? undefined,
    views: 0,
    viewCount: 0,
    orderClicks: 0,
  };
}

export async function fetchAllProducts(): Promise<ProductUI[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data || []).map(mapSupaToUI);
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
  return (data || []).map(mapSupaToUI);
}

export async function upsertProductToCloud(p: SupaProduct) {
  const { error } = await supabase.from('products').upsert(
    [{
      barcode: p.barcode,
      name: p.name ?? null,
      category: p.category ?? null,
      purchase_price: p.purchase_price ?? 0,
      sale_price: p.sale_price ?? 0,
      expiry_date: p.expiry_date ?? null,
      stock: p.stock ?? 0,
      updated_at: new Date().toISOString(),
  image_url: (p as any).image_url ?? (p as any).image ?? null,
  gallery: Array.isArray((p as any).gallery) ? (p as any).gallery : null,
    }],
    { onConflict: 'barcode' }
  );
  if (error) throw error;
}

export async function deleteProductFromCloud(barcode: string) {
  const { error } = await supabase.from('products').delete().eq('barcode', barcode);
  if (error) throw error;
}
