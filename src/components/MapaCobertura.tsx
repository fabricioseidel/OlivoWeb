"use client";

/**
 * Mapa de la zona de reparto, con los dos radios reales del despacho propio.
 *
 * Reemplaza al iframe de Google Maps que había antes: aquel no mostraba
 * cobertura —sólo el pin del local—, cargaba scripts de terceros y no se podía
 * pintar con los colores de la marca.
 *
 * Los tiles son de OpenStreetMap: gratuitos y sin API key. La atribución es
 * obligatoria y por eso está siempre visible, no escondida detrás de un
 * control. El mapa se carga sólo cuando entra en pantalla, que además de
 * ahorrar tráfico mantiene el uso dentro de lo que la política de OSM
 * considera razonable.
 */

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { BUSINESS } from "@/lib/seo/business";
import {
  radioDibujableMetros,
  RADIO_DESPACHO_KM_DEFAULT,
  RADIO_ZONA_PLANA_KM,
  TARIFA_ZONA_PLANA_CLP,
} from "@/lib/shipping-policy";

type Props = {
  /** Alto del mapa. Se deja pasar para que la landing y el checkout difieran. */
  className?: string;
  /** Radio máximo de reparto, si el admin configuró uno distinto al de fábrica. */
  radioMaximoKm?: number;
};

export default function MapaCobertura({ className, radioMaximoKm }: Props) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [listo, setListo] = useState(false);
  const [falló, setFalló] = useState(false);

  const radioMax = radioMaximoKm ?? RADIO_DESPACHO_KM_DEFAULT;
  const { latitude, longitude } = BUSINESS.geo;

  // Sólo se monta cuando el bloque entra en pantalla: el mapa está abajo en las
  // landings y cargarlo de entrada retrasa lo que el visitante vino a leer.
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => entradas.some((e) => e.isIntersecting) && setVisible(true),
      { rootMargin: "200px" }
    );
    obs.observe(nodo);
    return () => obs.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || latitude == null || longitude == null) return;
    let mapa: import("leaflet").Map | null = null;
    let cancelado = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelado || !contenedor.current) return;

        const centro: [number, number] = [latitude, longitude];
        mapa = L.map(contenedor.current, {
          center: centro,
          zoom: 13,
          scrollWheelZoom: false, // Atrapar el scroll de la página enoja al visitante.
          attributionControl: true,
        });

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapa);

        // Los colores salen de los tokens de marca, no de hex sueltos: la
        // paleta se recalcula sola si el dueño cambia el color primario.
        const raiz = getComputedStyle(document.documentElement);
        const marca = raiz.getPropertyValue("--color-brand-600").trim() || "#059669";
        const marcaSuave = raiz.getPropertyValue("--color-brand-400").trim() || marca;

        // El radio máximo primero, para que el de tarifa plana quede encima.
        L.circle(centro, {
          radius: radioDibujableMetros(radioMax),
          color: marcaSuave,
          weight: 1.5,
          opacity: 0.7,
          fillColor: marcaSuave,
          fillOpacity: 0.08,
          dashArray: "6 6",
        }).addTo(mapa);

        L.circle(centro, {
          radius: radioDibujableMetros(RADIO_ZONA_PLANA_KM),
          color: marca,
          weight: 2,
          fillColor: marca,
          fillOpacity: 0.18,
        }).addTo(mapa);

        L.marker(centro, {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:18px;height:18px;border-radius:9999px;background:${marca};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          title: BUSINESS.name,
        })
          .addTo(mapa)
          .bindPopup(`<strong>${BUSINESS.name}</strong><br>${BUSINESS.addressFull}`);

        // El encuadre sale del círculo más grande, así que el mapa siempre
        // muestra la cobertura completa sea cual sea el radio configurado.
        //
        // Se calcula con `toBounds` y no con `circle.getBounds()`: lo segundo
        // necesita que el círculo ya esté agregado a un mapa, y suelto lanza
        // excepción — que era lo que dejaba el cartel de error encima de un
        // mapa perfectamente dibujado.
        mapa.fitBounds(L.latLng(centro).toBounds(radioDibujableMetros(radioMax) * 2), {
          padding: [16, 16],
        });

        if (!cancelado) setListo(true);
      } catch (e) {
        console.error("No se pudo cargar el mapa de cobertura:", e);
        if (!cancelado) setFalló(true);
      }
    })();

    return () => {
      cancelado = true;
      mapa?.remove();
    };
  }, [visible, latitude, longitude, radioMax]);

  // Sin coordenadas no se dibuja un mapa inventado. Es la misma regla que el
  // resto del sitio: no se informa lo que no se puede saber.
  if (latitude == null || longitude == null) return null;

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
        <div
          ref={contenedor}
          className="h-72 w-full md:h-96"
          role="img"
          aria-label={`Mapa de la zona de reparto de ${BUSINESS.name}: tarifa plana hasta ${RADIO_ZONA_PLANA_KM} km y reparto propio hasta ${radioMax} km desde ${BUSINESS.addressFull}`}
        />
        {falló && !listo && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 p-6 text-center">
            <p className="text-sm text-neutral-600">
              No pudimos cargar el mapa. Repartimos hasta {radioMax} km desde {BUSINESS.addressFull}.
            </p>
          </div>
        )}
      </div>

      {/* La leyenda no es decorativa: sin ella dos círculos verdes no dicen
          nada, y el precio es justamente lo que cambia entre uno y otro. */}
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full border-2 border-brand-600 bg-brand-600/30"
          />
          <span className="text-neutral-700">
            Hasta {RADIO_ZONA_PLANA_KM} km: envío ${TARIFA_ZONA_PLANA_CLP.toLocaleString("es-CL")}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full border-2 border-dashed border-brand-400"
          />
          <span className="text-neutral-700">Hasta {radioMax} km: envío según distancia</span>
        </li>
      </ul>
    </div>
  );
}
