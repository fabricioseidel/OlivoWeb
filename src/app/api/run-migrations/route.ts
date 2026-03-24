import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = `
    ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5, 
    ADD COLUMN IF NOT EXISTS optimum_stock INTEGER DEFAULT 20;

    UPDATE public.products SET optimum_stock = stock WHERE stock > 20 AND optimum_stock = 20;
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
