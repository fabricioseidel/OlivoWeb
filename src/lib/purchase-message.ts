import { aBruto } from "@/lib/pricing";
import type { Canal } from "@/lib/purchase-channels";

/**
 * El texto del pedido a proveedor.
 *
 * Vive acá, y no dentro del servicio, porque lo necesitan los dos lados: el
 * servidor al mandar el pedido y el navegador para la vista previa mientras se
 * ajustan las cantidades. Duplicarlo sería repetir el error que la Fase 1 vino
 * a corregir — la fórmula del precio estaba copiada nueve veces, y cambiar el
 * margen obligaba a acordarse de las nueve.
 *
 * Es puro: sin base de datos y sin estado.
 */

export type LineaMensaje = {
  nombre: string;
  sku: string | null;
  cantidad: number;
  /** Costo unitario SIN IVA. `null` cuando no hay costo cargado. */
  costoNeto: number | null;
  tasa: number;
};

export type PedidoMensaje = {
  id: string;
  proveedor: string;
  fechaEsperada?: string | null;
  notas?: string | null;
};

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

const fecha = (valor: string | null | undefined) => {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("es-CL");
};

/**
 * Arma el texto según por dónde va a salir.
 *
 * WhatsApp, online y teléfono los lee el proveedor: llevan precios, porque es
 * la referencia contra la que confirma. La guía presencial la lee quien va al
 * local, así que lleva casillas para marcar y espacio para anotar el precio
 * pagado — que es el dato con el que después se detecta la variación de costo.
 */
export function generarMensajeCompra(
  canal: Canal,
  pedido: PedidoMensaje,
  lineas: LineaMensaje[]
): string {
  const referencia = `#${pedido.id.slice(0, 8)}`;
  // Una línea con cantidad cero no se pide: mandarla sólo confunde al proveedor.
  const items = lineas.filter((l) => l.cantidad > 0);

  if (canal === "presencial") {
    const filas = items
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

  const filas = items
    .map((l) => {
      const bruto = l.costoNeto === null ? null : aBruto(l.costoNeto, l.tasa);
      const precio = bruto === null ? "precio a confirmar" : `${clp(bruto)} c/u con IVA`;
      return `• ${l.nombre}${l.sku ? ` (${l.sku})` : ""} — ${l.cantidad} un. · ${precio}`;
    })
    .join("\n");

  const totalBruto = items.reduce((s, l) => {
    const bruto = l.costoNeto === null ? 0 : (aBruto(l.costoNeto, l.tasa) ?? 0);
    return s + bruto * l.cantidad;
  }, 0);

  const encabezado =
    canal === "online"
      ? `Pedido ${referencia} — ${pedido.proveedor}`
      : `Hola! Va el pedido ${referencia}`;

  const esperada = fecha(pedido.fechaEsperada);

  return (
    `${encabezado}\n\n${filas}\n\n` +
    `Total estimado: ${clp(totalBruto)} (IVA incluido)\n` +
    (esperada ? `Fecha esperada: ${esperada}\n` : "") +
    `\n¿Tenés todo disponible? Si falta algo, avisame qué cantidad podés mandar.` +
    (pedido.notas ? `\n\n${pedido.notas}` : "")
  );
}
