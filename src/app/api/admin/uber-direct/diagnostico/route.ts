import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/api-auth';
import { format, getHours, getMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { tiendaAbierta } from '@/lib/delivery-slots';
import { cotizarFlash, uberDirectConfigurado } from '@/server/uber-direct.service';
import type { Check } from '@/lib/admin/checks';

export const dynamic = 'force-dynamic';

const TIMEZONE = 'America/Santiago';

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const checks: Check[] = [];

  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID || '';
  const clientId = process.env.UBER_DIRECT_CLIENT_ID || '';
  const clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET || '';

  // 1. Variables de entorno.
  //
  // Del customer y del client id se muestran sólo los primeros caracteres, lo
  // justo para reconocer si son los de producción o los de prueba. El secret
  // no se muestra nunca: `Check.detail` va al navegador.
  if (!customerId || !clientId || !clientSecret) {
    const missing = [
      !customerId && 'UBER_DIRECT_CUSTOMER_ID',
      !clientId && 'UBER_DIRECT_CLIENT_ID',
      !clientSecret && 'UBER_DIRECT_CLIENT_SECRET',
    ].filter(Boolean);

    checks.push({
      id: 'env-vars',
      label: 'Credenciales de Uber Direct',
      status: 'error',
      detail: `Faltan variables en Vercel: ${missing.join(', ')}`,
      hint: 'Agrégalas en Vercel → Settings → Environment Variables y asegúrate de hacer un Redeploy.',
    });
  } else {
    checks.push({
      id: 'env-vars',
      label: 'Credenciales de Uber Direct',
      status: 'ok',
      detail: `Configurado. Customer ID: ${customerId.slice(0, 8)}… | Client ID: ${clientId.slice(0, 8)}…`,
    });
  }

  // 2. Horario comercial (Tienda abierta)
  const ahora = toZonedTime(new Date(), TIMEZONE);
  const horaStr = format(ahora, 'HH:mm');
  const abierta = tiendaAbierta(
    format(ahora, 'yyyy-MM-dd'),
    getHours(ahora) * 60 + getMinutes(ahora)
  );

  checks.push({
    id: 'tienda-abierta',
    label: 'Horario comercial (Santiago de Chile)',
    status: abierta ? 'ok' : 'warn',
    detail: `Hora actual en Chile: ${horaStr}. Estado: ${abierta ? 'Abierta' : 'Cerrada'}.`,
    hint: abierta
      ? undefined
      : 'El envío flash se oculta automáticamente cuando la tienda está cerrada (L-V 07:45–20:30, S-D 10:00–18:00) para evitar que Uber cobre viajes sin personal para despachar.',
  });

  // 3. Prueba de autenticación y cotización real
  if (uberDirectConfigurado()) {
    try {
      const q = await cotizarFlash({
        calle: 'Av. Irarrázaval 3400',
        comuna: 'Ñuñoa',
        codigoPostal: '7750000',
      });

      if (q) {
        checks.push({
          id: 'test-quote',
          label: 'Prueba de cotización en vivo (Ñuñoa)',
          status: 'ok',
          detail: `Cotización exitosa. Costo: $${q.costoCLP.toLocaleString('es-CL')} CLP · ETA estimado: ${q.etaMin ?? '?'} min · Quote ID: ${q.quoteId.slice(0, 12)}…`,
        });
      } else {
        checks.push({
          id: 'test-quote',
          label: 'Prueba de cotización en vivo',
          status: 'warn',
          detail: 'Uber respondió que la dirección de prueba no tiene cobertura.',
        });
      }
    } catch (err) {
      checks.push({
        id: 'test-quote',
        label: 'Prueba de cotización en vivo',
        status: 'error',
        detail: `Error al conectar con la API de Uber: ${err instanceof Error ? err.message : 'error desconocido'}`,
        hint: 'Verifica que el Client ID, Client Secret y Customer ID sean válidos en el portal de desarrolladores de Uber.',
      });
    }
  }

  const worst = checks.some((c) => c.status === 'error')
    ? 'error'
    : checks.some((c) => c.status === 'warn')
    ? 'warn'
    : 'ok';

  return NextResponse.json({
    status: worst,
    checkedAt: new Date().toISOString(),
    checks,
  });
}
