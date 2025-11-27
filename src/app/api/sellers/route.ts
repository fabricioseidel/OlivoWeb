import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    // Obtener todos los sellers con sus usuarios
    const { data: sellersData, error: sellersError } = await supabaseServer
      .from('sellers')
      .select(`
        id,
        name,
        user_id
      `);

    if (sellersError) {
      console.error('Error fetching sellers:', sellersError);
      return NextResponse.json({ error: sellersError.message }, { status: 500 });
    }

    // Obtener información de usuarios
    const userIds = sellersData
      .map(s => s.user_id)
      .filter(id => id !== null);

    const { data: usersData, error: usersError } = await supabaseServer
      .from('users')
      .select('id, email, role')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const usersMap = new Map(usersData.map(u => [u.id, u]));

    const sellers = sellersData.map(seller => {
      const user = seller.user_id ? usersMap.get(seller.user_id) : null;
      return {
        id: seller.id,
        name: seller.name,
        email: user?.email || null,
        role: user?.role || null,
      };
    });

    return NextResponse.json({ sellers });
  } catch (error) {
    console.error('Error in sellers API:', error);
    return NextResponse.json(
      { error: 'Error al obtener vendedores' },
      { status: 500 }
    );
  }
}
