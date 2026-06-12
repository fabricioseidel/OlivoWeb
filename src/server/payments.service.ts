import { MercadoPagoConfig, Preference } from 'mercadopago';
import { logger } from '@/utils/logger';

// ── Preference Creation ────────────────────────────────────────────────────────

interface CreatePreferenceParams {
  orderId: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  customerEmail: string;
  /** Total final a cobrar: subtotal + envío − descuentos. */
  total: number;
  /** Costo de envío incluido en `total`. */
  shippingCost?: number;
  /** Suma de descuentos (cupón + puntos) ya restados de `total`. */
  discountTotal?: number;
}

/**
 * Creates a MercadoPago Preference for a specific order.
 * The MercadoPago client is instantiated HERE (not at module level)
 * to ensure the access token is always read from the environment at runtime.
 *
 * El monto cobrado SIEMPRE debe ser exactamente `total` (el webhook valida
 * transaction_amount contra orders.total):
 * - Sin descuentos: ítems por línea + envío vía `shipments.cost`.
 * - Con descuentos: MP no soporta líneas negativas, así que se cobra un
 *   único ítem consolidado por el total final.
 */
export async function createPaymentPreference(params: CreatePreferenceParams) {
  const { orderId, items, customerEmail, total } = params;
  const shippingCost = params.shippingCost ?? 0;
  const discountTotal = params.discountTotal ?? 0;

  // ── Read env vars at runtime (critical for Vercel) ──
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://olivomarket.cl';

  // ── Validate token ──
  if (!accessToken) {
    throw new Error(
      '[MercadoPago] MERCADOPAGO_ACCESS_TOKEN no está definido. ' +
      'Agrégalo en Vercel → Project → Settings → Environment Variables.'
    );
  }

  // Log verification (masked)
  logger.log(
    `[MercadoPago] Token: ${accessToken.slice(0, 12)}...${accessToken.slice(-6)} | ` +
    `Tipo: ${accessToken.startsWith('APP_USR-') ? 'PRODUCCIÓN ✅' : 'SANDBOX/TEST ⚠️'} | ` +
    `SiteURL: ${siteUrl}`
  );

  // ── Validate amounts ──
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(`[MercadoPago] Total inválido (${total}). MercadoPago requiere un monto > 0.`);
  }
  const invalidItems = items.filter(i => !i.price || Number(i.price) <= 0);
  if (invalidItems.length > 0) {
    const names = invalidItems.map(i => i.name).join(', ');
    throw new Error(
      `[MercadoPago] Los siguientes productos tienen precio inválido ($0 o vacío): ${names}. ` +
      `MercadoPago requiere unit_price > 0.`
    );
  }

  // ── Build charge lines so the charged amount equals `total` exactly ──
  const itemCount = items.reduce((s, i) => s + Number(i.quantity), 0);
  const preferenceItems = discountTotal > 0
    ? [{
        id: String(orderId),
        title: `Pedido OlivoMarket (${itemCount} producto${itemCount === 1 ? '' : 's'}, incluye descuentos)`,
        quantity: 1,
        unit_price: Number(total),
        currency_id: 'CLP' as const,
      }]
    : items.map(item => ({
        id: String(item.id),
        title: String(item.name).substring(0, 256), // MP max 256 chars
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        currency_id: 'CLP' as const,
        picture_url: item.image || undefined,
      }));
  const shipments = discountTotal > 0 || shippingCost <= 0
    ? undefined
    : { cost: Number(shippingCost), mode: 'not_specified' as const };

  // ── Create client at runtime (NOT at module level) ──
  const client = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 15000 },
  });
  const preference = new Preference(client);

  try {
    const body = {
      items: preferenceItems,
      ...(shipments ? { shipments } : {}),
      payer: {
        email: customerEmail,
      },
      back_urls: {
        success: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=success`,
        failure: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=failure`,
        pending: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=pending`,
      },
      // auto_return solo funciona con HTTPS
      ...(siteUrl.startsWith('https://') ? { auto_return: 'approved' as const } : {}),
      notification_url: `${siteUrl}/api/payments/webhook`,
      external_reference: String(orderId),
      statement_descriptor: 'OLIVOMARKET',
      expires: false,
    };

    logger.log('[MercadoPago] Creando preferencia:', JSON.stringify(body, null, 2));
    const result = await preference.create({ body });

    if (!result.init_point) {
      throw new Error(
        `[MercadoPago] La API respondió OK pero no retornó init_point. ` +
        `Preference ID: ${result.id}. Verifica que el token sea de PRODUCCIÓN (APP_USR-), no de SANDBOX.`
      );
    }

    logger.log(`[MercadoPago] ✅ Preferencia creada exitosamente.`);
    logger.log(`[MercadoPago] Preference ID : ${result.id}`);
    logger.log(`[MercadoPago] init_point    : ${result.init_point}`);
    logger.log(`[MercadoPago] sandbox_point : ${result.sandbox_init_point}`);

    return {
      id: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    };
  } catch (error: any) {
    logger.error('[MercadoPago] ❌ Error al crear preferencia:');
    logger.error('  Mensaje:', error?.message);
    if (error?.cause) {
      logger.error('  Causa:', JSON.stringify(error.cause, null, 2));
    }
    throw error;
  }
}
