import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/config/auth.config';
import { recordCouponUsage, getCouponByCode, validateCoupon } from '@/server/coupon.service';
import { redeemPoints, getLoyaltyConfig, getCustomerPoints } from '@/server/loyalty.service';
import { createPaymentPreference } from '@/server/payments.service';
import { quoteAgendado, FACTOR_CALLES } from '@/lib/shipping-policy';
import { precioEfectivo } from '@/lib/pricing';
import {
  quoteFlash,
  revalidarFlash,
  horarioIgnorado,
  MINIMO_FLASH_CLP_DEFAULT,
} from '@/lib/flash-policy';
import { cotizarFlash, uberDirectConfigurado } from '@/server/uber-direct.service';
import { tiendaAbierta } from '@/lib/delivery-slots';
import { esAdmin } from '@/lib/api-auth';
import {
  MAX_ORDERS_PER_SLOT,
  economicoSlotEsValido,
  primeraFechaEconomica,
  slotMatches,
  slotsEconomicosForDate,
} from '@/lib/delivery-slots';
import { format, getHours, getMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { assertOrdersEnabled } from '@/server/store-status.service';
import { PREVIEW_HTTP_STATUS } from '@/lib/store-status';
import {
  bloqueadosParaVenta,
  mensajeBloqueo,
  sinPrecioCobrable,
} from "@/server/sellable.service";

const TIMEZONE = "America/Santiago";

/** Distancia Haversine ajustada por el factor de calles (ver FACTOR_CALLES). */
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
  return R * c * FACTOR_CALLES;
}

/**
 * Recalcula el costo de envío en servidor. Nunca confía en el valor que
 * envía el navegador.
 *
 * Aplica las mismas reglas de `quoteAgendado` que usa el checkout para
 * mostrar el precio (tarifa plana cerca, por distancia lejos, y envío gratis
 * por monto). Antes solo devolvía la tarifa por distancia, así que el cliente
 * veía "Gratis" o el tope de $1.500 y se le cobraba la tarifa completa.
 */
async function calculateServerShippingCost(params: {
  shippingMethod: string;
  coords: { lat: number; lng: number } | null | undefined;
  subtotal: number;
  ciudad: string | null | undefined;
  /** Datos de destino, sólo para el flash. */
  shippingInfo: Record<string, unknown> | null | undefined;
  /** Lo que el cliente vio al elegir el flash, para poder revalidarlo. */
  precioFlashMostrado: number | null;
}): Promise<
  | { cost: number; quoteIdFlash?: string | null; quoteExpiraFlash?: string | null }
  | { error: string; recotizado?: number }
