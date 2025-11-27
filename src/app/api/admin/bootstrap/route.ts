import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST /api/admin/bootstrap
// Headers: x-setup-token: <ADMIN_SETUP_TOKEN>
// Body: { email: string, password: string, name?: string }
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-setup-token');
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'email y password requeridos' }, { status: 400 });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const hash = await bcrypt.hash(String(password), 10);

    // Buscar existente
  const { data: existing, error: findErr } = await supabaseAdmin
      .from('users')
      .select('id,role')
      .eq('email', emailNorm)
      .maybeSingle();
    if (findErr) throw findErr;

    if (!existing) {
  const { data, error } = await supabaseAdmin
        .from('users')
        .insert({ email: emailNorm, name: name || 'Administrador', password_hash: hash, role: 'ADMIN' })
        .select('id,email,role')
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ ok: true, created: true, user: data });
    } else {
      // Promover a ADMIN y actualizar hash si se pasa
  const { data, error } = await supabaseAdmin
        .from('users')
        .update({ role: 'ADMIN', password_hash: hash })
        .eq('email', emailNorm)
        .select('id,email,role')
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ ok: true, updated: true, user: data });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
