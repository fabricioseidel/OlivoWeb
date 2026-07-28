import { getShippingInfo, formatCLP } from "@/lib/seo/shipping-info";

/**
 * Tabla de tarifas de despacho leída de la configuración real de la tienda.
 * Es data, no prose: el texto diferenciador de cada comuna vive en su página.
 */
export default async function DespachoInfo() {
  const info = await getShippingInfo();

  const filas: Array<{ label: string; value: string }> = [];

  if (info.dynamicEnabled && info.baseFee !== null && info.pricePerKm !== null) {
    filas.push({ label: "Tarifa base", value: formatCLP(info.baseFee) });
    filas.push({ label: "Por kilómetro", value: formatCLP(info.pricePerKm) });
  } else if (info.localDeliveryFee !== null) {
    filas.push({ label: "Despacho local", value: formatCLP(info.localDeliveryFee) });
  }

  if (info.freeShippingEnabled && info.freeShippingMinimum !== null) {
    filas.push({
      label: "Despacho gratis desde",
      value: formatCLP(info.freeShippingMinimum),
    });
  }

  if (filas.length === 0) return null;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
      <dl className="space-y-2">
        {filas.map((f) => (
          <div key={f.label} className="flex justify-between gap-4">
            <dt className="text-emerald-900 font-medium">{f.label}</dt>
            <dd className="font-black text-emerald-900">{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-emerald-700">
        Valores vigentes según la configuración de la tienda. El costo final se calcula por distancia
        al confirmar el pedido.
      </p>
    </div>
  );
}
