import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/config/auth.config';
import { sendOrderConfirmation } from '@/server/email.service';
import { recordCouponUsage, getCouponByCode } from '@/server/coupon.service';
import { earnPoints, redeemPoints } from '@/server/loyalty.service';
import { createPaymentPreference } from '@/server/payments.service';
import { format, getHours } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const MAX_ORDERS_PER_SLOT = 5;
const TIMEZONE = "America/Santiago";


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { 
      items, 
      shippingInfo, 
      shippingMethod, 
      paymentMethod, 
      total, 
      subtotal, 
      shippingCost,
      couponCode,
      discountApplied,
      loyaltyRedeemed
    } = body;

    console.log('[Checkout Debug] Start processing order');

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    const userId = (session?.user as any)?.id || null;

    // Extra Validation for Delivery Slots (Only for dynamic shipping = home delivery)
    if (shippingMethod === "dynamic") {
      const { deliveryDate, deliveryTimeSlot } = shippingInfo;
      if (!deliveryDate || !deliveryTimeSlot) {
         return NextResponse.json({ error: 'Debe seleccionar una fecha y bloque horario para el envío a domicilio.' }, { status: 400 });
      }

      // 0a: Verify slot hasn't reached maximum capacity dynamically
      const { data: slotOrders, error: slotErr } = await supabaseAdmin
        .from('orders')
        .select('shipping_address')
        .neq('status', 'cancelled');
        
      if (!slotErr && slotOrders) {
        let count = 0;
        slotOrders.forEach(o => {
          const addr = o.shipping_address as any;
          if (addr && addr.deliveryDate === deliveryDate && addr.deliveryTimeSlot === deliveryTimeSlot) {
            count++;
          }
        });
        
        if (count >= MAX_ORDERS_PER_SLOT) {
          return NextResponse.json({ error: 'Lo sentimos, este bloque horario acaba de llenarse. Por favor seleccione otro.' }, { status: 400 });
        }
      }

      // 0b: Validate same day logic
      const nowUtc = new Date();
      const nowInChile = toZonedTime(nowUtc, TIMEZONE);
      const currentHour = getHours(nowInChile);
      const todayStr = format(nowInChile, "yyyy-MM-dd");

      if (deliveryDate === todayStr) {
        if (currentHour >= 13) {
           return NextResponse.json({ error: 'Ya pasó la hora límite (1 PM) para envíos del mismo día. Seleccione mañana.' }, { status: 400 });
        }
        if (deliveryTimeSlot !== "18:00-21:00") {
           return NextResponse.json({ error: 'Para el mismo día solo está disponible el horario de 18:00 a 21:00 hrs.' }, { status: 400 });
        }
      }
    }

    // 1. Create Order
    const orderData = {
        user_id: userId,
        status: 'pending',
        total,
        subtotal,
        shipping_cost: shippingCost,
        shipping_method: shippingMethod,
        shipping_address: shippingInfo,
        payment_method: paymentMethod,
        payment_status: 'pending',
        coupon_code: couponCode || null,
        discount_amount: discountApplied || 0
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: 'Failed to create order', details: orderError }, { status: 500 });
    }

    // 2. Create Order Items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create order items', details: itemsError }, { status: 500 });
    }

    // 3. Update Stock
    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.id)
        .single();
        
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        await supabaseAdmin
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id);
      }
    }

    // 4. Record Coupon Usage (if any)
    if (couponCode) {
       try {
          const coupon = await getCouponByCode(couponCode);
          if (coupon) {
             await recordCouponUsage({
                couponId: coupon.id,
                customerEmail: shippingInfo?.email,
                orderId: order.id,
                discountApplied: discountApplied || 0
             });
          }
       } catch (err) {
          console.error('[Checkout Debug] Error recording coupon usage:', err);
       }
    }

    // 5. Post-order processing (Email, Customers, Loyalty)
    const customerEmail = shippingInfo?.email;
    const customerName = shippingInfo?.fullName || 'Cliente';

    if (customerEmail) {
      // Send confirmation email
      sendOrderConfirmation({
        to: customerEmail,
        customerName,
        orderId: order.id,
        total,
        itemCount: items.length,
        paymentMethod: paymentMethod || 'N/A',
        items: items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price * item.quantity,
        })),
      }).catch(err => console.warn('[Checkout] Email send failed:', err));

      // Handle Loyalty and Customer Upsert in background
      (async () => {
         try {
            // Redeem points if opted
            if (loyaltyRedeemed?.points > 0) {
               await redeemPoints({
                  customerEmail,
                  points: loyaltyRedeemed.points,
                  description: `Pago parcial de orden ${order.id}`
               });
            }

            // Upsert customer
            await supabaseAdmin
              .from('customers')
              .upsert({
                email: customerEmail,
                name: customerName,
                phone: shippingInfo?.phone || null,
                customer_type: 'regular',
                source: 'web',
                marketing_consent: true,
                last_purchase_at: new Date().toISOString(),
              }, { onConflict: 'email' });

            // Earn points for current purchase
            await earnPoints({
               customerEmail,
               amount: total,
               referenceType: 'order',
               referenceId: order.id
            });
            
         } catch (err) {
            console.warn('[Checkout] Loyalty background task failed:', err);
         }
      })();
    }

    // 6. Create MercadoPago Preference (only if payment method is mercadopago)
    let initPoint = null;
    if (paymentMethod === 'mercadopago') {
      try {
        console.log(`[Checkout] Creating MP preference for order ${order.id}, total: ${total}`);
        console.log(`[Checkout] Access token present: ${!!process.env.MERCADOPAGO_ACCESS_TOKEN}`);
        console.log(`[Checkout] Site URL: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}`);
        
        const mpResult = await createPaymentPreference({
          orderId: order.id,
          items,
          customerEmail: customerEmail || 'anon@olivomarket.cl',
          total
        });
        initPoint = mpResult.initPoint;
        console.log(`[Checkout] ✅ MP Preference created: ${mpResult.id} | initPoint: ${initPoint}`);
      } catch (err: any) {
        console.error('[Checkout] ❌ MercadoPago preference failed:', err?.message || err);
        console.error('[Checkout] MP Error details:', JSON.stringify(err, null, 2));
        // Order was created in DB but MP preference failed - return error so user knows
        return NextResponse.json({ 
          error: 'Error al conectar con MercadoPago. Tu pedido fue creado pero el pago no pudo procesarse. Contacta soporte con el ID: ' + order.id,
          orderId: order.id 
        }, { status: 502 });
      }
    }

    return NextResponse.json({ success: true, orderId: order.id, initPoint });

  } catch (error) {
    console.error('[Checkout Debug] Critical error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
