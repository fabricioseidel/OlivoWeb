import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { successResponse, errorResponse } from "@/lib/api-response";

interface UberEatsProductInput {
  barcode: string;
  name: string;
  originalCategory?: string;
  uberCategory?: string;
  uberCategories?: string[];
  price: number;
  priceWithVat?: number;
  vatPercentage?: number;
  description?: string;
  imageUrl?: string;
  productType?: string;
  hfssItem?: string;
  alcoholUnits?: number | null;
  quantityRestriction?: number | null;
  inStock?: boolean;
  measurementUnit?: string;
  measurementValue?: number;
  isValid?: boolean;
  validationErrors?: string[];
  modified?: boolean;
  excluded?: boolean;
}

// POST: Sincronizar productos con Supabase
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse(new Error("Unauthorized"), 401);
    }

    const body = await request.json();
    const { products, action } = body as { 
      products?: UberEatsProductInput[];
      action?: 'sync' | 'upsert' | 'sync_from_main';
    };

    // Acción: Sincronizar desde tabla products principal
    if (action === 'sync_from_main') {
      const { data, error } = await supabaseAdmin.rpc('sync_uber_eats_from_products');
      if (error) {
        console.error('Error syncing from main products:', error);
        throw error;
      }
      return successResponse({ 
        message: 'Sincronización completada',
        synced: data 
      });
    }

    // Validar que hay productos
    if (!products || !Array.isArray(products) || products.length === 0) {
      return errorResponse(new Error("No products provided"), 400);
    }

    // Preparar datos para upsert
    const upsertData = products.map(p => ({
      barcode: p.barcode,
      name: p.name,
      original_category: p.originalCategory || null,
      uber_category: p.uberCategory || null,
      uber_categories: p.uberCategories || [],
      price: p.price,
      price_with_vat: p.priceWithVat || p.price,
      vat_percentage: p.vatPercentage || 19.0,
      description: p.description || null,
      image_url: p.imageUrl || null,
      product_type: p.productType || null,
      hfss_item: p.hfssItem || null,
      alcohol_units: p.alcoholUnits || null,
      quantity_restriction: p.quantityRestriction || null,
      in_stock: p.inStock ?? true,
      measurement_unit: p.measurementUnit || 'un',
      measurement_value: p.measurementValue || 1,
      is_valid: p.isValid ?? true,
      validation_errors: p.validationErrors || [],
      modified: p.modified ?? false,
      excluded: p.excluded ?? false,
    }));

    // Upsert en lotes de 100
    const batchSize = 100;
    let totalUpserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < upsertData.length; i += batchSize) {
      const batch = upsertData.slice(i, i + batchSize);
      
      const { data, error } = await supabaseAdmin
        .from('uber_eats_products')
        .upsert(batch, { 
          onConflict: 'barcode',
          ignoreDuplicates: false 
        })
        .select('barcode');

      if (error) {
        console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        totalUpserted += data?.length || 0;
      }
    }

    if (errors.length > 0) {
      return successResponse({ 
        message: 'Sincronización parcial',
        synced: totalUpserted,
        errors 
      });
    }

    return successResponse({ 
      message: 'Sincronización completada exitosamente',
      synced: totalUpserted 
    });

  } catch (e: any) {
    console.error('Sync error:', e);
    return errorResponse(e);
  }
}

// GET: Obtener productos de Uber Eats desde Supabase
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse(new Error("Unauthorized"), 401);
    }

    const { searchParams } = new URL(request.url);
    const includeExcluded = searchParams.get('includeExcluded') === 'true';

    let query = supabaseAdmin
      .from('uber_eats_products')
      .select('*')
      .order('name', { ascending: true });

    if (!includeExcluded) {
      query = query.eq('excluded', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformar de snake_case a camelCase
    const items = (data || []).map(p => ({
      id: p.id,
      barcode: p.barcode,
      name: p.name,
      originalCategory: p.original_category,
      uberCategory: p.uber_category,
      uberCategories: p.uber_categories || [],
      price: p.price,
      priceWithVat: p.price_with_vat,
      vatPercentage: p.vat_percentage,
      description: p.description,
      imageUrl: p.image_url,
      productType: p.product_type,
      hfssItem: p.hfss_item,
      alcoholUnits: p.alcohol_units,
      quantityRestriction: p.quantity_restriction,
      inStock: p.in_stock,
      measurementUnit: p.measurement_unit,
      measurementValue: p.measurement_value,
      isValid: p.is_valid,
      validationErrors: p.validation_errors || [],
      modified: p.modified,
      excluded: p.excluded,
    }));

    return successResponse({ items });

  } catch (e: any) {
    console.error('GET uber-eats/sync error:', e);
    return errorResponse(e);
  }
}

// DELETE: Eliminar productos de la lista Uber Eats (marcar como excluidos)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse(new Error("Unauthorized"), 401);
    }

    const body = await request.json();
    const { barcodes, permanent } = body as { 
      barcodes: string[];
      permanent?: boolean;
    };

    if (!barcodes || !Array.isArray(barcodes) || barcodes.length === 0) {
      return errorResponse(new Error("No barcodes provided"), 400);
    }

    if (permanent) {
      // Eliminar permanentemente
      const { error } = await supabaseAdmin
        .from('uber_eats_products')
        .delete()
        .in('barcode', barcodes);

      if (error) throw error;
    } else {
      // Marcar como excluidos
      const { error } = await supabaseAdmin
        .from('uber_eats_products')
        .update({ excluded: true })
        .in('barcode', barcodes);

      if (error) throw error;
    }

    return successResponse({ 
      message: permanent ? 'Productos eliminados' : 'Productos excluidos',
      count: barcodes.length 
    });

  } catch (e: any) {
    console.error('DELETE uber-eats/sync error:', e);
    return errorResponse(e);
  }
}
