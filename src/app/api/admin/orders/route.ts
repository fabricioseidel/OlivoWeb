import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    // Fetch orders ordered by created_at desc
    // We also want the count of items.
    // Note: 'order_items(count)' requires the foreign key to be detected by PostgREST.
    // If it fails, we'll just return orders and handle items count differently or ignore it for the list.
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Transform data to include items count
    const transformedOrders = orders.map(order => ({
      ...order,
      items_count: order.order_items ? order.order_items.length : 0,
      // Remove the full items array to save bandwidth if it was large, though here we just selected IDs
      order_items: undefined
    }));

    return NextResponse.json(transformedOrders);

  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
