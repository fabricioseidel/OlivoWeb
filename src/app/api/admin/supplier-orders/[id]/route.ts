import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
  try {
    const { id } = await params;
    const body = await request.json();

    const updates: any = {};

    if (body.status) updates.status = body.status;
    if (body.payment_status) updates.payment_status = body.payment_status;
    if (body.paid_amount !== undefined) updates.paid_amount = body.paid_amount;
    if (body.delivered_date !== undefined) updates.delivered_date = body.delivered_date;
    if (body.notes !== undefined) updates.notes = body.notes;

    // Si se marca como entregado, agregar fecha de entrega
    if (body.status === 'entregado' && !updates.delivered_date) {
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

    // ===== ACTUALIZACIÓN AUTOMÁTICA DEL INVENTARIO =====
    // Si el pedido pasa a "recibido", aumentar el stock
    if (body.status === 'recibido') {
      try {
        // Obtener los items del pedido
        const { data: orderItems } = await supabaseServer
          .from('supplier_order_items')
          .select('product_id, quantity')
          .eq('order_id', id);

        if (orderItems && orderItems.length > 0) {
          // Actualizar el stock de cada producto
          for (const item of orderItems) {
            await supabaseServer.rpc('increment_product_stock', {
              p_product_id: item.product_id,
              p_quantity: item.quantity
            });
          }
          console.log(`Inventario actualizado para pedido ${id}: +${orderItems.length} productos`);
        }
      } catch (invError) {
        console.error('Error al actualizar inventario:', invError);
        // No fallar la actualización del pedido por error en inventario
      }
    }

    // Si el pedido es cancelado y estaba en "recibido", revertir el stock
    if (body.status === 'cancelado') {
      try {
        // Verificar si el pedido estaba previamente en "recibido"
        const { data: previousOrder } = await supabaseServer
          .from('supplier_orders')
          .select('status')
          .eq('id', id)
          .single();

        if (previousOrder && previousOrder.status === 'recibido') {
          // Obtener los items del pedido
          const { data: orderItems } = await supabaseServer
            .from('supplier_order_items')
            .select('product_id, quantity')
            .eq('order_id', id);

          if (orderItems && orderItems.length > 0) {
            // Revertir el stock de cada producto
            for (const item of orderItems) {
              await supabaseServer.rpc('decrement_product_stock', {
                p_product_id: item.product_id,
                p_quantity: item.quantity
              });
            }
            console.log(`Inventario revertido para pedido cancelado ${id}`);
          }
        }
      } catch (invError) {
        console.error('Error al revertir inventario:', invError);
      }
    }


    // Obtener items actualizados
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
