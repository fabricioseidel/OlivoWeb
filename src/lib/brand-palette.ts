/**
 * Escala de marca: de un color a los once tonos que usa la interfaz.
 *
 * El panel deja elegir UN color primario, pero la interfaz usa una escala
 * completa (`brand-50` para fondos suaves, `brand-600` para botones,
 * `brand-950` para el pie). Había que derivar los once desde ese único color.
 *
 * Por qué no basta con `color-mix`
 * --------------------------------
 * Mezclar el color con blanco y negro parece la solución obvia, pero produce
 * tonos claros lavados: las escalas reales no son una rampa plana de
 * luminosidad. Midiendo emerald en OKLCH se ve la forma verdadera —
 *
 *     paso:   50   100   200   300   400   500   600   700   800   900   950
 *     croma: 0.16  0.40  0.70  1.02  1.20  1.17  1.00  0.82  0.68  0.57  0.38
 *                                     ↑ el croma SUBE hasta el 400
 *
 * Los tonos claros son MÁS saturados que el color base, no menos. Y además el
 * tono gira: emerald se va casi 10° hacia el azul en el extremo oscuro.
 *
 * Mezclar con blanco hace exactamente lo contrario y por eso se ve apagado.
 *
 * Qué hace este módulo
 * --------------------
 * Toma ese perfil medido y lo reaplica al color que elijas: conserva TU tono,
 * escala el croma en proporción al que tenga tu color, y usa la luminosidad
 * del perfil. Consecuencias buscadas:
 *
 * - Con el verde por defecto devuelve la escala emerald original, así que
 *   cambiar el sitio a este sistema no altera ni un píxel hasta que alguien
 *   toque el color.
 * - Con un color apagado la escala sale apagada; con uno vivo, viva. No se
 *   inventa saturación que el color elegido no tiene.
 *
 * Todo es puro y sin dependencias, así que se puede probar de verdad.
 */

/**
 * Perfil medido sobre emerald: [luminosidad, croma relativo al 600, giro de tono].
 *
 * El tercer número existe porque las escalas reales no mantienen el tono fijo:
 * emerald gira casi 10° hacia el azul en el extremo oscuro. Sin ese giro los
 * pasos 500 y 950 quedaban visiblemente distintos del original. Al guardarlo
 * como desplazamiento —y no como tono absoluto— el mismo perfil sirve para
 * cualquier color que se elija.
 */
const PERFIL: Record<number, [number, number, number]> = {
  50: [0.979319, 0.162298, 2.887],
  100: [0.950457, 0.398222, -0.175],
  200: [0.904941, 0.702315, 0.925],
  300: [0.845186, 1.019857, 1.753],
  400: [0.772944, 1.204620, -0.002],
  500: [0.695873, 1.169960, -0.746],
  600: [0.595971, 1.0, 0.0],
  700: [0.508127, 0.823577, 2.387],
  800: [0.431800, 0.678661, 3.687],
  900: [0.378048, 0.573180, 5.714],
  950: [0.262100, 0.382567, 9.327],
};

export const PASOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type PasoMarca = (typeof PASOS)[number];

/** Verde por defecto del sitio (emerald-600). */
export const COLOR_PRIMARIO_DEFECTO = "#059669";

const aLineal = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const aSrgb = (c: number) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

const raizCubica = (x: number) => (x < 0 ? -Math.cbrt(-x) : Math.cbrt(x));

type Rgb = [number, number, number];
type Oklch = { L: number; C: number; H: number };

