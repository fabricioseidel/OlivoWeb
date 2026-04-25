import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

/**
 * GET /api/payments/test
 * Endpoint de diagnóstico para verificar la conexión con MercadoPago.
 * Eliminar en producción una vez confirmado que todo funciona.
 */
export async function GET() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'NO DEFINIDA';

  const tokenStatus = token
    ? `✅ Definido: ${token.slice(0, 12)}...${token.slice(-6)}`
    : '❌ NO DEFINIDO (vacío)';

  const isProductionToken = token.startsWith('APP_USR-');
  const isSandboxToken = token.startsWith('TEST-');

  if (!token) {
    return NextResponse.json({
      ok: false,
      error: 'MERCADOPAGO_ACCESS_TOKEN no está definido en las variables de entorno de Vercel',
      token: tokenStatus,
      siteUrl,
    }, { status: 500 });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 10000 } });
    const preference = new Preference(client);

    // Crear preferencia de prueba con monto real mínimo
    const testBody = {
      items: [{
        id: 'test-diagnostic-001',
        title: 'Prueba Diagnóstico OlivoMarket',
        quantity: 1,
        unit_price: 1, // $1 CLP mínimo válido
        currency_id: 'CLP' as const,
      }],
      payer: { email: 'test@olivomarket.cl' },
      back_urls: {
        success: `${siteUrl}/checkout/confirmacion?payment=success`,
        failure: `${siteUrl}/checkout/confirmacion?payment=failure`,
        pending: `${siteUrl}/checkout/confirmacion?payment=pending`,
      },
      external_reference: 'DIAGNOSTIC_TEST',
      statement_descriptor: 'OLIVOMARKET',
    };

    const result = await preference.create({ body: testBody });

    return NextResponse.json({
      ok: true,
      message: '✅ MercadoPago conectado correctamente',
      tokenType: isProductionToken ? 'PRODUCCIÓN (APP_USR-)' : isSandboxToken ? 'SANDBOX (TEST-)' : 'DESCONOCIDO',
      token: tokenStatus,
      siteUrl,
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Error desconocido al crear preferencia de prueba',
      cause: err?.cause || null,
      tokenType: isProductionToken ? 'PRODUCCIÓN' : isSandboxToken ? 'SANDBOX' : 'DESCONOCIDO',
      token: tokenStatus,
      siteUrl,
    }, { status: 500 });
  }
}
