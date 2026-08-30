import { getShippingInfo, formatCLP } from "@/lib/seo/shipping-info";
import {
  ENTREGA,
  RADIO_DESPACHO_KM_DEFAULT,
  RADIO_ZONA_PLANA_KM,
  TARIFA_ZONA_PLANA_CLP,
} from "@/lib/shipping-policy";
import type { ComunaSlug } from "@/lib/seo/business";

/**
 * Tarifas y plazos de despacho propio, leídos de la configuración real de la
 * tienda y de las reglas de `shipping-policy`. Es data, no prose: el texto
 * diferenciador de cada comuna vive en su página.
 */
export default async function DespachoInfo({ comuna: _comuna }: { comuna?: ComunaSlug }) {
  const info = await getShippingInfo();

  const filas: Array<{ label: string; value: string; destacado?: boolean }> = [];

  // Las filas se expresan por distancia y no por comuna, porque eso es lo que
  // el checkout cobra. Publicarlo por comuna prometía la tarifa plana en todo
  // Ñuñoa, cuando en realidad rige dentro del radio: quien vivía en el mismo
  // Ñuñoa pero más lejos veía un precio que después no se le respetaba.
  if (info.dynamicEnabled) {
    filas.push({
      label: `Hasta ${RADIO_ZONA_PLANA_KM} km del local`,
      value: formatCLP(TARIFA_ZONA_PLANA_CLP),
      destacado: true,
    });
    filas.push({
      label: `Hasta ${RADIO_DESPACHO_KM_DEFAULT} km`,
      value: "Según distancia",
    });
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
