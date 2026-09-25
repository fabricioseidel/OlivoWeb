import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { esquemaEmpleado } from "@/lib/documentos/esquemas";
import { estimarImposiciones } from "@/lib/documentos/imposiciones";
import { guardarEmpleado, listarEmpleados, obtenerConfiguracion } from "@/server/documentos.service";
import { actorDe, responderError, responderValidacion } from "../_lib/respuesta";

/** GET: trabajadores y la estimación de imposiciones del mes con los activos. */
export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const [empleados, config] = await Promise.all([listarEmpleados(), obtenerConfiguracion()]);
    const estimacion = estimarImposiciones(
      empleados
        .filter((e) => e.activo)
        .map((e) => ({
          id: e.id,
          nombre: e.nombre,
          sueldoImponible: e.sueldo_imponible,
          tipoContrato: e.tipo_contrato,
          afp: e.afp,
          comisionAfp: e.comision_afp,
          adicionalSalud: e.adicional_salud,
        })),
      config.tasas_previsionales,
    );
    return NextResponse.json({ empleados, estimacion, tasas: config.tasas_previsionales });
  } catch (e) {
    return responderError(e, "empleados");
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = esquemaEmpleado.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return responderValidacion(parsed.error);
    const empleado = await guardarEmpleado(null, parsed.data, actorDe(auth.session));
    return NextResponse.json({ empleado }, { status: 201 });
  } catch (e) {
    return responderError(e, "empleados.crear");
  }
}