> {
  const { shippingMethod, coords, subtotal, ciudad } = params;
  if (shippingMethod === 'pickup') return { cost: 0 };

  if (shippingMethod === 'agendado') {
    const { data: settings } = await supabaseServer
      .from('settings')
      .select('enable_dynamic_shipping, shipping_base_fee, shipping_price_per_km, shipping_origin_lat, shipping_origin_lng, shipping_max_distance_km, free_shipping_enabled, free_shipping_minimum')
      .eq('id', true)
      .maybeSingle();

    if (!settings?.enable_dynamic_shipping) {
      return { error: 'El envío a domicilio no está disponible en este momento.' };
    }
    if (!settings.shipping_origin_lat || !settings.shipping_origin_lng) {
      return { error: 'El envío a domicilio no está configurado. Selecciona retiro en tienda.' };
    }

    // La distancia no se exige: dentro de la zona cercana la tarifa es plana y
    // no depende de ella. Sin coordenadas se cae al nombre de la comuna, que es
    // el caso degradado y cobra la plana.
    const distanceKm =
      coords && typeof coords.lat === 'number' && typeof coords.lng === 'number'
        ? haversineKm(
            { lat: Number(settings.shipping_origin_lat), lng: Number(settings.shipping_origin_lng) },
            coords
          )
        : null;

    const rawCost =
      Number(settings.shipping_base_fee || 0) +
      (distanceKm ?? 0) * Number(settings.shipping_price_per_km || 0);
    if (!Number.isFinite(rawCost) || rawCost < 0) {
      return { error: 'No se pudo calcular el costo de envío.' };
    }

    const quote = quoteAgendado({
      rawPrice: rawCost,
      subtotal,
      ciudad,
      distanceKm,
      maxDistanceKm: Number(settings.shipping_max_distance_km) || null,
      freeShippingMinimum: settings.free_shipping_enabled
        ? Number(settings.free_shipping_minimum ?? 0) || null
        : null,
    });

    if (!quote.disponible) {
      return { error: 'Esa dirección queda fuera de nuestra zona de reparto. Puedes retirar en tienda sin costo.' };
    }

    return { cost: quote.price };
  }

  if (shippingMethod === 'flash') {
    // El interruptor del panel también manda acá, no sólo al cotizar: un
    // checkout abierto antes de apagarlo podría mandar `flash` igual, y este
    // es el punto donde se cobra y se dispara al repartidor.
    const { data: ajustesFlash } = await supabaseServer
      .from('settings')
      .select('flash_delivery_enabled')
      .maybeSingle();
    if (ajustesFlash?.flash_delivery_enabled !== true) {
      return { error: 'El envío flash no está disponible en este momento.' };
    }
    if (!uberDirectConfigurado()) {
      return { error: 'El envío flash no está disponible en este momento.' };
    }

    // Regla 3: la entrega flash sólo se pide con la tienda abierta.
    //
    // Acá es donde de verdad importa: la cotización sólo esconde la opción,
    // pero este punto cobra y dispara al repartidor. Tenía un `|| true` puesto
    // para pruebas directas que anulaba la comprobación entera, así que un
    // checkout abierto a las 17:50 y confirmado a las 18:05 mandaba un
    // repartidor —que se cobra igual— a un local ya cerrado.
    //
    // La excepción para probar se conserva, pero acotada a quien administra la
    // tienda, igual que en `/api/shipping/flash`: depende de la sesión y un
    // cliente no puede activarla.
    const ahora = toZonedTime(new Date(), TIMEZONE);
    const abiertaReal = tiendaAbierta(
      format(ahora, 'yyyy-MM-dd'),
      getHours(ahora) * 60 + getMinutes(ahora)
    );
    // `horarioIgnorado()` es el mismo interruptor que usa la cotización, y su
    // comentario ya documenta este `|| true`. Antes acá se leían las variables
    // a mano, y una de ellas era `NEXT_PUBLIC_DEBUG_FLASH`: pública, o sea
    // visible en el navegador, que es un mal lugar del que colgar una regla de
    // servidor. La cotización nunca la respetó; ahora los dos puntos deciden
    // igual.
    const abierta = abiertaReal || horarioIgnorado() || (await esAdmin());
    if (!abierta) {
      return { error: 'El envío flash sólo se puede pedir con la tienda abierta. Puedes agendar tu entrega.' };
    }

    const info = params.shippingInfo || {};
    const calle = String(info.address || '');
    const comuna = String(info.city || ciudad || '');
    if (!calle || !comuna) {
      return { error: 'No pudimos validar la dirección de envío.' };
    }

    const { data: settings } = await supabaseServer
      .from('settings')
      .select('*')
      .eq('id', true)
      .maybeSingle();

    const minimoFlash =
      settings?.free_shipping_enabled === true
        ? Number(settings?.free_shipping_minimum_flash ?? MINIMO_FLASH_CLP_DEFAULT) ||
          MINIMO_FLASH_CLP_DEFAULT
        : null;

    // Regla 1: la segunda cotización, ahora que el cliente va a pagar.
    let cotizacion: Awaited<ReturnType<typeof cotizarFlash>>;
    try {
      cotizacion = await cotizarFlash({
        calle,
        comuna,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        telefono: info.phone ? String(info.phone) : null,
      });
    } catch (e) {
      console.error('[flash] no se pudo recotizar al crear el pedido:', e);
      return { error: 'No pudimos confirmar el envío flash. Intenta de nuevo o agenda tu entrega.' };
    }

    const quote = quoteFlash({
      costoUber: cotizacion ? cotizacion.costoCLP : null,
      subtotal,
      freeShippingMinimum: minimoFlash,
      tiendaAbierta: true,
    });

    if (!quote.disponible) {
      const porque =
        quote.motivo === 'sobre-el-tope'
          ? 'El envío flash está muy caro en este momento por alta demanda.'
          : 'Uber no está llegando a esa dirección en este momento.';
      return { error: `${porque} Puedes agendar tu entrega o retirar en tienda.` };
    }

    // Un envío gratis no necesita revalidarse: el cliente paga 0 igual, y la
    // diferencia la absorbe la tienda por definición.
    if (quote.freeApplied) {
      return { cost: 0, quoteIdFlash: cotizacion?.quoteId ?? null,
        quoteExpiraFlash: cotizacion?.expira ?? null,
      };
    }

    // Sin precio mostrado no hay contra qué comparar (por ejemplo, alguien que
    // llama la ruta directo). Se cobra lo que Uber cotiza ahora.
    if (params.precioFlashMostrado === null) {
      return { cost: quote.price, quoteIdFlash: cotizacion?.quoteId ?? null,
        quoteExpiraFlash: cotizacion?.expira ?? null,
      };
    }

    const revalidacion = revalidarFlash({
      precioMostrado: params.precioFlashMostrado,
      precioNuevo: quote.price,
    });

    if (!revalidacion.aceptable) {
      // No se cobra: se le avisa. Cambiarle el total a alguien que ya apretó
      // pagar es la clase de sorpresa que hace que no vuelva.
      return {
        error: `El costo del envío flash subió a $${quote.price.toLocaleString('es-CL')} mientras completabas el pedido. Vuelve a elegir el envío para confirmar el nuevo precio.`,
        recotizado: quote.price,
      };
    }

    return { cost: revalidacion.precioACobrar, quoteIdFlash: cotizacion?.quoteId ?? null,
        quoteExpiraFlash: cotizacion?.expira ?? null,
      };
  }

  return { error: 'Método de envío no válido.' };
}


