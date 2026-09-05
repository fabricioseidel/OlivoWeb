import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/api-auth';
import { supabaseServer } from '@/lib/supabase-server';
import type { Check } from '@/lib/admin/checks';
import { urlPublica } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico de la integración con MercadoPago.
 *
 * Responde la pregunta que los logs no contestan: ¿el problema es del código o
 * de la configuración de la cuenta? Verifica el token contra la API real de
 * MercadoPago (`/users/me`) y detecta el caso más común y más confuso: intentar
 * pagar con la MISMA cuenta que recibe el dinero, que MercadoPago bloquea
 * dejando el botón "Pagar" deshabilitado sin explicar por qué.
 */
export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const checks: Check[] = [];
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
  const siteUrlCrudo = process.env.NEXT_PUBLIC_SITE_URL || '';
  // La que de verdad se le manda a MercadoPago, ya corregida al dominio
  // canónico. Mostrar la cruda escondía el problema: decía `olivomarket.cl` y
  // parecía correcta, pero el webhook salía contra un 307.
  const siteUrl = urlPublica();

  // ── 1. Token presente y de qué tipo ──
  if (!accessToken) {
    checks.push({
      id: 'token',
      label: 'Access token',
      status: 'error',
      detail: 'MERCADOPAGO_ACCESS_TOKEN no está definido.',
      hint: 'Agrégalo en Vercel → Settings → Environment Variables y vuelve a desplegar.',
    });
  } else {
    const isProd = accessToken.startsWith('APP_USR-');
    const isTest = accessToken.startsWith('TEST-');
    checks.push({
      id: 'token',
      label: 'Access token',
      status: isProd ? 'ok' : 'warn',
      detail: isProd
        ? `Token de PRODUCCIÓN (${accessToken.slice(0, 12)}…${accessToken.slice(-4)}).`
        : isTest
        ? 'Token de PRUEBA (TEST-). Los pagos reales no funcionarán.'
        : 'Formato de token no reconocido.',
      hint: isProd
        ? undefined
        : 'Usa las credenciales de producción desde tu panel de MercadoPago → Tus integraciones → Credenciales.',
    });
  }

  // ── 2. Identidad del vendedor según MercadoPago ──
  let collectorEmail: string | null = null;
  let collectorId: number | null = null;
  if (accessToken) {
    try {
      const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const me = await res.json();
        collectorEmail = me?.email ?? null;
        collectorId = me?.id ?? null;
        checks.push({
          id: 'cuenta',
          label: 'Cuenta que recibe los pagos',
          status: 'ok',
          detail: `${me?.nickname || 'sin alias'} · ${me?.email || 'sin email'} · país ${me?.site_id || '—'}`,
          hint:
            me?.site_id && me.site_id !== 'MLC'
              ? `La cuenta es de ${me.site_id}, pero la tienda cobra en CLP (Chile, MLC). Puede rechazar pagos.`
              : undefined,
        });
      } else {
        const text = await res.text();
        checks.push({
          id: 'cuenta',
          label: 'Cuenta que recibe los pagos',
          status: 'error',
          detail: `MercadoPago rechazó el token (HTTP ${res.status}). ${text.slice(0, 200)}`,
          hint: 'El token está vencido o pertenece a otra aplicación. Regenéralo en tu panel de MercadoPago.',
        });
      }
    } catch (err: any) {
      checks.push({
        id: 'cuenta',
        label: 'Cuenta que recibe los pagos',
        status: 'error',
        detail: `No se pudo contactar la API de MercadoPago: ${err?.message || err}`,
      });
    }
  }

  // ── 3. Auto-pago: la causa más común del botón "Pagar" deshabilitado ──
  const { data: settings } = await supabaseServer
    .from('settings')
    .select('store_email')
    .eq('id', true)
    .maybeSingle();
  const storeEmail = (settings as any)?.store_email || null;

  if (collectorEmail) {
    const sameAsStore =
      storeEmail && String(storeEmail).toLowerCase() === String(collectorEmail).toLowerCase();
    checks.push({
      id: 'auto-pago',
      label: 'Riesgo de auto-pago',
      status: sameAsStore ? 'warn' : 'ok',
      detail: sameAsStore
        ? `El email de la tienda (${storeEmail}) es el mismo de la cuenta que cobra.`
        : `La cuenta que cobra es ${collectorEmail}.`,
      hint:
        'MercadoPago NO permite pagarle a tu propia cuenta. Si inicias sesión en el checkout con ' +
        `${collectorEmail}, el botón "Pagar" aparecerá deshabilitado. Para probar, usa otra cuenta ` +
        'de MercadoPago, una tarjeta de otra persona, o el modo invitado con una tarjeta de prueba.',
    });
  }

  // ── 4. URL pública del sitio (back_urls y notification_url dependen de esto) ──
  checks.push({
    id: 'site-url',
    label: 'URL pública del sitio',
    status: siteUrl.startsWith('https://') ? 'ok' : 'error',
    detail:
      siteUrl +
      (siteUrlCrudo && siteUrlCrudo.replace(/\/+$/, '') !== siteUrl
        ? ` (corregida: NEXT_PUBLIC_SITE_URL dice "${siteUrlCrudo}", que redirige con 307 y perdería los webhooks)`
        : siteUrlCrudo
          ? ''
          : ' (NEXT_PUBLIC_SITE_URL no está definida; se usa el dominio canónico)'),
    hint: siteUrl.startsWith('https://')
      ? undefined
      : 'Debe ser HTTPS. Sin esto, MercadoPago no puede devolver al cliente ni notificar el pago.',
  });

  // ── 5. Secret del webhook: sin él, en producción no se acredita ningún pago ──
  checks.push({
    id: 'webhook-secret',
    label: 'Firma del webhook',
    status: webhookSecret ? 'ok' : 'error',
    detail: webhookSecret
      ? 'MERCADOPAGO_WEBHOOK_SECRET configurado.'
      : 'MERCADOPAGO_WEBHOOK_SECRET no está definido.',
    hint: webhookSecret
      ? `Notificaciones a ${siteUrl}/api/payments/webhook`
      : 'En producción el webhook rechaza TODAS las notificaciones sin este secret, así que ningún ' +
        'pedido se marcará como pagado aunque el cliente pague. Cópialo desde MercadoPago → ' +
        'Tus integraciones → Webhooks.',
  });

  // ── 6. Órdenes atascadas: síntoma observable del problema ──
  const { count: pendingCount } = await supabaseServer
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('payment_method', 'mercadopago')
    .eq('payment_status', 'pending');

  checks.push({
    id: 'ordenes-pendientes',
    label: 'Pedidos esperando pago',
    status: (pendingCount || 0) > 0 ? 'warn' : 'ok',
    detail: `${pendingCount || 0} pedido(s) con MercadoPago sin acreditar.`,
    hint:
      (pendingCount || 0) > 0
        ? 'Los clientes pueden retomar el pago desde la página de confirmación o "Mis pedidos".'
        : undefined,
  });

  const worst = checks.some((c) => c.status === 'error')
    ? 'error'
    : checks.some((c) => c.status === 'warn')
    ? 'warn'
    : 'ok';

  return NextResponse.json({
    status: worst,
    collectorId,
    checkedAt: new Date().toISOString(),
    checks,
  });
}
