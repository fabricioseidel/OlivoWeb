import { supabaseServer } from "@/lib/supabase-server";
import { applyReception, reverseReception } from "@/server/inventory.service";
import { TASA_IVA, aBruto, variacionCosto, UMBRAL_REVISION_COSTO } from "@/lib/pricing";

/**
 * El ciclo de compra: revisar, mandar, confirmar, recibir.
 *
 * Antes el pedido saltaba de "enviado" a "recibido" sin nada en el medio, y al
 * recibirlo el stock se movía con la cantidad PEDIDA. Si se pidieron 24 y
 * llegaron 18, entraban 24 y el sistema quedaba mintiendo por seis unidades
 * que nadie tiene — y como `products.stock` se recalcula desde `branch_stock`,
 * el error se propagaba a la venta web, que rechazaba pedidos por stock que sí
 * existía o aceptaba los que no.
 *
 * Acá vive lo que la base no puede hacer sola: mover el inventario con lo que
 * realmente llegó y devolverle al catálogo de precios el costo que vino en la
 * factura.
 */

export const CANALES = ["whatsapp", "online", "presencial", "telefono"] as const;
export type Canal = (typeof CANALES)[number];

export const ETIQUETA_CANAL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  online: "Compra online",
  presencial: "En persona",
  telefono: "Teléfono",
};

export type Disponibilidad = "pendiente" | "disponible" | "parcial" | "sin_stock";

export type LineaConfirmacion = {
  itemId: string;
  disponibilidad: Disponibilidad;
  /** Lo que el proveedor dijo que tiene. Se ignora salvo en 'parcial'. */
  cantidadConfirmada?: number | null;
};

export type LineaRecepcion = {
  itemId: string;
  /** Lo que realmente llegó. */
  cantidadRecibida: number;
  /** Costo unitario SIN IVA de la factura, si cambió. */
  costoFactura?: number | null;
};

export type VariacionDetectada = {
  itemId: string;
  barcode: string;
  nombre: string;
  costoPedido: number;
  costoFactura: number;
  variacion: number;
  /** Supera el umbral que manda el precio de venta a revisión. */
  relevante: boolean;
};

type Resultado<T = unknown> =
  | ({ ok: true } & (T extends object ? T : Record<never, never>))
  | { ok: false; error: string };

const entero = (valor: unknown): number | null => {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

/**
 * Marca el pedido como enviado por un canal concreto.
 *
 * Va por RPC porque la comprobación de "no volver a marcar como enviado algo ya
 * recibido" tiene que pasar en la misma transacción que la escritura. Hecha
 * acá, dos clics simultáneos leerían ambos el estado anterior.
 */
export async function marcarEnviado(
  orderId: string,
  canal: Canal,
  userId?: string | null
): Promise<Resultado> {
  if (!CANALES.includes(canal)) {
    return { ok: false, error: `Canal desconocido: ${canal}` };
  }

  const { data, error } = await supabaseServer.rpc("marcar_pedido_enviado", {
    p_order_id: orderId,
    p_channel: canal,
    p_user: userId && userId.trim() !== "" ? userId : null,
  });

  if (error) return { ok: false, error: error.message };
  if (data && data.ok === false) return { ok: false, error: String(data.error) };
  return { ok: true };
}

/**
 * Anota qué dijo el proveedor que tenía.
 *
 * Es el paso que faltaba: los proveedores no siempre tienen todo, y hasta ahora
 * eso sólo se descubría al recibir la mercadería. Saberlo antes permite pedirle
 * el resto a otro proveedor sin esperar a que llegue el camión.
 */
export async function confirmarDisponibilidad(
  orderId: string,
  lineas: LineaConfirmacion[],
  userId?: string | null
): Promise<Resultado<{ actualizadas: number }>> {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return { ok: false, error: "No hay líneas que confirmar" };
  }

  const { data: existentes, error: errorLectura } = await supabaseServer
    .from("supplier_order_items")
    .select("id, quantity")
    .eq("order_id", orderId);

  if (errorLectura) return { ok: false, error: errorLectura.message };

  const cantidadPedida = new Map(
    (existentes ?? []).map((i: any) => [i.id, Number(i.quantity) || 0])
  );

  let actualizadas = 0;
  for (const linea of lineas) {
    // Sólo se tocan líneas de ESTE pedido: el id llega del navegador y no se
    // puede confiar en que pertenezca al pedido que se está confirmando.
    const pedida = cantidadPedida.get(linea.itemId);
    if (pedida === undefined) continue;

    // La cantidad confirmada se deriva del estado salvo en 'parcial', que es el
    // único caso en que el número lo pone la persona. Si se aceptara siempre,
    // un "disponible" con cantidad 0 diría dos cosas contrarias a la vez.
    const confirmada =
      linea.disponibilidad === "disponible"
        ? pedida
        : linea.disponibilidad === "sin_stock"
          ? 0
          : linea.disponibilidad === "parcial"
            ? Math.min(entero(linea.cantidadConfirmada) ?? 0, pedida)
            : null;

    const { error } = await supabaseServer
      .from("supplier_order_items")
      .update({ availability: linea.disponibilidad, qty_confirmed: confirmada })
      .eq("id", linea.itemId)
      .eq("order_id", orderId);

    if (error) return { ok: false, error: error.message };
    actualizadas += 1;
  }

  const { error: errorPedido } = await supabaseServer
    .from("supplier_orders")
    .update({
      status: "confirmado",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId && userId.trim() !== "" ? userId : null,
    })
    .eq("id", orderId)
    .in("status", ["borrador", "en_revision", "pendiente", "enviado"]);

  if (errorPedido) return { ok: false, error: errorPedido.message };
  return { ok: true, actualizadas };
}