export async function POST(request: NextRequest) {
  try {
    const { allowed, retryAfterSeconds } = rateLimit(`create-order:${getClientIp(request)}`, {
      limit: 10,
      windowMs: 5 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }


    // Modo vitrina: la tienda se puede mirar pero no vende todavía. Se
    // comprueba acá, antes de tocar stock, cupones o MercadoPago: si el
    // bloqueo viviera solo en la interfaz, bastaría con llamar esta ruta a
    // mano para generar un cobro por un pedido que nadie va a preparar.
    const ventas = await assertOrdersEnabled();
    if (!ventas.ok) {
      return NextResponse.json(
        { error: ventas.message, previewMode: true },
        { status: PREVIEW_HTTP_STATUS }
      );
    }

    const session = await getServerSession(authOptions);

    // Comprar exige cuenta. Se comprueba en el servidor y no sólo en la
    // pantalla: si el requisito viviera en la interfaz, bastaría con llamar
    // esta ruta a mano para crear un pedido anónimo. Un pedido sin cuenta no
    // tiene a quién avisarle de los cambios de estado ni quién lo consulte
    // después, y el correo no está verificado por nadie.
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Para comprar necesitas iniciar sesión.', requiereSesion: true },
        { status: 401 }
      );
    }

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

    // El checkout ofrece MercadoPago y sólo MercadoPago. Sin esta comprobación,
    // cualquier otro valor creaba una orden que ya había consumido stock y no
    // tenía forma de pagarse nunca: el link de pago sólo se genera para
    // `mercadopago`.
    if (paymentMethod !== 'mercadopago') {
      return NextResponse.json(
        { error: 'Método de pago no disponible.' },
        { status: 400 }
      );
    }

    const userId = (session?.user as any)?.id || null;

    // La entrega a domicilio se agenda: hay una sola ronda de reparto por
    // franja y el pedido tiene que caber en ella.
    if (shippingMethod === "agendado") {
      const { deliveryDate, deliveryTimeSlot } = shippingInfo;
      if (!deliveryDate || !deliveryTimeSlot) {
         return NextResponse.json({ error: 'Debe seleccionar una fecha y bloque horario para el envío a domicilio.' }, { status: 400 });
      }

      // 0a: El bloque tiene que existir para esa fecha. Fuera de la ronda de
      // reparto no hay quien lleve el pedido, así que no se acepta aunque el
      // navegador lo haya mandado.
      const slotsDelDia = slotsEconomicosForDate(deliveryDate);
      const slot = slotsDelDia.find((s) => s.id === deliveryTimeSlot);
      if (!slot) {
        return NextResponse.json({ error: 'El bloque horario seleccionado no está disponible para esa fecha.' }, { status: 400 });
      }

      // 0b: Verify slot hasn't reached maximum capacity dynamically
      const { data: slotOrders, error: slotErr } = await supabaseServer
        .from('orders')
        .select('shipping_address')
        .neq('status', 'cancelled');

      // Si la consulta falla no se puede saber cuántos pedidos hay en el
      // bloque, y aceptar ante la duda es lo que llena una ronda por encima de
      // lo que el reparto propio puede cubrir. Se rechaza y el cliente elige
      // otro bloque.
      if (slotErr || !slotOrders) {
        console.error('[Checkout] No se pudo verificar la capacidad del bloque:', slotErr);
        return NextResponse.json(
          { error: 'No pudimos verificar la disponibilidad de ese bloque. Intenta de nuevo o elige otro.' },
          { status: 503 }
        );
      }

      {
        const count = slotOrders.filter(o => {
          const addr = o.shipping_address as any;
          return addr && addr.deliveryDate === deliveryDate && slotMatches(slot, addr.deliveryTimeSlot);
        }).length;

        if (count >= MAX_ORDERS_PER_SLOT) {
          return NextResponse.json({ error: 'Lo sentimos, este bloque horario acaba de llenarse. Por favor seleccione otro.' }, { status: 400 });
        }
      }

      // 0c: La regla temporal del reparto propio. Lo que decide no es la fecha
      // pedida sino el turno en que el pedido se prepara: entra durante el
      // turno, sale en la ronda siguiente. Por eso nunca puede ser para hoy, y
      // por eso el corte necesita los minutos y no sólo la hora.
      const nowInChile = toZonedTime(new Date(), TIMEZONE);
      const nowMin = getHours(nowInChile) * 60 + getMinutes(nowInChile);
      const todayStr = format(nowInChile, "yyyy-MM-dd");

      if (!economicoSlotEsValido(deliveryDate, slot.id, todayStr, nowMin)) {
        const primera = primeraFechaEconomica(todayStr, nowMin);
        return NextResponse.json(
          {
            error: primera
              ? `Ese horario ya no se puede agendar: el pedido se prepara el día anterior a la ronda de reparto. La fecha más cercana disponible es el ${primera}.`
              : 'No hay fechas disponibles para el envío a domicilio en las próximas dos semanas.',
          },
          { status: 400 }
        );
      }
    }

    // 1. Validate Products & Prices
    // CartItem.id corresponde al barcode del producto (ver mapSupaToUI en services/products.ts)
    const { data: dbProducts, error: productsErr } = await supabaseServer
      .from('products')
      .select('id, barcode, stock, name, sale_price, offer_price, is_active')
      .in('barcode', items.map((i: any) => i.id));

    if (productsErr || !dbProducts) {
       return NextResponse.json({ error: 'No se pudo validar el stock de los productos.' }, { status: 500 });
    }

    // Regla de venta web: sólo se vende lo que tiene costo de proveedor y
    // precio revisado. Apagada por defecto, y cuando lo está no cuesta ni un
    // viaje a la base. Se comprueba acá, en el servidor, porque esconder el
    // producto del catálogo no impide que alguien llame esta ruta con su
    // código: el pedido se crearía igual y habría que salir a explicarle al
    // cliente por qué no llega.
    const bloqueados = await bloqueadosParaVenta(
      dbProducts.map((p: any) => String(p.barcode))
    );
    if (bloqueados.length > 0) {
      return NextResponse.json(
        { error: mensajeBloqueo(bloqueados), blocked: bloqueados.map((b) => b.barcode) },
        { status: 409 }
      );
    }

    // Un producto activo pero con precio 0 se cobraría a $0: abajo el subtotal
    // sale de multiplicar `sale_price * cantidad`. La vitrina ya los esconde,
    // pero esta ruta recibe códigos de barra, no lo que se vio en pantalla.
    const sinPrecio = sinPrecioCobrable(dbProducts as any[]);
    if (sinPrecio.length > 0) {
      console.error(
        "[checkout] pedido con productos sin precio:",
        sinPrecio.map((p) => p.barcode).join(", ")
      );
      return NextResponse.json(
        { error: mensajeBloqueo(sinPrecio), blocked: sinPrecio.map((p) => p.barcode) },
        { status: 409 }
      );
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

      // Se cobra el precio efectivo — la oferta si la hay, la lista si no —,
      // que es el mismo que la vitrina puso en el carrito. Acá se cobraba
      // `sale_price` a secas, ignorando la oferta: el 14-08-2026 un pedido real
      // salió $800 por encima de lo que el cliente vio en pantalla.
      const precioUnitario = precioEfectivo(dbProduct.sale_price, dbProduct.offer_price);

      calculatedSubtotal += precioUnitario * quantity;
      validatedOrderItems.push({
        product_id: dbProduct.id,
        name: dbProduct.name,
        price: precioUnitario,
        quantity,
        image: item.image
      });
    }

    // 2. Recalcular envío, cupón y puntos en servidor (nunca confiar en el cliente)
    const shippingResult = await calculateServerShippingCost({
      shippingMethod,
      coords: shippingInfo?.coords,
      subtotal: calculatedSubtotal,
      ciudad: shippingInfo?.city,
      shippingInfo,
      precioFlashMostrado:
        typeof body.flashPrecioMostrado === 'number' ? body.flashPrecioMostrado : null,
    });
    if ('error' in shippingResult) {
      return NextResponse.json(
        { error: shippingResult.error, recotizado: shippingResult.recotizado },
        { status: 400 }
      );
    }
    let serverShippingCost = shippingResult.cost;
    // El id de la cotización viaja con la dirección hasta el webhook de pago,
    // que es el único lugar donde se crea la entrega (regla 4).
    const quoteIdFlash = shippingResult.quoteIdFlash ?? null;

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
        shipping_address: {
          ...(typeof shippingInfo === 'object' && shippingInfo !== null ? shippingInfo : {}),
          ...(quoteIdFlash ? { uberQuoteId: quoteIdFlash } : {}),
          // Cuándo caduca esa cotización. Sin esto el despacho redimía una
          // cotización de edad desconocida y un checkout lento terminaba en un
          // pedido pagado que Uber rechazaba.
          ...(shippingResult.quoteExpiraFlash
            ? { uberQuoteExpira: shippingResult.quoteExpiraFlash }
            : {}),
          ...(pointsToRedeem > 0 ? { pointsRedeemed: pointsToRedeem } : {}),
        },
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

    /**
     * Deshace la orden: devuelve el stock ya descontado y la borra.
     *
     * Estaba escrito sólo dentro del `catch` de la reserva de stock, así que
     * los pasos siguientes fallaban dejando la orden viva y el stock
     * descontado: el producto desaparecía del inventario sin que nadie lo
     * hubiera comprado, y no había forma de recuperarlo salvo a mano.
     */
    const revertirOrden = async () => {
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
    };

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
      await revertirOrden();
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
      // Sin esto la orden quedaba creada, sin líneas y con el stock ya
      // descontado: inventario perdido y una orden imposible de atender.
      await revertirOrden();
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

    // El canje se descuenta antes de responder, y no dentro de la tarea suelta
    // de abajo. El descuento ya está aplicado al total que el cliente va a
    // pagar: si el canje se queda colgado —en serverless la ejecución puede
    // cortarse apenas se responde— el cliente paga menos y conserva los
    // puntos, y dos checkouts a la vez podían gastar los mismos puntos dos
    // veces.
    if (customerEmail && pointsToRedeem > 0) {
      try {
        await redeemPoints({
          customerEmail,
          points: pointsToRedeem,
          description: `Pago parcial de orden ${order.id}`,
        });
      } catch (err) {
        console.error('[Checkout] No se pudieron canjear los puntos:', err);
        await revertirOrden();
        return NextResponse.json(
          { error: 'No pudimos aplicar tus puntos. Intenta de nuevo.' },
          { status: 409 }
        );
      }
    }

    if (customerEmail) {
      // Handle Customer Upsert and Confirmation Email
      (async () => {
         try {
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

            // Los puntos ganados NO se acreditan acá. Se acreditaban al crear
            // el pedido, o sea antes de pagar y sin nada que los revirtiera:
            // bastaba llegar al checkout y abandonar el pago para acumular
            // puntos gastables. Ahora los da el webhook de MercadoPago cuando
            // el pago está confirmado.

            // El correo de "orden confirmada" **no** sale acá.
            //
            // Salía al crear el pedido, o sea antes de pagar, y dice "ORDEN
            // CONFIRMADA — ¡Gracias por tu pedido!". Quien abandonaba el pago
            // recibía igual la confirmación de una compra que nunca ocurrió, y
            // el pedido le aparecía en su historial como si estuviera todo
            // bien. Lo manda el webhook de MercadoPago cuando el pago está
            // confirmado, que es cuando la frase es cierta.

         } catch (err) {
            console.warn('[Checkout] Customer upsert task error:', err);
         }
      })();
    }

    // 8. Create MercadoPago Preference (only if payment method is mercadopago)
    let initPoint = null;
    // MercadoPago no acepta un cobro de $0. Con un cupón o unos puntos que
    // cubran todo, la preferencia lanzaba y la orden quedaba creada, con el
    // stock ya descontado y sin ninguna forma de pagarse.
    if (serverTotal <= 0) {
      await revertirOrden();
      return NextResponse.json(
        {
          error:
            'El total quedó en $0 y el pago no se puede procesar. Quita parte del descuento o agrega un producto.',
        },
        { status: 400 }
      );
    }

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
