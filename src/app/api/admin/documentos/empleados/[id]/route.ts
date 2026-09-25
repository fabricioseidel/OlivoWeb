import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaEmpleado } from "@/lib/documentos/esquemas";
import { eliminarEmpleado, guardarEmpleado } from "@/server/documentos.service";
import { actorDe, responderError, responderValidacion } from "../../_lib/respuesta";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = esquemaEmpleado.partial().safeParse(await req.json().catch(() => null));
    if (!parsed.success) return responderValidacion(parsed.error);
    const empleado = await guardarEmpleado((await params).id, parsed.data, actorDe(auth.session));
    return NextResponse.json({ empleado });
  } catch (e) {
    return responderError(e, "empleados.actualizar");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    await eliminarEmpleado((await params).id, actorDe(auth.session));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return responderError(e, "empleados.eliminar");
  }
}
