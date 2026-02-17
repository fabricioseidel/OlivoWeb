import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/config/auth.config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Transform data to include items count
    const transformedOrders = orders.map(order => ({
      ...order,
      items_count: order.order_items ? order.order_items.length : 0,
      order_items: undefined
    }));

    return NextResponse.json(transformedOrders);

  } catch (error) {
    console.error('User orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
