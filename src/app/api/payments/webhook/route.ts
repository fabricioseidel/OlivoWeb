import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[MP Webhook] Received notification:', body);

    // MercadoPago sends notifications in several formats. 
    // We care about "payment" type.
    const paymentId = body.data?.id || body.id;
    const type = body.type || body.topic;

    if (type === 'payment' && paymentId) {
      console.log(`[MP Webhook] Processing payment ID: ${paymentId}`);

      // Create client at runtime to ensure token is read from env
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
      if (!accessToken) {
        console.error('[MP Webhook] ❌ MERCADOPAGO_ACCESS_TOKEN no está definido');
        return NextResponse.json({ error: 'Token no configurado' }, { status: 500 });
      }

      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });

      const status = paymentData.status;
      const orderId = paymentData.external_reference; // We stored orderId here during preference creation

      console.log(`[MP Webhook] Order: ${orderId} | Status: ${status}`);

      if (orderId && (status === 'approved' || status === 'authorized')) {
        // Update Order Status in Supabase to PAID
        const { error } = await supabaseAdmin
          .from('orders')
          .update({ 
            payment_status: 'paid',
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (error) {
          console.error('[MP Webhook] Error updating order:', error);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log(`[MP Webhook] ✅ Order ${orderId} marked as PAID`);
      } else if (orderId && (status === 'rejected' || status === 'cancelled' || status === 'refunded' || status === 'in_mediation')) {
        console.log(`[MP Webhook] 🔄 Restaurando stock para orden ${orderId} debido a estado: ${status}`);

        // 1. Obtener items de la orden con barcode (la RPC nueva usa barcode + branch)
        const { data: items, error: itemsErr } = await supabaseAdmin
          .from('order_items')
          .select('product_id, quantity, products(barcode)')
          .eq('order_id', orderId);

        if (!itemsErr && items) {
          // 2. Devolver stock a cada producto en la sucursal por defecto
          //    (las RPCs hacen el fallback a la sucursal default en SQL)
          for (const item of items as any[]) {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const barcode = product?.barcode;
            if (!barcode) {
              console.warn(`[MP Webhook] Producto ${item.product_id} sin barcode, skip rollback`);
              continue;
            }
            try {
              await supabaseAdmin.rpc('increment_product_stock', {
                p_barcode: barcode,
                p_quantity: item.quantity,
                p_branch_id: null,
                p_reference: String(orderId),
                p_reason: `MP_${status.toUpperCase()}`
              });
            } catch (err) {
              console.error(`[MP Webhook] Error incrementando stock para barcode ${barcode}:`, err);
            }
          }
        }

        // 3. Marcar orden como cancelada/fallida
        await supabaseAdmin
          .from('orders')
          .update({ 
            payment_status: status,
            status: status === 'refunded' ? 'refunded' : 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
          
        console.log(`[MP Webhook] ❌ Orden ${orderId} actualizada a ${status} y stock restaurado.`);
      }
    }

    // Always return 200 to MercadoPago to avoid retries
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[MP Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

