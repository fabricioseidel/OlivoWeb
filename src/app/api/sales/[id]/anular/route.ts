import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { requireApiAdmin } from '@/lib/api-auth';
import { auditLog } from '@/server/audit.service';

/**
 * POST /api/sales/:id/anular  { motivo }
 *
 * Anula una venta del POS y devuelve su stock (RPC anular_venta, todo en una
 * transacción). Sólo el ADMIN: el cajero que se equivoca pide la anulación,
 * no la hace él mismo. Queda en la venta quién, cuándo y por qué, y en la
 * auditoría.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const saleId = Number(id);
  if (!Number.isInteger(saleId) || saleId <= 0) {
    return NextResponse.json({ error: 'Venta inválida' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const motivo = typeof body?.motivo === 'string' ? body.motivo.trim().slice(0, 300) : '';
  if (motivo.length < 3) {
    return NextResponse.json({ error: 'Escribe el motivo de la anulación' }, { status: 400 });
  }

  const actor = auth.session.user?.email || auth.userId;
  const { error } = await supabaseServer.rpc('anular_venta', {
    p_sale_id: saleId,
    p_motivo: motivo,
    p_actor: actor,
  });
  if (error) {
    const conocido = /no existe|ya está anulada|motivo/i.test(error.message);
    return NextResponse.json(
      { error: conocido ? error.message : 'No se pudo anular la venta' },
      { status: conocido ? 409 : 500 },
    );
  }

  await auditLog({ action: 'SALE_VOIDED', entity: 'sales', entityId: saleId, actor, details: { motivo } });
  return NextResponse.json({ ok: true });
}
