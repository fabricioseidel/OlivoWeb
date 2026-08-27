import { getShippingInfo, formatCLP } from "@/lib/seo/shipping-info";
import { TOPE_POR_COMUNA, ENTREGA } from "@/lib/shipping-policy";
import type { ComunaSlug } from "@/lib/seo/business";

/**
 * Tarifas y plazos de despacho propio, leídos de la configuración real de la
 * tienda y de las reglas de `shipping-policy`. Es data, no prose: el texto
 * diferenciador de cada comuna vive en su página.
 */
export default async function DespachoInfo({ comuna }: { comuna?: ComunaSlug }) {
  const info = await getShippingInfo();
  const tope = comuna ? TOPE_POR_COMUNA[comuna] : undefined;

  const filas: Array<{ label: string; value: string; destacado?: boolean }> = [];

  if (typeof tope === "number") {
    // Con tope, la tarifa por km deja de ser la información relevante
    filas.push({ label: "Despacho en tu comuna", value: `Máximo ${formatCLP(tope)}`, destacado: true });
  } else if (info.dynamicEnabled && info.baseFee !== null && info.pricePerKm !== null) {
    filas.push({ label: "Tarifa base", value: formatCLP(info.baseFee) });
    filas.push({ label: "Por kilómetro", value: formatCLP(info.pricePerKm) });
  } else if (info.localDeliveryFee !== null) {
    filas.push({ label: "Despacho local", value: formatCLP(info.localDeliveryFee) });
  }

  if (info.freeShippingEnabled && info.freeShippingMinimum !== null) {
    filas.push({
      label: "Despacho gratis desde",
      value: formatCLP(info.freeShippingMinimum),
      destacado: true,
    });
  }

  filas.push({ label: "Horario de entrega", value: ENTREGA.ventana });

  if (filas.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
      <dl className="space-y-2">
        {filas.map((f) => (
          <div key={f.label} className="flex justify-between gap-4">
            <dt className="text-brand-900 font-medium">{f.label}</dt>
            <dd className={`text-brand-900 ${f.destacado ? "font-semibold" : "font-bold"}`}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-brand-800">{ENTREGA.resumen}</p>
      <p className="mt-2 text-xs text-brand-700">
        Valores vigentes según la configuración de la tienda; el costo final se confirma al cerrar el
        pedido. {ENTREGA.retiroEnTienda}
      </p>
    </div>
  );
}
