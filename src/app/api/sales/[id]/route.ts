import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const saleId = id;

    // Obtener detalles de la venta
    const { data: saleData, error: saleError } = await supabaseServer
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single();

    if (saleError) {
      console.error('Error fetching sale:', saleError);
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    if (!saleData) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    // Obtener items de la venta
    const { data: itemsData, error: itemsError } = await supabaseServer
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);

    if (itemsError) {
      console.error('Error fetching sale items:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Obtener información del vendedor
    let sellerName = null;
    let sellerEmail = null;

    if (saleData.seller_id) {
      const { data: sellerData } = await supabaseServer
        .from('sellers')
        .select('id, name, user_id')
        .eq('id', saleData.seller_id)
        .single();

      if (sellerData) {
        sellerName = sellerData.name;

        if (sellerData.user_id) {
          const { data: userData } = await supabaseServer
            .from('users')
            .select('email')
            .eq('id', sellerData.user_id)
            .single();

          if (userData) {
            sellerEmail = userData.email;
          }
        }
      }
    }

    return NextResponse.json({
      sale: {
        ...saleData,
        seller_name: sellerName,
        seller_email: sellerEmail,
      },
      items: itemsData,
    });
  } catch (error) {
    console.error('Error in sale detail API:', error);
    return NextResponse.json(
      { error: 'Error al obtener detalle de venta' },
      { status: 500 }
    );
  }
}
