import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = `
    ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS coupon_code TEXT, 
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0;
  `;
  
  try {
    const { data, error } = await supabaseAdmin.rpc('run_sql', { sql });
    
    if (error) {
      console.error('[Migration Error]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
