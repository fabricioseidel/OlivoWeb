import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAdminOrSeller } from '@/lib/api-auth';
import { applyReception, reverseReception } from '@/server/inventory.service';

/** Columnas de una línea de pedido que la API expone. */
const COLUMNAS_ITEM = `
  id,
  product_id,
  supplier_sku,
  quantity,
  unit_cost,
  tax_rate,
  subtotal,
  notes,
  qty_confirmed,
  availability,
  qty_received,
  unit_cost_received,
  products (name, barcode)
`;

/**
 * Da forma a una línea de pedido para la API.
 *
 * El GET y el PATCH devolvían la misma línea con dos mapeos distintos escritos
 * a mano, así que agregar un campo obligaba a acordarse de los dos — y al
 * añadir los campos del ciclo de compra, efectivamente se olvidó uno.
 */
function formatearItem(item: any) {
  const producto = Array.isArray(item.products) ? item.products[0] : item.products;
  const numero = (valor: unknown) =>
    valor === null || valor === undefined ? null : Number(valor);

  return {
    id: item.id,
    product_id: item.product_id,
    product_name: producto?.name || 'Producto desconocido',
    product_sku: producto?.barcode || item.supplier_sku,
    supplier_sku: item.supplier_sku,
    quantity: item.quantity,
    unit_cost: Number(item.unit_cost) || 0,
    tax_rate: numero(item.tax_rate) ?? 19,
    subtotal: Number(item.subtotal) || 0,
    notes: item.notes ?? null,
    // Ciclo de compra: qué confirmó el proveedor y qué llegó de verdad.
    qty_confirmed: numero(item.qty_confirmed),
    availability: item.availability ?? 'pendiente',
    qty_received: numero(item.qty_received),
    unit_cost_received: numero(item.unit_cost_received),
  };
}


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
      .select(COLUMNAS_ITEM)
      .eq('order_id', id)
      .order('id');

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return NextResponse.json(
        { error: 'Error al cargar items del pedido' },
        { status: 500 }
      );
    }

    const formattedItems = (items || []).map(formatearItem);

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
      channel: order.channel ?? null,
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

    // El cambio de estado se hace condicionado al estado que acabamos de leer.
    // Sin esto, dos peticiones simultáneas (un doble clic en "Marcar como
    // Recibido") leían ambas el estado anterior y aplicaban la recepción dos
    // veces: el stock entraba duplicado.
    const isStatusChange = Boolean(body.status) && body.status !== previousStatus;

    let query = supabaseServer.from('supplier_orders').update(updates).eq('id', id);
    if (isStatusChange) {
      query = previousStatus
        ? query.eq('status', previousStatus)
        : query.is('status', null);
    }

    const { data: updated, error } = await query
      .select(`
        *,
        suppliers (name, whatsapp, phone)
      `)
      .maybeSingle();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Error al actualizar el pedido' },
        { status: 500 }
      );
    }

    // Sin fila: otra petición ganó la carrera y ya hizo esta transición.
    // Se devuelve el pedido tal como quedó, sin volver a mover stock.
    const didTransition = Boolean(updated);
    let data = updated;

    if (!data) {
      const { data: current } = await supabaseServer
        .from('supplier_orders')
        .select(`
          *,
          suppliers (name, whatsapp, phone)
        `)
        .eq('id', id)
        .maybeSingle();

      if (!current) {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }
      data = current;
    }

    // ═══════════════════════════════════════════════════════════════
    // STOCK: recepción / cancelación vía RPC apply_reception(_reverse).
    // Las RPCs actualizan branch_stock como fuente de verdad, recalculan
    // products.stock como suma global y registran inventory_movements,
    // de modo que el POS (que lee branch_stock) ve el mismo stock que
    // la web.
    // ═══════════════════════════════════════════════════════════════
    const isReception = didTransition && body.status === 'recibido' && previousStatus !== 'recibido';
    const isReversal  = didTransition && body.status === 'cancelado' && previousStatus === 'recibido';

    if (isReception || isReversal) {
      try {
        const { data: orderItems } = await supabaseServer
          .from('supplier_order_items')
          .select('id, quantity, qty_received, products(barcode)')
          .eq('order_id', id);

        // El stock se mueve con lo que REALMENTE llegó. Antes se movía con
        // `quantity` —la cantidad pedida—, así que un "pedí 24, llegaron 18"
        // metía 24 al inventario y el sistema quedaba mintiendo por seis
        // unidades. Como `products.stock` se recalcula desde `branch_stock`,
        // ese error llegaba hasta la venta web.
        //
        // Cuando nadie anotó la recepción línea por línea, marcar el pedido
        // como recibido sigue significando "llegó todo como se pidió", que es
        // el caso habitual; para revertir, en cambio, lo que hay que sacar es
        // exactamente lo que entró.
        const items = (orderItems || [])
          .map((it: any) => {
            const prod = Array.isArray(it.products) ? it.products[0] : it.products;
            const barcode = prod?.barcode;
            if (!barcode) return null;
            const cantidad = it.qty_received ?? it.quantity;
            return { id: it.id as string, barcode, qty: Number(cantidad) || 0 };
          })
          .filter((it): it is { id: string; barcode: string; qty: number } => it !== null)
          .filter((it) => it.qty > 0);

        // Dejar anotado lo recibido cierra el hueco: sin esto, revertir después
        // no sabría cuánto había entrado.
        if (isReception) {
          const sinAnotar = (orderItems || []).filter((it: any) => it.qty_received === null);
          if (sinAnotar.length > 0) {
            await Promise.all(
              sinAnotar.map((it: any) =>
                supabaseServer
                  .from('supplier_order_items')
                  .update({ qty_received: it.quantity, received_at: new Date().toISOString() })
                  .eq('id', it.id)
              )
            );
          }
        }

        if (items.length > 0) {
          const reason = isReception
            ? `Recepción pedido proveedor #${id.slice(0, 8)}`
            : `Cancelación pedido proveedor #${id.slice(0, 8)}`;

          const result = isReception
            ? await applyReception(items, { reference: id, reason })
            : await reverseReception(items, { reference: id, reason });

          if (!result.ok) {
            console.error(`Error moviendo stock del pedido ${id.slice(0, 8)}:`, result.error);
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
      .select(COLUMNAS_ITEM)
      .eq('order_id', id);

    const formattedItems = (items || []).map(formatearItem);

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
      channel: data.channel ?? null,
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

// Eliminar una supplier_order. Solo se permite borrar borradores para
// proteger ordenes ya confirmadas o recibidas (que tienen efectos en stock).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: order, error: fetchErr } = await supabaseServer
      .from('supplier_orders')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }
    if (order.status !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar pedidos en estado borrador' },
        { status: 400 }
      );
    }

    // Items se borran por ON DELETE CASCADE si el FK lo tiene; si no,
    // los borramos explicitamente para evitar items huerfanos.
    await supabaseServer.from('supplier_order_items').delete().eq('order_id', id);

    const { error: delErr } = await supabaseServer
      .from('supplier_orders')
      .delete()
      .eq('id', id);

    if (delErr) {
      console.error('Error deleting supplier order:', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in supplier order DELETE:', error);
    return NextResponse.json({ error: 'Error al eliminar el pedido' }, { status: 500 });
  }
}
