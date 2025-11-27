import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data: orders, error } = await supabaseServer
      .from('supplier_orders')
      .select(`
        id,
        supplier_id,
        suppliers (
          id,
          name
        ),
        order_date,
        expected_date,
        delivered_date,
        status,
        payment_status,
        total,
        paid_amount,
        notes,
        created_at
      `)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Error fetching supplier orders:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Obtener conteo de items por pedido
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order: any) => {
        const { count } = await supabaseServer
          .from('supplier_order_items')
          .select('*', { count: 'exact', head: true })
          .eq('order_id', order.id);

        return {
          id: order.id,
          supplierId: order.supplier_id,
          supplierName: Array.isArray(order.suppliers) ? order.suppliers[0]?.name : order.suppliers?.name || 'Sin nombre',
          orderDate: order.order_date,
          expectedDate: order.expected_date,
          deliveredDate: order.delivered_date,
          status: order.status,
          paymentStatus: order.payment_status,
          total: parseFloat(order.total || '0'),
          paidAmount: parseFloat(order.paid_amount || '0'),
          itemCount: count || 0,
          notes: order.notes,
          createdAt: order.created_at,
        };
      })
    );

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    return NextResponse.json(
      { error: 'Error al obtener pedidos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validación
    if (!body.supplier_id || !body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    if (body.items.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos un producto' },
        { status: 400 }
      );
    }

    if (!body.expected_date) {
      return NextResponse.json(
        { error: 'Debe especificar fecha esperada de entrega' },
        { status: 400 }
      );
    }

    // Obtener usuario autenticado
    const { data: { user } } = await supabaseServer.auth.getUser();

    // Crear el pedido
    const { data: order, error: orderError } = await supabaseServer
      .from('supplier_orders')
      .insert({
        supplier_id: body.supplier_id,
        expected_date: body.expected_date,
        notes: body.notes || null,
        total: 0, // Se calculará automáticamente con los triggers
        created_by: user?.id,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: orderError.message },
        { status: 500 }
      );
    }

    // Insertar los items
    const itemsToInsert = body.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      supplier_sku: item.supplier_sku || null,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.quantity * item.unit_cost,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabaseServer
      .from('supplier_order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Intentar limpiar el pedido creado
      await supabaseServer.from('supplier_orders').delete().eq('id', order.id);
      
      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    // Obtener el pedido completo actualizado (con el total calculado)
    const { data: completeOrder } = await supabaseServer
      .from('supplier_orders')
      .select(`
        *,
        suppliers (name),
        supplier_order_items (*)
      `)
      .eq('id', order.id)
      .single();

    return NextResponse.json({ order: completeOrder }, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier order:', error);
    return NextResponse.json(
      { error: 'Error al crear pedido' },
      { status: 500 }
    );
  }
}
