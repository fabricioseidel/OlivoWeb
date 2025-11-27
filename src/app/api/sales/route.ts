import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sellerId = searchParams.get('sellerId');
    const paymentMethod = searchParams.get('paymentMethod');

    // Primero verificar si hay ventas en la tabla
    const { data: allSales, error: checkError } = await supabaseServer
      .from('sales')
      .select('id, seller_id')
      .limit(5);

    console.log('Check all sales:', { 
      count: allSales?.length,
      samples: allSales,
      error: checkError 
    });

    // Consulta de ventas
    let salesQuery = supabaseServer
      .from('sales')
      .select('*')
      .order('ts', { ascending: false });

    // Aplicar filtros
    if (startDate) {
      salesQuery = salesQuery.gte('ts', startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte('ts', endDate);
    }
    if (sellerId) {
      salesQuery = salesQuery.eq('seller_id', sellerId);
    }
    if (paymentMethod) {
      salesQuery = salesQuery.eq('payment_method', paymentMethod);
    }

    const { data: salesData, error: salesError } = await salesQuery;

    console.log('Sales query result:', { 
      count: salesData?.length, 
      filters: { startDate, endDate, sellerId, paymentMethod },
      firstSale: salesData?.[0]
    });

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    // Filtrar solo ventas con seller_id (del móvil)
    const mobileSales = salesData.filter(sale => sale.seller_id !== null);

    console.log('Mobile sales filtered:', {
      total: salesData.length,
      withSeller: mobileSales.length
    });

    // Obtener información de sellers y users
    const { data: sellersData } = await supabaseServer
      .from('sellers')
      .select('id, name, user_id');

    const { data: usersData } = await supabaseServer
      .from('users')
      .select('id, name, email, role');

    // Mapear sellers y users
    const sellersMap = new Map((sellersData || []).map(s => [s.id, s]));
    const usersMap = new Map((usersData || []).map(u => [u.id, u]));

    // Enriquecer datos de ventas con información del vendedor
    const enrichedSales = mobileSales.map(sale => {
      const seller = sellersMap.get(sale.seller_id);
      const user = seller ? usersMap.get(seller.user_id) : null;
      
      return {
        ...sale,
        seller_name: seller?.name || null,
        seller_email: user?.email || null,
      };
    });

    console.log('Enriched sales:', { 
      total: enrichedSales.length, 
      firstSale: enrichedSales[0] 
    });

    return NextResponse.json({ sales: enrichedSales });
  } catch (error) {
    console.error('Error in sales API:', error);
    return NextResponse.json(
      { error: 'Error al obtener ventas' },
      { status: 500 }
    );
  }
}
