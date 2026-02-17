import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import bcrypt from "bcryptjs";

// GET /api/admin/users -> lista usuarios reales (solo admin)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  const session: any = await getServerSession(authOptions as any);
  const role = (session as any)?.role || (session?.user as any)?.role || '';
  if (!session || !String(role).toUpperCase().includes('ADMIN')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,name,email,role');
  if (error) {
    console.error('[ADMIN/USERS][GET] Error:', error?.message || error);
    return NextResponse.json({ message: 'Error', detail: error.message }, { status: 500 });
  }
  const users = (data || [])
    .sort((a: any, b: any) => String(a?.email || '').localeCompare(String(b?.email || '')))
    .map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  return NextResponse.json(users);
}

// PATCH /api/admin/users (cambiar rol) body: { userId, role }
export async function PATCH(req: NextRequest) {
  const session: any = await getServerSession(authOptions as any);
  const adminRole = (session as any)?.role || (session?.user as any)?.role || '';
  if (!session || !String(adminRole).toUpperCase().includes('ADMIN')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  try {
    const { userId, role } = await req.json();
    if (!userId || !['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }
    // Update only role to avoid failures if updated_at column doesn't exist
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id,role')
      .maybeSingle();
    if (error) {
      console.error('[ADMIN/USERS][PATCH] Error:', error?.message || error);
      throw error;
    }
    return NextResponse.json({ message: 'Rol actualizado', user: { id: data?.id, role: data?.role } });
  } catch (e: any) {
    return NextResponse.json({ message: 'Error', detail: e.message }, { status: 500 });
  }
}

// POST /api/admin/users (crear usuario)
// body: { name: string, email: string, password: string, role?: 'USER'|'ADMIN' }
export async function POST(req: NextRequest) {
  const session: any = await getServerSession(authOptions as any);
  const adminRole = (session as any)?.role || (session?.user as any)?.role || '';
  if (!session || !String(adminRole).toUpperCase().includes('ADMIN')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  try {
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const finalRole = ['USER', 'ADMIN'].includes(role) ? role : 'USER';

    // Check existence
    const existing = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', emailNorm)
      .maybeSingle();
    if (existing.data) {
      return NextResponse.json({ message: 'Ya existe un usuario con ese email' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(String(password), 10);
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ name, email: emailNorm, password_hash, role: finalRole })
      .select('id,name,email,role')
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ message: 'Usuario creado', user: data }, { status: 201 });
  } catch (e: any) {
    console.error('[ADMIN/USERS][POST] Error:', e?.message || e);
    return NextResponse.json({ message: 'Error', detail: e.message }, { status: 500 });
  }
}