/** Acepta `#abc`, `#aabbcc` y con o sin `#`. Devuelve null si no es un color. */
export function leerHex(hex: string): Rgb | null {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const aHex = ([r, g, b]: Rgb) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

function rgbAOklch([r, g, b]: Rgb): Oklch {
  const lr = aLineal(r), lg = aLineal(g), lb = aLineal(b);
  const l = raizCubica(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = raizCubica(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = raizCubica(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return {
    L,
    C: Math.hypot(a, bb),
    H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

function oklchARgbCrudo({ L, C, H }: Oklch): { rgb: Rgb; dentroDeGama: boolean } {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);

  const lineal = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  // Fuera de gama significa que ese color no existe en pantalla: hay que
  // bajarle el croma hasta que entre, no recortarlo (recortar cambia el tono).
  const dentroDeGama = lineal.every((c) => c >= -0.0001 && c <= 1.0001);
  return { rgb: lineal.map(aSrgb) as Rgb, dentroDeGama };
}

/**
 * Convierte a RGB bajando el croma si el color no cabe en la pantalla.
 *
 * Recortar cada canal por separado —lo que hace la conversión ingenua— tuerce
 * el tono: un rojo intenso puede terminar anaranjado. Bajar el croma conserva
 * el tono, que es lo que la persona eligió.
 */
function oklchARgb(color: Oklch): Rgb {
  const directo = oklchARgbCrudo(color);
  if (directo.dentroDeGama) return directo.rgb;

  let rgb = directo.rgb;

  let bajo = 0;
  let alto = color.C;
  for (let i = 0; i < 20; i++) {
    const medio = (bajo + alto) / 2;
    const intento = oklchARgbCrudo({ ...color, C: medio });
    if (intento.dentroDeGama) {
      bajo = medio;
      rgb = intento.rgb;
    } else {
      alto = medio;
    }
  }
  return rgb;
}

/**
 * La escala completa a partir del color primario.
 *
 * Devuelve `null` si el color no se entiende, para que quien llame decida —
 * normalmente, quedarse con la escala por defecto en vez de pintar el sitio
 * de un color inventado.
 */
export function escalaDeMarca(hexPrimario: string): Record<PasoMarca, string> | null {
  const rgb = leerHex(hexPrimario);
  if (!rgb) return null;

  const base = rgbAOklch(rgb);
  const escala = {} as Record<PasoMarca, string>;

  for (const paso of PASOS) {
    const [luminosidad, cromaRelativo, giroDeTono] = PERFIL[paso];
    escala[paso] = aHex(
      oklchARgb({
        L: luminosidad,
        C: base.C * cromaRelativo,
        H: (base.H + giroDeTono + 360) % 360,
      })
    );
  }

  return escala;
}

/** Luminancia relativa WCAG de un color ya en RGB. */
function luminancia([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map(aLineal);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Razón de contraste WCAG entre dos colores. Va de 1 (iguales) a 21. */
export function contraste(hexA: string, hexB: string): number {
  const a = leerHex(hexA);
  const b = leerHex(hexB);
  if (!a || !b) return 1;
  const [alta, baja] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alta + 0.05) / (baja + 0.05);
}

/** Mínimo WCAG AA para texto normal. El texto grande se conforma con 3. */
export const CONTRASTE_AA = 4.5;

/**
 * Mueve un color hasta que contraste lo suficiente con otro.
 *
 * Se mueve SOLO la luminosidad en OKLCH: se conservan el tono y el croma, así
 * que sigue siendo el color que la persona eligió en el panel, apenas más
 * oscuro o más claro. Bajar el croma o girar el tono habrían cambiado el color
 * de la marca, que es justamente lo que no se quiere tocar.
 *
 * Busca el punto MÁS CERCANO al original que cumple, no uno cómodo lejos del
 * borde: el objetivo es que se lea, no repintar la marca. Si el color ya
 * cumple, vuelve intacto.
 *
 * La dirección se decide sola: si `contra` es claro hay que oscurecer, y si es
 * oscuro hay que aclarar. El extremo correspondiente siempre cumple (blanco
 * sobre negro da 21:1), así que la búsqueda binaria converge sin necesitar una
 * salida de emergencia.
 */
export function ajustarHastaContraste(
  hex: string,
  contra: string,
  contrasteMinimo: number = CONTRASTE_AA
): string {
  const rgb = leerHex(hex);
  const rgbContra = leerHex(contra);
  if (!rgb || !rgbContra) return hex;

  const propio = aHex(rgb);
  if (contraste(propio, contra) >= contrasteMinimo) return propio;

  const base = rgbAOklch(rgb);
  const extremo = luminancia(rgbContra) > 0.1791 ? 0 : 1;

  let cerca = base.L;
  let lejos = extremo;
  let mejor = aHex(oklchARgb({ ...base, L: extremo }));

  for (let i = 0; i < 24; i++) {
    const medio = (cerca + lejos) / 2;
    const intento = aHex(oklchARgb({ ...base, L: medio }));
    if (contraste(intento, contra) >= contrasteMinimo) {
      lejos = medio;
      mejor = intento;
    } else {
      cerca = medio;
    }
  }

  return mejor;
}

/**
 * Fondo y texto del botón primario, con contraste AA garantizado.
 *
 * `textoLegibleSobre` elige el MEJOR de blanco y negro, que no es lo mismo que
 * elegir uno que ALCANCE el mínimo. Con el verde de la marca ninguno de los dos
 * llega: blanco sobre `#059669` da 3,8:1 y el mínimo para texto normal es 4,5.
 * Un botón que dice "Comprar ahora" no se puede leer a medias.
 *
 * Así que además del texto hay que mover el fondo, hasta el tono más cercano
 * que lo aguante.
 */
export function superficieDeBoton(
  hexPrimario: string,
  contrasteMinimo: number = CONTRASTE_AA
): { fondo: string; texto: "#ffffff" | "#111111" } {
  const texto = textoLegibleSobre(hexPrimario);
  if (!leerHex(hexPrimario)) return { fondo: COLOR_PRIMARIO_DEFECTO, texto };
  return { fondo: ajustarHastaContraste(hexPrimario, texto, contrasteMinimo), texto };
}

/**
 * El color de marca cuando va como TEXTO sobre fondo claro.
 *
 * Es el fallo espejo del botón: los enlaces y los botones de contorno pintan el
 * verde sobre blanco, y el verde de catálogo sobre blanco da los mismos 3,8:1
 * que fallan en el botón. Acá el que se mueve es el color del texto, no el
 * fondo, porque el fondo blanco no es negociable.
 */
export function textoDeMarca(
  hexPrimario: string,
  fondo: string = "#ffffff",
  contrasteMinimo: number = CONTRASTE_AA
): string {
  if (!leerHex(hexPrimario)) return ajustarHastaContraste(COLOR_PRIMARIO_DEFECTO, fondo, contrasteMinimo);
  return ajustarHastaContraste(hexPrimario, fondo, contrasteMinimo);
}

/**
 * ¿Sobre este color conviene texto blanco o negro?
 *
 * Se usa para que un botón siga siendo legible cuando alguien elige un
 * primario claro: con texto blanco fijo, un amarillo lo dejaría ilegible.
 */
export function textoLegibleSobre(hex: string): "#ffffff" | "#111111" {
  const rgb = leerHex(hex);
  if (!rgb) return "#ffffff";
  // Luminancia relativa (WCAG). El umbral 0.45 favorece texto blanco salvo en
  // colores claramente claros, que es el comportamiento esperable en botones.
  const [r, g, b] = rgb.map(aLineal);
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminancia > 0.45 ? "#111111" : "#ffffff";
}
