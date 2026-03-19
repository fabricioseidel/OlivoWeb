import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sellerId = searchParams.get('sellerId');
    const paymentMethod = searchParams.get('paymentMethod');
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 500);
    const offset = Number(searchParams.get('offset') || '0');

    // Build sales query with pagination
    let salesQuery = supabaseServer
      .from('sales')
      .select('*', { count: 'exact' })
      .order('ts', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (startDate) salesQuery = salesQuery.gte('ts', startDate);
    if (endDate) salesQuery = salesQuery.lte('ts', endDate);
    if (sellerId) salesQuery = salesQuery.eq('seller_id', sellerId);
    if (paymentMethod) salesQuery = salesQuery.eq('payment_method', paymentMethod);

    const { data: salesData, error: salesError, count } = await salesQuery;

    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    // Only look up sellers that actually appear in the results
    const sellerIds = [...new Set(salesData.filter(s => s.seller_id).map(s => s.seller_id))];
    
    let sellersMap = new Map();
    if (sellerIds.length > 0) {
      const { data: sellersData } = await supabaseServer
        .from('sellers')
        .select('id, name, user_id')
        .in('id', sellerIds);
      sellersMap = new Map((sellersData || []).map(s => [s.id, s]));
    }

    // Enrich sales with seller info (only for sales that have a seller_id)
    const enrichedSales = salesData.map(sale => {
      const seller = sale.seller_id ? sellersMap.get(sale.seller_id) : null;
      return {
        ...sale,
        seller_name: seller?.name || (sale.device_id === 'web-pos' ? 'Web POS' : null),
        seller_email: null,
      };
    });

    return NextResponse.json({ sales: enrichedSales, total: count || enrichedSales.length });
  } catch (error) {
    console.error('Error in sales API:', error);
    return NextResponse.json(
      { error: 'Error al obtener ventas' },
      { status: 500 }
    );
  }
}
