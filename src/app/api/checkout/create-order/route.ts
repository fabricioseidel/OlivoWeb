import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/config/auth.config';
import { sendOrderConfirmation } from '@/server/email.service';
import { recordCouponUsage, getCouponByCode } from '@/server/coupon.service';
import { earnPoints, redeemPoints } from '@/server/loyalty.service';

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

    return NextResponse.json({ success: true, orderId: order.id });

  } catch (error) {
    console.error('[Checkout Debug] Critical error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