/**
 * Registra la recepción: mueve al inventario lo que llegó y guarda el costo real.
 *
 * Tres cosas que no se pueden separar:
 *
 * 1. El stock entra con `qty_received`, no con lo pedido.
 * 2. El costo de la factura vuelve a `product_suppliers.unit_cost` con
 *    `cost_source='recepcion'`, así que el trigger de la Fase 1 lo deja en el
 *    historial y la pantalla de precios de la Fase 2 marca el producto como
 *    "el costo cambió". Ese es el circuito completo que faltaba: el costo se
 *    mueve, se confirma al recibir, y el precio de venta vuelve a revisión.
 * 3. Lo pedido (`quantity`) NO se sobrescribe: la diferencia entre lo pedido y
 *    lo recibido es justamente el dato que hay que poder mirar después.
 */
export async function registrarRecepcion(
  orderId: string,
  lineas: LineaRecepcion[]
): Promise<Resultado<{ variaciones: VariacionDetectada[]; unidades: number }>> {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return { ok: false, error: "No hay líneas que recibir" };
  }

  const { data: pedido, error: errorPedido } = await supabaseServer
    .from("supplier_orders")
    .select("id, status, supplier_id")
    .eq("id", orderId)
    .maybeSingle();

  if (errorPedido) return { ok: false, error: errorPedido.message };
  if (!pedido) return { ok: false, error: "El pedido no existe" };
  if (pedido.status === "recibido") {
    return { ok: false, error: "Este pedido ya fue recibido" };
  }
  if (pedido.status === "cancelado") {
    return { ok: false, error: "Este pedido está cancelado" };
  }

  const { data: items, error: errorItems } = await supabaseServer
    .from("supplier_order_items")
    .select("id, quantity, unit_cost, tax_rate, products(barcode, name)")
    .eq("order_id", orderId);

  if (errorItems) return { ok: false, error: errorItems.message };

  const porId = new Map((items ?? []).map((i: any) => [i.id, i]));
  const ahora = new Date().toISOString();

  const paraStock: { barcode: string; qty: number; name?: string | null }[] = [];
  const variaciones: VariacionDetectada[] = [];

  for (const linea of lineas) {
    const item = porId.get(linea.itemId);
    if (!item) continue;

    const recibida = entero(linea.cantidadRecibida);
    if (recibida === null) {
      return { ok: false, error: "La cantidad recibida tiene que ser un entero no negativo" };
    }

    const producto = Array.isArray(item.products) ? item.products[0] : item.products;
    const costoPedido = Number(item.unit_cost) || 0;
    const costoFactura =
      linea.costoFactura === null || linea.costoFactura === undefined
        ? null
        : Number(linea.costoFactura);

    if (costoFactura !== null && !Number.isFinite(costoFactura)) {
      return { ok: false, error: "El costo de la factura no es un número" };
    }

    const costoFinal = costoFactura ?? costoPedido;
    const tasa = Number(item.tax_rate) || TASA_IVA;

    const { error } = await supabaseServer
      .from("supplier_order_items")
      .update({
        qty_received: recibida,
        unit_cost_received: costoFinal,
        received_at: ahora,
        // El subtotal pasa a ser lo que de verdad se factura por esta línea.
        // El CHECK viejo lo impedía; por eso la Fase 3 lo retira.
        subtotal: Number((recibida * costoFinal).toFixed(2)),
      })
      .eq("id", linea.itemId)
      .eq("order_id", orderId);

    if (error) return { ok: false, error: error.message };

    if (producto?.barcode && recibida > 0) {
      paraStock.push({ barcode: producto.barcode, qty: recibida, name: producto.name });
    }

    const delta = variacionCosto(costoPedido, costoFinal);
    if (delta !== null && delta !== 0 && producto?.barcode) {
      variaciones.push({
        itemId: linea.itemId,
        barcode: producto.barcode,
        nombre: producto.name ?? producto.barcode,
        costoPedido,
        costoFactura: costoFinal,
        variacion: delta,
        relevante: Math.abs(delta) >= UMBRAL_REVISION_COSTO,
      });

      // El costo confirmado por la factura manda sobre el que estaba cargado.
      // Escribirlo dispara el trigger del historial y hace que la pantalla de
      // precios pida revisar el precio de venta de este producto.
      await supabaseServer
        .from("product_suppliers")
        .update({
          unit_cost: costoFinal,
          tax_rate: tasa,
          cost_source: "recepcion",
          cost_updated_at: ahora,
        })
        .eq("product_id", producto.barcode)
        .eq("supplier_id", pedido.supplier_id);
    }
  }

  if (paraStock.length > 0) {
    const resultado = await applyReception(paraStock, {
      reference: orderId,
      reason: `Recepción pedido proveedor #${orderId.slice(0, 8)}`,
    });
    if (!resultado.ok) {
      return { ok: false, error: resultado.error ?? "No se pudo mover el inventario" };
    }
  }

  const { error: errorEstado } = await supabaseServer
    .from("supplier_orders")
    .update({
      status: "recibido",
      delivered_date: ahora.split("T")[0],
    })
    .eq("id", orderId)
    .neq("status", "recibido");

  if (errorEstado) return { ok: false, error: errorEstado.message };

  return {
    ok: true,
    variaciones,
    unidades: paraStock.reduce((s, i) => s + i.qty, 0),
  };
}

