import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/config/auth.config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { items, shippingInfo, shippingMethod, paymentMethod, total, subtotal, shippingCost } = body;

    console.log('[Checkout Debug] Start processing order');
    console.log('[Checkout Debug] Session User:', session?.user);
    console.log('[Checkout Debug] Payload:', JSON.stringify(body, null, 2));

    if (!items || items.length === 0) {
      console.error('[Checkout Debug] Error: No items in order');
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    const userId = (session?.user as any)?.id || null;
    console.log('[Checkout Debug] User ID for DB:', userId);

    // 1. Create Order
    const orderData = {
        user_id: userId,
        status: 'pending',
        total,
        subtotal,
        shipping_cost: shippingCost,
        shipping_method: shippingMethod,
        shipping_address: shippingInfo,
        payment_method: paymentMethod,
        payment_status: 'pending'
    };
    console.log('[Checkout Debug] Inserting Order:', orderData);

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('[Checkout Debug] Error creating order:', orderError);
      return NextResponse.json({ error: 'Failed to create order', details: orderError }, { status: 500 });
    }

    console.log('[Checkout Debug] Order created successfully:', order.id);

    // 2. Create Order Items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image
    }));

    console.log('[Checkout Debug] Inserting Order Items:', orderItems);

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('[Checkout Debug] Error creating order items:', itemsError);
      return NextResponse.json({ error: 'Failed to create order items', details: itemsError }, { status: 500 });
    }

    console.log('[Checkout Debug] Order Items created successfully');

    // 3. Update Stock
    console.log('[Checkout Debug] Updating stock...');
    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.id)
        .single();
        
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        console.log(`[Checkout Debug] Updating stock for ${item.id}: ${product.stock} -> ${newStock}`);
        await supabaseAdmin
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id);
      } else {
          console.warn(`[Checkout Debug] Product ${item.id} not found for stock update`);
      }
    }

    console.log('[Checkout Debug] Order processing complete');
    return NextResponse.json({ success: true, orderId: order.id });

  } catch (error) {
    console.error('[Checkout Debug] Critical error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}
