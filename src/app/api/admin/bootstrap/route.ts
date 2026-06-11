import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';

// POST /api/admin/bootstrap
// Headers: x-setup-token: <ADMIN_SETUP_TOKEN>  (generar con `openssl rand -hex 32`)
// Body: { email: string, password: string, name?: string }
// Solo funciona mientras NO exista ningún ADMIN: una vez inicializado, queda deshabilitado.
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-setup-token') || '';
  const expected = process.env.ADMIN_SETUP_TOKEN || '';
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  const tokenValid =
    expected.length > 0 &&
    tokenBuf.length === expectedBuf.length &&
    timingSafeEqual(tokenBuf, expectedBuf);
  if (!tokenValid) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Deshabilitar una vez que ya existe un admin (evita re-uso del token para
  // crear admins adicionales o resetear contraseñas).
  const { count: adminCount, error: countErr } = await supabaseServer
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'ADMIN');
  if (countErr) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
  if ((adminCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Ya existe un administrador — bootstrap deshabilitado' },
      { status: 403 }
    );
  }

  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'email y password requeridos' }, { status: 400 });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const hash = await bcrypt.hash(String(password), 10);

    // Buscar existente
  const { data: existing, error: findErr } = await supabaseServer
      .from('users')
      .select('id,role')
      .eq('email', emailNorm)
      .maybeSingle();
    if (findErr) throw findErr;

    if (!existing) {
  const { data, error } = await supabaseServer
        .from('users')
        .insert({ email: emailNorm, name: name || 'Administrador', password_hash: hash, role: 'ADMIN' })
        .select('id,email,role')
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ ok: true, created: true, user: data });
    } else {
      // Promover a ADMIN y actualizar hash si se pasa
  const { data, error } = await supabaseServer
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
