import { MercadoPagoConfig, Preference } from 'mercadopago';

// ── MercadoPago Client Initialization ──────────────────────────────────────────

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
if (!accessToken && process.env.NODE_ENV === 'production') {
  console.warn('[MercadoPago] ⚠️ AVISO: MERCADOPAGO_ACCESS_TOKEN no está definido.');
}

export const client = new MercadoPagoConfig({ 
  accessToken,
  options: { timeout: 10000 }
});

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
  total: number;
}

/**
 * Creates a MercadoPago Preference for a specific order.
 * Returns the init_point (checkout URL).
 */
export async function createPaymentPreference(params: CreatePreferenceParams) {
  const { orderId, items, customerEmail } = params;

  // Use the production URL if available, otherwise fallback to localhost for dev
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  // Log token verification (masked for security)
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
  console.log(`[MercadoPago] Token configurado: ${token.slice(0, 10)}...${token.slice(-6)} | SiteURL: ${siteUrl}`);

  const preference = new Preference(client);

  try {
    const body = {
      items: items.map(item => ({
        id: String(item.id),
        title: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.price),
        currency_id: 'CLP', // Estándar para Chile
        picture_url: item.image || undefined,
      })),
      payer: {
        email: customerEmail,
      },
      back_urls: {
        success: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=success`,
        failure: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=failure`,
        pending: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=pending`,
      },
      // auto_return solo funciona con URLs HTTPS públicas (no localhost)
      ...(siteUrl.startsWith('https://') ? { auto_return: 'approved' as const } : {}),
      notification_url: `${siteUrl}/api/payments/webhook`,
      external_reference: String(orderId),
      statement_descriptor: 'OLIVOMARKET',
      expires: false,
    };

    console.log('[MercadoPago] Creando preferencia con payload:', JSON.stringify(body, null, 2));
    const result = await preference.create({ body });
    
    // Siempre usar init_point (producción real). sandbox_init_point es solo para referencia.
    console.log(`[MercadoPago] ✅ Preferencia creada. ID: ${result.id}`);
    console.log(`[MercadoPago] init_point (REAL): ${result.init_point}`);
    console.log(`[MercadoPago] sandbox_init_point (REFERENCIA): ${result.sandbox_init_point}`);

    if (!result.init_point) {
      throw new Error('MercadoPago no retornó un init_point válido. Verifica el Access Token de producción.');
    }

    return {
      id: result.id,
      initPoint: result.init_point,           // URL real de checkout (producción)
      sandboxInitPoint: result.sandbox_init_point // Solo referencia
    };
  } catch (error: any) {
    console.error('[MercadoPago] Error creating preference:', error?.message || error);
    if (error?.cause) {
      console.error('[MercadoPago] Detalles del error:', JSON.stringify(error.cause, null, 2));
    }
    throw error;
  }
}
