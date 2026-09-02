/**
 * Sacar la comuna chilena de una dirección de OpenStreetMap.
 *
 * Nominatim no tiene un campo "comuna": reparte esa información entre `city`,
 * `municipality`, `city_district`, `suburb` y otros, y cuál usa depende de la
 * dirección. Para el Gran Santiago lo típico es que `city` diga **"Santiago"**
 * —la ciudad— mientras la comuna real queda en otro campo.
 *
 * Eso hacía que toda dirección de Ñuñoa, Macul o Peñalolén se guardara como
 * "Santiago": el checkout lo mostraba así, se le mandaba así a Uber y quedaba
 * así en el pedido.
 *
 * La estrategia no es adivinar el campo correcto —cambia según la dirección—
 * sino **buscar en todos el primero que sea una comuna que atendemos**. Si
 * ninguno lo es, se cae al orden de especificidad, que para una dirección
 * fuera de la zona sigue siendo mejor que quedarse con la ciudad.
 */

import { comunaToSlug } from "@/lib/shipping-policy";

/** Los campos de `address` de Nominatim, del más específico al más general. */
const CAMPOS_POR_ESPECIFICIDAD = [
  "municipality",
  "city_district",
  "borough",
  "suburb",
  "town",
  "village",
  "city",
  "county",
  "state_district",
] as const;

export type DireccionOSM = Partial<Record<(typeof CAMPOS_POR_ESPECIFICIDAD)[number], string>> &
  Record<string, unknown>;

export type ComunaElegida = {
  /** El nombre a guardar y mostrar. `null` si la dirección no trae ninguno. */
  nombre: string | null;
  /** De qué campo salió, para poder depurarlo sin adivinar. */
  campo: string | null;
  /** `true` si es una de las comunas que atendemos. */
  reconocida: boolean;
};

/**
 * Elige la comuna de una dirección de Nominatim.
 *
 * Prioriza que el valor sea una comuna conocida por sobre el campo del que
 * venga: es la única regla que funciona sin saber de antemano cómo etiquetó
 * OpenStreetMap esa dirección en particular.
 */
export function elegirComuna(address: DireccionOSM | null | undefined): ComunaElegida {
  if (!address) return { nombre: null, campo: null, reconocida: false };

  const candidatos = CAMPOS_POR_ESPECIFICIDAD.map((campo) => ({
    campo,
    valor: typeof address[campo] === "string" ? (address[campo] as string).trim() : "",
  })).filter((c) => c.valor !== "");

  // 1. El primero que sea una comuna que atendemos, mire el campo que mire.
  const conocida = candidatos.find((c) => comunaToSlug(c.valor) !== null);
  if (conocida) {
    return { nombre: conocida.valor, campo: conocida.campo, reconocida: true };
  }

  // 2. Si no, el más específico que haya. Para una dirección fuera de la zona
  //    "Providencia" sigue siendo más útil que "Santiago".
  const primero = candidatos[0];
  return primero
    ? { nombre: primero.valor, campo: primero.campo, reconocida: false }
    : { nombre: null, campo: null, reconocida: false };
}
