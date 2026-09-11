import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { errorResponse } from "@/lib/api-response";
import { registrarMovimientoCuenta } from "@/server/cierre.service";

export const dynamic = "force-dynamic";

const METODOS = ["CASH", "TRANSFER", "CARD"] as const;

/**
 * POST /api/admin/cuentas/movimientos — cargo o abono suelto.
 *
 * Sirve para arreglar la historia (un fiado viejo que faltaba, un pago mal
 * anotado). La plata que entra hoy va en el cierre del día: si se registra
 * acá, no queda dentro de ningún arqueo y la caja de ese día no cuadra.
 */
export async function POST(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      accountId?: string | null;
      name?: string;
      kind?: "CHARGE" | "PAYMENT";
      amount?: number;
      occurredOn?: string;
      method?: string;
      note?: string;
    };

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }
    if (body.kind !== "CHARGE" && body.kind !== "PAYMENT") {
      return NextResponse.json({ error: "Tipo inválido (CHARGE o PAYMENT)" }, { status: 400 });
    }
    if (!body.accountId && !body.name?.trim()) {
      return NextResponse.json({ error: "Falta la cuenta" }, { status: 400 });
    }
    if (!body.occurredOn) {
      return NextResponse.json({ error: "Falta la fecha del movimiento" }, { status: 400 });
    }
    if (body.kind === "PAYMENT" && body.method && !METODOS.includes(body.method as typeof METODOS[number])) {
      return NextResponse.json({ error: "Método inválido" }, { status: 400 });
    }

    const res = await registrarMovimientoCuenta({
      accountId: body.accountId ?? null,
      name: body.name,
      kind: body.kind,
      amount,
      occurredOn: body.occurredOn,
      method: body.method ?? null,
      note: body.note ?? null,
    });

    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return errorResponse(e);
  }
}
