import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Obtener productos asociados a este proveedor a través de product_suppliers
    const { data: productSuppliers, error } = await supabaseServer
      .from('product_suppliers')
      .select(`
        id,
        product_id,
        supplier_sku,
        unit_cost,
        reorder_threshold,
        default_reorder_qty,
        products:product_id (
          id,
          name,
          barcode,
          stock,
          purchase_price,
          reorder_threshold
        )
      `)
      .eq('supplier_id', id)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching supplier products:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Transformar datos para la UI
    const products = (productSuppliers || []).map((ps: any) => {
      const product = Array.isArray(ps.products) ? ps.products[0] : ps.products;
      
      return {
        id: product?.id,
        name: product?.name,
        barcode: product?.barcode,
        stock: product?.stock || 0,
        purchase_price: ps.unit_cost || product?.purchase_price || 0,
        reorder_threshold: ps.reorder_threshold || product?.reorder_threshold || 10,
        supplier_id: id,
        supplier_sku: ps.supplier_sku || product?.barcode,
        default_reorder_qty: ps.default_reorder_qty || 1,
      };
    }).filter((p: any) => p.id); // Filtrar productos sin ID (datos incompletos)

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error in supplier products API:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos del proveedor' },
      { status: 500 }
    );
  }
}
