import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAdminOrSeller } from '@/lib/api-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;

    // Obtener el pedido con el proveedor
    const { data: order, error: orderError } = await supabaseServer
      .from('supplier_orders')
      .select(`
        *,
        suppliers (name, whatsapp, phone)
      `)
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Obtener los items del pedido con información del producto
    const { data: items, error: itemsError } = await supabaseServer
      .from('supplier_order_items')
      .select(`
        id,
        product_id,
        supplier_sku,
        quantity,
        unit_cost,
        subtotal,
        notes,
        products (name, barcode)
      `)
      .eq('order_id', id)
      .order('id');

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return NextResponse.json(
        { error: 'Error al cargar items del pedido' },
        { status: 500 }
      );
    }

    // Formatear respuesta
    const formattedItems = (items || []).map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: product?.name || 'Producto desconocido',
        product_sku: product?.barcode || item.supplier_sku,
        supplier_sku: item.supplier_sku,
        quantity: item.quantity,
        unit_cost: parseFloat(item.unit_cost),
        subtotal: parseFloat(item.subtotal),
        notes: item.notes,
      };
    });

    const supplierName = Array.isArray(order.suppliers)
      ? order.suppliers[0]?.name
      : order.suppliers?.name || 'Proveedor desconocido';

    const supplierWhatsapp = Array.isArray(order.suppliers)
      ? order.suppliers[0]?.whatsapp
      : order.suppliers?.whatsapp;

    const supplierPhone = Array.isArray(order.suppliers)
      ? order.suppliers[0]?.phone
      : order.suppliers?.phone;

    const response = {
      id: order.id,
      supplier_id: order.supplier_id,
      supplier_name: supplierName,
      supplier_whatsapp: supplierWhatsapp,
      supplier_phone: supplierPhone,
      order_date: order.order_date,
      expected_date: order.expected_date,
      delivered_date: order.delivered_date,
      status: order.status,
      payment_status: order.payment_status,
      total: parseFloat(order.total),
      paid_amount: parseFloat(order.paid_amount),
      notes: order.notes,
      payment_receipt_url: order.payment_receipt_url,
      payment_receipt_name: order.payment_receipt_name,
      invoice_url: order.invoice_url,
      invoice_name: order.invoice_name,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: formattedItems,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in supplier order detail API:', error);
    return NextResponse.json(
      { error: 'Error al obtener el pedido' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();

    // ── Read previous status BEFORE updating ──
    const { data: previousOrder } = await supabaseServer
      .from('supplier_orders')
      .select('status')
      .eq('id', id)
      .single();

    const previousStatus = previousOrder?.status;

    const updates: any = {};

    if (body.status) updates.status = body.status;
    if (body.payment_status) updates.payment_status = body.payment_status;
    if (body.paid_amount !== undefined) updates.paid_amount = body.paid_amount;
    if (body.delivered_date !== undefined) updates.delivered_date = body.delivered_date;
    if (body.notes !== undefined) updates.notes = body.notes;

    // Auto-set delivered_date when marking as recibido
    if (body.status === 'recibido' && !updates.delivered_date) {
      updates.delivered_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabaseServer
      .from('supplier_orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        suppliers (name, whatsapp, phone)
      `)
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el pedido' },
        { status: 500 }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // STOCK: recepción / cancelación vía RPC apply_reception(_reverse).
    // Las RPCs actualizan branch_stock como fuente de verdad, recalculan
    // products.stock como suma global y registran inventory_movements,
    // de modo que el POS (que lee branch_stock) ve el mismo stock que
    // la web.
    // ═══════════════════════════════════════════════════════════════
    const isReception = body.status === 'recibido' && previousStatus !== 'recibido';
    const isReversal  = body.status === 'cancelado' && previousStatus === 'recibido';

    if (isReception || isReversal) {
      try {
        const { data: orderItems } = await supabaseServer
          .from('supplier_order_items')
          .select('quantity, products(barcode)')
          .eq('order_id', id);

        const payload = (orderItems || [])
          .map((it: any) => {
            const prod = Array.isArray(it.products) ? it.products[0] : it.products;
            const barcode = prod?.barcode;
            return barcode ? { barcode, qty: Number(it.quantity) || 0 } : null;
          })
          .filter(Boolean);

        if (payload.length > 0) {
          const rpcName = isReception ? 'apply_reception' : 'apply_reception_reverse';
          const reason  = isReception
            ? `Recepción pedido proveedor #${id.slice(0, 8)}`
            : `Cancelación pedido proveedor #${id.slice(0, 8)}`;

          const { error: rpcErr } = await supabaseServer.rpc(rpcName, {
            p_items:     payload,
            p_branch_id: null,
            p_reference: id,
            p_notes:     reason,
          });

          if (rpcErr) {
            console.error(`Error en ${rpcName}:`, rpcErr);
          } else {
            console.log(`✅ ${isReception ? 'Recepción' : 'Reversión'} aplicada: pedido ${id.slice(0, 8)}, ${payload.length} ítems`);
          }
        }
      } catch (invError) {
        console.error('Error al actualizar inventario:', invError);
        // No fallamos el cambio de estado por un error de inventario.
      }
    }

    // ── Fetch updated items for response ──
    const { data: items } = await supabaseServer
      .from('supplier_order_items')
      .select(`
        id,
        product_id,
        supplier_sku,
        quantity,
        unit_cost,
        subtotal,
        products (name, barcode)
      `)
      .eq('order_id', id);

    const formattedItems = (items || []).map((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: product?.name || 'Producto desconocido',
        product_sku: product?.barcode || item.supplier_sku,
        supplier_sku: item.supplier_sku,
        quantity: item.quantity,
        unit_cost: parseFloat(item.unit_cost),
        subtotal: parseFloat(item.subtotal),
      };
    });

    const supplierName = Array.isArray(data.suppliers)
      ? data.suppliers[0]?.name
      : data.suppliers?.name || 'Proveedor desconocido';

    const supplierWhatsapp = Array.isArray(data.suppliers)
      ? data.suppliers[0]?.whatsapp
      : data.suppliers?.whatsapp;

    const supplierPhone = Array.isArray(data.suppliers)
      ? data.suppliers[0]?.phone
      : data.suppliers?.phone;

    return NextResponse.json({
      id: data.id,
      supplier_id: data.supplier_id,
      supplier_name: supplierName,
      supplier_whatsapp: supplierWhatsapp,
      supplier_phone: supplierPhone,
      order_date: data.order_date,
      expected_date: data.expected_date,
      delivered_date: data.delivered_date,
      status: data.status,
      payment_status: data.payment_status,
      total: parseFloat(data.total),
      paid_amount: parseFloat(data.paid_amount),
      notes: data.notes,
      payment_receipt_url: data.payment_receipt_url,
      payment_receipt_name: data.payment_receipt_name,
      invoice_url: data.invoice_url,
      invoice_name: data.invoice_name,
      items: formattedItems,
    });
  } catch (error) {
    console.error('Error in supplier order update API:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el pedido' },
      { status: 500 }
    );
  }
}
