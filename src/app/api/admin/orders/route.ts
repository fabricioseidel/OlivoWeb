import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAdminOrSeller } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '200'), 500);
    const offset = Math.max(Number(searchParams.get('offset') || '0'), 0);

    const { data: orders, error } = await supabaseServer
      .from('orders')
      .select('*, order_items(id)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
