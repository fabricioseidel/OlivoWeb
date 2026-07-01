import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/config/auth.config';
import { sendOrderConfirmation } from '@/server/email.service';
import { recordCouponUsage, getCouponByCode, validateCoupon } from '@/server/coupon.service';
import { earnPoints, redeemPoints, getLoyaltyConfig, getCustomerPoints } from '@/server/loyalty.service';
import { createPaymentPreference } from '@/server/payments.service';
import { format, getHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const MAX_ORDERS_PER_SLOT = 5;
const TIMEZONE = "America/Santiago";

/** Distancia Haversine ×1.3 (mismo cálculo que /api/shipping/calculate). */
function haversineKm(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLon = ((destination.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1.3;
}

/**
 * Recalcula el costo de envío en servidor. Nunca confía en el valor que
 * envía el navegador.
 */
async function calculateServerShippingCost(
  shippingMethod: string,
  coords: { lat: number; lng: number } | null | undefined
): Promise<{ cost: number } | { error: string }> {
  if (shippingMethod === 'pickup') return { cost: 0 };

  if (shippingMethod === 'dynamic') {
    const { data: settings } = await supabaseServer
      .from('settings')
      .select('enable_dynamic_shipping, shipping_base_fee, shipping_price_per_km, shipping_origin_lat, shipping_origin_lng')
      .eq('id', true)
      .maybeSingle();

    if (!settings?.enable_dynamic_shipping) {
      return { error: 'El envío a domicilio no está disponible en este momento.' };
    }
    if (!settings.shipping_origin_lat || !settings.shipping_origin_lng) {
      return { error: 'El envío a domicilio no está configurado. Selecciona retiro en tienda.' };
    }
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      return { error: 'No pudimos validar la dirección de envío. Selecciona una dirección sugerida por el buscador.' };
    }

    const distanceKm = haversineKm(
      { lat: Number(settings.shipping_origin_lat), lng: Number(settings.shipping_origin_lng) },
      coords
    );
    const cost = Number(settings.shipping_base_fee || 0) + distanceKm * Number(settings.shipping_price_per_km || 0);
    if (!Number.isFinite(cost) || cost < 0) {
      return { error: 'No se pudo calcular el costo de envío.' };
    }
    return { cost: Math.round(cost) };
  }

  return { error: 'Método de envío no válido.' };
}


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    // Del cliente solo se toman: items (id+cantidad), datos de envío, método
    // de envío/pago, cupón y puntos a canjear. Precios, descuentos, costo de
    // envío y total se recalculan SIEMPRE en servidor.
    const {
      items,
      shippingInfo,
      shippingMethod,
      paymentMethod,
      couponCode,
      loyaltyRedeemed
    } = body;

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
      const { data: slotOrders, error: slotErr } = await supabaseServer
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

    // 1. Validate Products & Prices
    // CartItem.id corresponde al barcode del producto (ver mapSupaToUI en services/products.ts)
    const { data: dbProducts, error: productsErr } = await supabaseServer
      .from('products')
      .select('id, barcode, stock, name, sale_price, is_active')
      .in('barcode', items.map((i: any) => i.id));

    if (productsErr || !dbProducts) {
       return NextResponse.json({ error: 'No se pudo validar el stock de los productos.' }, { status: 500 });
    }

    let calculatedSubtotal = 0;
    const validatedOrderItems = [];

    // Validaciones iniciales
    for (const item of items) {
      const dbProduct = dbProducts.find((p: any) => String(p.barcode) === String(item.id));
      if (!dbProduct) return NextResponse.json({ error: `Producto no encontrado: ${item.name}` }, { status: 400 });
      if (!dbProduct.is_active) return NextResponse.json({ error: `El producto ${dbProduct.name} ya no está disponible.` }, { status: 400 });

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000) {
        return NextResponse.json({ error: `Cantidad inválida para ${dbProduct.name}.` }, { status: 400 });
      }

      calculatedSubtotal += dbProduct.sale_price * quantity;
      validatedOrderItems.push({
        product_id: dbProduct.id,
        name: dbProduct.name,
        price: dbProduct.sale_price,
        quantity,
        image: item.image
      });
    }

    // 2. Recalcular envío, cupón y puntos en servidor (nunca confiar en el cliente)
    const shippingResult = await calculateServerShippingCost(shippingMethod, shippingInfo?.coords);
    if ('error' in shippingResult) {
      return NextResponse.json({ error: shippingResult.error }, { status: 400 });
    }
    let serverShippingCost = shippingResult.cost;

    let couponDiscount = 0;
    if (couponCode) {
      const validation = await validateCoupon(String(couponCode), calculatedSubtotal, shippingInfo?.email);
      if (!validation.valid) {
        return NextResponse.json({ error: `Cupón inválido: ${validation.message}` }, { status: 400 });
      }
      couponDiscount = validation.discount;
      const coupon = await getCouponByCode(String(couponCode));
      if (coupon?.discount_type === 'free_shipping') {
        serverShippingCost = 0;
      }
    }

    let pointsDiscount = 0;
    const pointsToRedeem = Number(loyaltyRedeemed?.points) || 0;
    if (pointsToRedeem > 0) {
      if (!shippingInfo?.email) {
        return NextResponse.json({ error: 'Se requiere email para canjear puntos.' }, { status: 400 });
      }
      const [loyaltyConfig, currentPoints] = await Promise.all([
        getLoyaltyConfig(),
        getCustomerPoints(shippingInfo.email),
      ]);
      if (pointsToRedeem > currentPoints) {
        return NextResponse.json({ error: 'No tienes suficientes puntos para este canje.' }, { status: 400 });
      }
      if (pointsToRedeem < loyaltyConfig.min_points_redeem) {
        return NextResponse.json({ error: `Mínimo ${loyaltyConfig.min_points_redeem} puntos para canjear.` }, { status: 400 });
      }
      pointsDiscount = pointsToRedeem * loyaltyConfig.redemption_value;
    }

    const serverTotal = Math.max(0, (calculatedSubtotal + serverShippingCost) - couponDiscount - pointsDiscount);

    // Resolver la sucursal por defecto: el stock de la web vive en
    // branch_stock por sucursal, no en products.stock global. Usamos la
    // sucursal default; las RPCs hacen el mismo fallback en SQL.
    const { data: defaultBranch } = await supabaseServer
      .from('branches')
      .select('id')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();
    const branchId: string | null = defaultBranch?.id ?? null;

    // 3. Create Order FIRST so we can use order.id as reference_id in
    // inventory_movements. Si falla algún decremento abajo, eliminamos
    // la orden y restauramos el stock.
    const orderData = {
        user_id: userId,
        status: 'pending',
        total: serverTotal,
        subtotal: calculatedSubtotal,
        shipping_cost: serverShippingCost,
        shipping_method: shippingMethod,
        shipping_address: shippingInfo,
        payment_method: paymentMethod,
        payment_status: 'pending',
        coupon_code: couponCode || null,
        discount_amount: couponDiscount + pointsDiscount
    };

    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: 'Failed to create order', details: orderError }, { status: 500 });
    }

    // 4. ATOMIC STOCK RESERVATION (branch-aware): descuenta branch_stock,
    // recalcula products.stock y registra inventory_movements con
    // reference_id = order.id.
    const successfullSubtractions: any[] = [];
    try {
      for (const item of items) {
        const { data: success, error: rpcErr } = await supabaseServer.rpc('decrement_stock_atomic', {
          p_barcode: String(item.id),
          p_quantity: item.quantity,
          p_branch_id: branchId,
          p_reference: String(order.id),
          p_reason: 'WEB_SALE'
        });

        if (rpcErr || !success) {
           throw new Error(`Stock insuficiente para ${item.name}. Por favor actualiza tu carrito.`);
        }
        successfullSubtractions.push(item);
      }
    } catch (err: any) {
      // ROLLBACK: devolver el stock de lo que ya descontamos y eliminar la orden.
      for (const item of successfullSubtractions) {
        await supabaseServer.rpc('increment_product_stock', {
          p_barcode: String(item.id),
          p_quantity: item.quantity,
          p_branch_id: branchId,
          p_reference: String(order.id),
          p_reason: 'WEB_SALE_ROLLBACK'
        });
      }
      await supabaseServer.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // 5. Create Order Items
    const finalOrderItems = validatedOrderItems.map(item => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabaseServer
      .from('order_items')
      .insert(finalOrderItems);

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create order items', details: itemsError }, { status: 500 });
    }

    // 6. Record Coupon Usage (if any)
    if (couponCode) {
       try {
          const coupon = await getCouponByCode(couponCode);
          if (coupon) {
             await recordCouponUsage({
                couponId: coupon.id,
                customerEmail: shippingInfo?.email,
                orderId: order.id,
                discountApplied: couponDiscount
             });
          }
       } catch (err) {
          console.error('[Checkout Debug] Error recording coupon usage:', err);
       }
    }

    // 7. Post-order processing (Email, Customers, Loyalty)
    const customerEmail = shippingInfo?.email;
    const customerName = shippingInfo?.fullName || 'Cliente';

    if (customerEmail) {
      // Send confirmation email
      sendOrderConfirmation({
        to: customerEmail,
        customerName,
        orderId: order.id,
        total: serverTotal,
        itemCount: validatedOrderItems.length,
        paymentMethod: paymentMethod || 'N/A',
        items: validatedOrderItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price * item.quantity,
        })),
      }).catch(err => console.warn('[Checkout] Email send failed:', err));

      // Handle Loyalty and Customer Upsert in background
      (async () => {
         try {
            // Redeem points if opted
            if (pointsToRedeem > 0) {
               await redeemPoints({
                  customerEmail,
                  points: pointsToRedeem,
                  description: `Pago parcial de orden ${order.id}`
               });
            }

            // Upsert customer
            await supabaseServer
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
               amount: serverTotal,
               referenceType: 'order',
               referenceId: order.id
            });
            
         } catch (err) {
            console.warn('[Checkout] Loyalty background task failed:', err);
         }
      })();
    }

    // 8. Create MercadoPago Preference (only if payment method is mercadopago)
    let initPoint = null;
    if (paymentMethod === 'mercadopago') {
      try {
        console.log(`[Checkout] 💳 Iniciando creación de preferencia MP para orden ${order.id}`);

        // La preferencia se construye con precios validados contra la BD,
        // nunca con los precios que envió el navegador.
        const mpResult = await createPaymentPreference({
          orderId: order.id,
          items: validatedOrderItems.map((item) => ({
            id: String(item.product_id),
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
          })),
          customerEmail: customerEmail || 'anon@olivomarket.cl',
          total: serverTotal,
          shippingCost: serverShippingCost,
          discountTotal: couponDiscount + pointsDiscount,
        });
        initPoint = mpResult.initPoint;
        console.log(`[Checkout] ✅ Preferencia MP creada con éxito: ${mpResult.id}`);
      } catch (err: any) {
        console.error('[Checkout] ❌ ERROR CRÍTICO MERCADOPAGO:', err?.message || err);
        
        // Extraer detalles del error del SDK si existen
        if (err.cause) {
          console.error('[Checkout] Causa del error MP:', JSON.stringify(err.cause, null, 2));
        }

        return NextResponse.json({
          error: 'Mercado Pago no pudo procesar la transacción. Por favor intenta de nuevo.',
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
