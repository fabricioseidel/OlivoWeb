import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/admin/users -> lista usuarios reales (solo admin)
export async function GET(req: NextRequest) {
  const session: any = await getServerSession(authOptions as any);
  const role = (session as any)?.role || (session?.user as any)?.role || '';
  if (!session || !String(role).toUpperCase().includes('ADMIN')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,name,email,role,created_at,updated_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ message: 'Error', detail: error.message }, { status: 500 });
  const users = (data || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }));
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
    if (!userId || !['USER','ADMIN'].includes(role)) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }
  const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id,role')
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ message: 'Rol actualizado', user: { id: data?.id, role: data?.role } });
  } catch (e:any) {
    return NextResponse.json({ message: 'Error', detail: e.message }, { status: 500 });
  }
}
