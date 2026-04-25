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

  const preference = new Preference(client);

  try {
    const body = {
      items: items.map(item => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: 'CLP', // Standard for Chile
        picture_url: item.image,
      })),
      payer: {
        email: customerEmail,
      },
      back_urls: {
        success: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=success`,
        failure: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=failure`,
        pending: `${siteUrl}/checkout/confirmacion?orderId=${orderId}&payment=pending`,
      },
      // auto_return only works with public HTTPS URLs (not localhost)
      ...(siteUrl.startsWith('https://') ? { auto_return: 'approved' as const } : {}),
      notification_url: `${siteUrl}/api/payments/webhook`,
      external_reference: orderId,
      statement_descriptor: 'OLIVOMARKET',
      expires: false,
    };

    const result = await preference.create({ body });
    
    return {
      id: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point
    };
  } catch (error) {
    console.error('[MercadoPago] Error creating preference:', error);
    throw error;
  }
}