/**
 * Deshace una recepción, devolviendo al inventario exactamente lo que entró.
 *
 * Usa `qty_received` y no `quantity` por la misma razón que la entrada: revertir
 * con lo pedido descontaría unidades que nunca llegaron.
 */
export async function revertirRecepcion(orderId: string): Promise<Resultado> {
  const { data: items, error } = await supabaseServer
    .from("supplier_order_items")
    .select("qty_received, quantity, products(barcode, name)")
    .eq("order_id", orderId);

  if (error) return { ok: false, error: error.message };

  const paraStock = (items ?? [])
    .map((i: any) => {
      const producto = Array.isArray(i.products) ? i.products[0] : i.products;
      const cantidad = i.qty_received ?? i.quantity;
      return producto?.barcode && Number(cantidad) > 0
        ? { barcode: producto.barcode, qty: Number(cantidad), name: producto.name }
        : null;
    })
    .filter((i): i is { barcode: string; qty: number; name: string } => i !== null);

  if (paraStock.length > 0) {
    const resultado = await reverseReception(paraStock, {
      reference: orderId,
      reason: `Cancelación pedido proveedor #${orderId.slice(0, 8)}`,
    });
    if (!resultado.ok) {
      return { ok: false, error: resultado.error ?? "No se pudo revertir el inventario" };
    }
  }

  return { ok: true };
}

type LineaMensaje = {
  nombre: string;
  sku: string | null;
  cantidad: number;
  costoNeto: number | null;
  tasa: number;
};

/**
 * El texto del pedido, adaptado a por dónde va a salir.
 *
 * WhatsApp y teléfono los lee el proveedor: llevan precios, porque es la
 * referencia contra la que confirma. La guía para comprar en persona la lee
 * quien va al local, así que lleva casillas para marcar y espacio para anotar
 * el precio real — que es el dato que después detecta la variación de costo.
 */
export function generarMensajeCompra(
  canal: Canal,
  pedido: { id: string; proveedor: string; fechaEsperada?: string | null; notas?: string | null },
  lineas: LineaMensaje[]
): string {
  const referencia = `#${pedido.id.slice(0, 8)}`;
  const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

  if (canal === "presencial") {
    const filas = lineas
      .map(
        (l, i) =>
          `[ ] ${i + 1}. ${l.nombre}${l.sku ? ` (${l.sku})` : ""}\n` +
          `      Pedir: ${l.cantidad}   Llegó: ____   Precio pagado: ________`
      )
      .join("\n");

    return (
      `GUÍA DE COMPRA ${referencia}\n` +
      `Proveedor: ${pedido.proveedor}\n` +
      `Fecha: ${new Date().toLocaleDateString("es-CL")}\n\n` +
      `${filas}\n\n` +
      `Anotá lo que realmente traigas y el precio de la boleta: con eso el\n` +
      `sistema detecta si el proveedor cambió el costo.` +
      (pedido.notas ? `\n\nNotas: ${pedido.notas}` : "")
    );
  }

  const filas = lineas
    .map((l) => {
      const bruto = l.costoNeto === null ? null : aBruto(l.costoNeto, l.tasa);
      const precio = bruto === null ? "precio a confirmar" : `${clp(bruto)} c/u con IVA`;
      return `• ${l.nombre}${l.sku ? ` (${l.sku})` : ""} — ${l.cantidad} un. · ${precio}`;
    })
    .join("\n");

  const totalBruto = lineas.reduce((s, l) => {
    const bruto = l.costoNeto === null ? 0 : (aBruto(l.costoNeto, l.tasa) ?? 0);
    return s + bruto * l.cantidad;
  }, 0);

  const encabezado =
    canal === "online"
      ? `Pedido ${referencia} — ${pedido.proveedor}`
      : `Hola! Va el pedido ${referencia}`;

  return (
    `${encabezado}\n\n${filas}\n\n` +
    `Total estimado: ${clp(totalBruto)} (IVA incluido)\n` +
    (pedido.fechaEsperada
      ? `Fecha esperada: ${new Date(pedido.fechaEsperada).toLocaleDateString("es-CL")}\n`
      : "") +
    `\n¿Tenés todo disponible? Si falta algo, avisame qué cantidad podés mandar.` +
    (pedido.notas ? `\n\n${pedido.notas}` : "")
  );
}
