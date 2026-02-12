import { supabaseServer } from "@/lib/supabase-server";
import { ProductFormData } from "@/schemas/product.schema";
import { SupaProduct } from "@/types";

const PRODUCTS_TABLE = "products";
const PRIMARY_KEY = "id"; // TODO: ajustar si la llave real es otra (por ejemplo barcode)

export type ProductRecord = SupaProduct & { id?: string | number };

function mapFormToRow(data: ProductFormData) {
  return {
    name: data.nombre,
    category: data.categoria,
    description: data.descripcion ?? null,
    sale_price: data.precio,
    stock: data.stock,
    suggested_price: data.precioOriginal ?? null,
    barcode: data.barcode ?? null,
    image_url: data.image ?? null,
    gallery: data.gallery ?? null,
    is_active: data.isActive,
    featured: data.isFeatured,
    // Add other fields if DB supports them (e.g. sku, vendor, tags)
    // For now assuming 'features' stores tags/vendor or similar if needed, 
    // but sticking to known columns from SupaProduct.
  };
}

export async function getProducts(): Promise<ProductRecord[]> {
  const { data, error } = await supabaseServer
    .from(PRODUCTS_TABLE)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProductRecord[];
}

export async function getProductById(id: string): Promise<ProductRecord | null> {
  if (!id) return null;

  const { data, error } = await supabaseServer
    .from(PRODUCTS_TABLE)
    .select("*")
    .eq(PRIMARY_KEY, id)
    .maybeSingle();

  if (error) throw error;
  return (data as ProductRecord) ?? null;
}

export async function createProduct(data: ProductFormData): Promise<ProductRecord> {
  const payload = mapFormToRow(data);
  const { data: inserted, error } = await supabaseServer
    .from(PRODUCTS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return inserted as ProductRecord;
}

export async function updateProduct(
  id: string,
  data: ProductFormData,
): Promise<ProductRecord> {
  const payload = mapFormToRow(data);
  const { data: updated, error } = await supabaseServer
    .from(PRODUCTS_TABLE)
    .update(payload)
    .eq(PRIMARY_KEY, id)
    .select("*")
    .single();

  if (error) throw error;
  return updated as ProductRecord;
}

export async function deleteProduct(id: string): Promise<void> {
  if (!id) return;

  const { error } = await supabaseServer
    .from(PRODUCTS_TABLE)
    .delete()
    .eq(PRIMARY_KEY, id);

  if (error) throw error;
}
