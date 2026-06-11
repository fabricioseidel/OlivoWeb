import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAdminOrSeller } from '@/lib/api-auth';

export async function GET(_request: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const { data: orders, error } = await supabaseServer
      .from('orders')
      .select('*, order_items(id)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    const transformedOrders = orders.map(order => ({
      ...order,
      items_count: order.order_items ? order.order_items.length : 0,
      order_items: undefined,
    }));

    return NextResponse.json(transformedOrders);
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
