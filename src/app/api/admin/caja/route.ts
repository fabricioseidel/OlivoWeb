import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAdminOrSeller } from '@/lib/api-auth';

/**
 * GET /api/admin/caja?shiftId=xxx
 * Returns shift sales and movements in a single call (replaces 2 client-side Supabase queries).
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAdminOrSeller();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const shiftId = searchParams.get('shiftId');

    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId required' }, { status: 400 });
    }

    // Execute both queries in parallel 
    const [movRes, salesRes] = await Promise.all([
      supabaseServer
        .from('cash_movements')
        .select('id, amount, type, reason, created_at')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: false }),
      supabaseServer
        .from('sales')
        .select('id, total, payment_method, ts, sale_payments(method, amount, reference)')
        .eq('shift_id', shiftId)
        .order('ts', { ascending: false }),
    ]);

    return NextResponse.json({
      movements: movRes.data || [],
      sales: salesRes.data || [],
    });
  } catch (error: any) {
    console.error('Caja API Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
