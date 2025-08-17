import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaClient } from "@/lib/prismaClient";

// GET /api/admin/users -> lista usuarios reales (solo admin)
export async function GET(req: NextRequest) {
  const session: any = await getServerSession(authOptions as any);
  if (!session || session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const users = await prismaClient.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
  });
  return NextResponse.json(users);
}

// PATCH /api/admin/users (cambiar rol) body: { userId, role }
export async function PATCH(req: NextRequest) {
  const session: any = await getServerSession(authOptions as any);
  if (!session || session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  try {
    const { userId, role } = await req.json();
    if (!userId || !['USER','ADMIN'].includes(role)) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }
    const updated = await prismaClient.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json({ message: 'Rol actualizado', user: { id: updated.id, role: updated.role } });
  } catch (e:any) {
    return NextResponse.json({ message: 'Error', detail: e.message }, { status: 500 });
  }
}
