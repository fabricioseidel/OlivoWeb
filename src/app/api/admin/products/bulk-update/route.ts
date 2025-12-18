import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ProductUpdate {
  barcode?: string;
  name?: string;
  price?: number;
  stock?: number;
  description?: string;
  category?: string;
  is_active?: boolean;
}

/**
 * POST /api/admin/products/bulk-update
 * Actualiza múltiples productos de una sola vez
 * 
 * Body: {
 *   updates: Array<{
 *     id: string;  // Product ID
 *     data: ProductUpdate
 *   }>
 * }
 */
export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = (session as any)?.role || (session?.user as any)?.role || '';
    
    if (!session || !String(role).toUpperCase().includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const updates = body.updates || [];

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere array de actualizaciones' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      updated: [] as string[],
    };

    for (const update of updates) {
      try {
        const { id, data } = update;
        if (!id) {
          results.failed++;
          results.errors.push('ID de producto faltante');
          continue;
        }

        // Construir payload de actualización
        const updatePayload: any = {};
        
        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.price !== undefined) updatePayload.price = data.price;
        if (data.stock !== undefined) updatePayload.stock = data.stock;
        if (data.description !== undefined) updatePayload.description = data.description;
        if (data.is_active !== undefined) updatePayload.is_active = data.is_active;
        if (data.category !== undefined) updatePayload.category = data.category;

        const { error } = await supabaseAdmin
          .from('products')
          .update(updatePayload)
          .eq('id', id);

        if (error) {
          results.failed++;
          results.errors.push(`${data.name || id}: ${error.message}`);
        } else {
          results.success++;
          results.updated.push(id);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Error: ${err.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('Bulk update error:', err);
    return NextResponse.json(
      { error: err.message || 'Error procesando actualizaciones' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/products/export
 * Exporta todos los productos en formato JSON/CSV
 */
export async function GET(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = (session as any)?.role || (session?.user as any)?.role || '';
    
    if (!session || !String(role).toUpperCase().includes('ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json'; // json o csv

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (format === 'csv') {
      // Generar CSV
      const headers = ['id', 'barcode', 'name', 'price', 'stock', 'category', 'description', 'is_active', 'created_at'];
      const rows = (products || []).map(p => [
        p.id,
        p.barcode || '',
        p.name || '',
        p.price || '',
        p.stock || '',
        p.category || '',
        (p.description || '').replace(/"/g, '""'),
        p.is_active ? 'true' : 'false',
        p.created_at || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="productos_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON por defecto
    return NextResponse.json(products);
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
