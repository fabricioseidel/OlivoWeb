import { NextRequest, NextResponse } from 'next/server';
import { Payment } from 'mercadopago';
import { client } from '@/server/payments.service';
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
      
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });

      const status = paymentData.status;
      const orderId = paymentData.external_reference; // We stored orderId here during preference creation

      console.log(`[MP Webhook] Order: ${orderId} | Status: ${status}`);

      if (orderId && (status === 'approved' || status === 'authorized')) {
        // Update Order Status in Supabase
        const { error } = await supabaseAdmin
          .from('orders')
          .update({ 
            payment_status: 'paid',
            status: 'processing', // Move from pending to processing once paid
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (error) {
          console.error('[MP Webhook] Error updating order:', error);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log(`[MP Webhook] ✅ Order ${orderId} marked as PAID`);
      }
    }

    // Always return 200/201 to MercadoPago to avoid retries
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[MP Webhook] Error processing webhook:', error);
    // Even on error, we might want to return 200 to stop MP from spamming if it's a persistent code error
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
