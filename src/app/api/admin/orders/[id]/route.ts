import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error in GET order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { status, payment_status } = body;
        
        const updateData: any = {};
        if (status) updateData.status = status;
        if (payment_status) updateData.payment_status = payment_status;

        const { error } = await supabaseAdmin
            .from('orders')
            .update(updateData)
            .eq('id', id);
            
        if (error) {
            console.error('Error updating order:', error);
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PATCH order:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
