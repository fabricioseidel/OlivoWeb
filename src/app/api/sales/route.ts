import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');
    const sellerId  = searchParams.get('sellerId');
    const branchId  = searchParams.get('branchId');
    const paymentMethod = searchParams.get('paymentMethod'); // legacy single
    const method    = searchParams.get('method');            // sale_payments.method (CASH, DEBIT, …)
    const includeVoided = searchParams.get('includeVoided') === '1';
    const limit  = Math.min(Number(searchParams.get('limit')  || '100'), 500);
    const offset = Number(searchParams.get('offset') || '0');

    let salesQuery = supabaseServer
      .from('sales')
      .select(`
        *,
        sale_payments (id, method, amount, reference),
        branches:branch_id (id, name)
      `, { count: 'exact' })
      .order('ts', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) salesQuery = salesQuery.gte('ts', startDate);
    if (endDate)   salesQuery = salesQuery.lte('ts', endDate);
    if (sellerId)  salesQuery = salesQuery.eq('seller_id', sellerId);
    if (branchId)  salesQuery = salesQuery.eq('branch_id', branchId);
    if (paymentMethod) salesQuery = salesQuery.eq('payment_method', paymentMethod);
    if (!includeVoided) salesQuery = salesQuery.eq('voided', false);

    const { data: salesData, error: salesError, count } = await salesQuery;
    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    // Filtrar in-memory por método nuevo (sale_payments.method) si vino
    let filteredSales = salesData ?? [];
    if (method) {
      filteredSales = filteredSales.filter((s: any) =>
        Array.isArray(s.sale_payments) && s.sale_payments.some((p: any) => p.method === method)
      );
    }

    // Sellers lookup
    const sellerIds = [...new Set(filteredSales.filter((s: any) => s.seller_id).map((s: any) => s.seller_id))];
    let sellersMap = new Map();
    if (sellerIds.length > 0) {
      const { data: sellersData } = await supabaseServer
        .from('sellers').select('id, name, user_id').in('id', sellerIds);
      sellersMap = new Map((sellersData || []).map((s: any) => [s.id, s]));
    }

    const enrichedSales = filteredSales.map((sale: any) => {
      const seller = sale.seller_id ? sellersMap.get(sale.seller_id) : null;
      return {
        ...sale,
        branch_name: sale.branches?.name ?? null,
        seller_name: seller?.name || (sale.device_id === 'web-pos' || sale.device_id === 'web' ? 'Web POS' : null),
        seller_email: null,
      };
    });

    return NextResponse.json({
      sales: enrichedSales,
      total: count ?? enrichedSales.length,
    });
  } catch (error) {
    console.error('Error in sales API:', error);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}
