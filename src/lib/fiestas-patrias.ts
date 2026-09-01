/**
 * Temporada dieciochera.
 *
 * Septiembre en Chile no es un mes cualquiera para un minimarket de barrio:
 * la demanda se concentra en empanadas, carnes para el asado, bebidas y
 * abarrotes de la parrilla, y el peak se agota en cuatro o cinco días. Esta
 * capa concentra las tres decisiones que el resto del sitio necesita:
 *
 *  1. ¿Estamos en temporada? (para no dejar guirnaldas colgadas en marzo)
 *  2. ¿Este producto es dieciochero? (para armar la sección sin depender de
 *     que alguien recuerde etiquetar cada producto nuevo)
 *  3. ¿Cuántos días faltan para el 18? (la urgencia es el argumento de venta)
 *
 * REGLA: nada de esto se calcula con `new Date()` a secas. El servidor de
 * Vercel corre en UTC y Chile va en UTC-3/-4: sin convertir, la sección se
 * apaga y se enciende con tres o cuatro horas de desfase respecto del día
 * chileno, que es el que ve el cliente.
 */

import { toZonedTime } from "date-fns-tz";

export const ZONA_HORARIA_CL = "America/Santiago";

/** Mes 0-indexado: 8 = septiembre. */
const MES_SEPTIEMBRE = 8;

/** El 18 de septiembre, el día que ordena toda la campaña. */
export const DIA_DIECIOCHO = 18;

/** Ruta única de la sección. Se importa en vez de escribirla a mano. */
export const RUTA_FIESTAS_PATRIAS = "/fiestas-patrias";

/**
 * Categoría que el panel puede crear para curar la sección a mano.
 * Si existe y tiene productos, manda sobre la detección por palabras clave.
 */
export const CATEGORIA_FIESTAS_PATRIAS = "Fiestas Patrias";

/**
 * Nombres de categoría que cuentan como dieciocheros por sí solos, sin mirar
 * el nombre del producto. Se comparan normalizados (sin tildes, minúsculas).
 */
const CATEGORIAS_DIECIOCHERAS = [
  "fiestas patrias",
  "fiestas patrias 2025",
  "dieciocho",
  "18 de septiembre",
  "asado",
  "parrilla",
];

/**
 * Palabras que identifican un producto dieciochero cuando nadie lo etiquetó.
 *
 * Es deliberadamente generoso: en septiembre es mucho peor dejar fuera una
 * empanada que colar un producto de más. Se compara contra nombre,
 * descripción y categorías del producto, todo normalizado.
 *
 * // TODO-HUMANO: cuando el catálogo dieciochero crezca, conviene crear la
 * categoría "Fiestas Patrias" en el panel y asignarla a mano. Esta lista es
 * la red de seguridad para que la sección nunca aparezca vacía, no el
 * mecanismo definitivo de curaduría.
 */
const PALABRAS_DIECIOCHERAS = [
  // La estrella del 18
  "empanada",
  "pino",
  // Parrilla y asado
  "asado",
  "parrilla",
  "carbon",
  "carbón",
  "choripan",
  "choripán",
  "chorizo",
  "longaniza",
  "anticucho",
  "costillar",
  "chuleta",
  "lomo",
  "punta paleta",
  "brasa",
  // Acompañamientos de mesa
  "pebre",
  "merken",
  "merkén",
  "ensalada chilena",
  "aji",
  "ají",
  "pan amasado",
  "sopaipilla",
  // Para tomar
  "chicha",
  "terremoto",
  "pisco",
  "pipeno",
  "pipeño",
  "vino tinto",
  "mote con huesillo",
  // Dulces y postres del mes
  "alfajor",
  "cocada",
  // Ambientación
  "bandera",
  "guirnalda",
  "banderin",
  "banderín",
  "volantin",
  "volantín",
  "emboque",
  "trompo",
];

/** Minúsculas y sin tildes: "Empanada de Pino" y "empanada de pino" son lo mismo. */
export function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** La fecha de "ahora" tal como la vive alguien parado en Ñuñoa. */
export function ahoraEnChile(referencia: Date = new Date()): Date {
  return toZonedTime(referencia, ZONA_HORARIA_CL);
}

/**
 * ¿Estamos en el mes dieciochero?
 *
 * La ventana es septiembre completo, que es lo que pidió la tienda: la
 * campaña arranca el 1 (cuando se toman los pedidos anticipados) y no tiene
 * sentido después del 30.
 */
export function enTemporadaDieciochera(referencia: Date = new Date()): boolean {
  return ahoraEnChile(referencia).getMonth() === MES_SEPTIEMBRE;
}

/**
 * Días que faltan para el 18 de septiembre.
 *
 * Devuelve 0 el mismo 18 y números negativos después. El componente decide
 * qué decir en cada tramo; acá solo se cuenta.
 */
export function diasParaElDieciocho(referencia: Date = new Date()): number {
  const hoy = ahoraEnChile(referencia);
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dieciocho = new Date(hoy.getFullYear(), MES_SEPTIEMBRE, DIA_DIECIOCHO);
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((dieciocho.getTime() - inicioDeHoy.getTime()) / MS_POR_DIA);
}

/**
 * Frase de cuenta regresiva. Se escribe acá y no en el componente para que
 * la portada, la sección y el navbar digan exactamente lo mismo.
 */
export function textoCuentaRegresiva(referencia: Date = new Date()): string {
  const faltan = diasParaElDieciocho(referencia);
  if (faltan > 1) return `Faltan ${faltan} días para el 18`;
  if (faltan === 1) return "¡Mañana es 18!";
  if (faltan === 0) return "¡Hoy es 18 de septiembre!";
  if (faltan === -1) return "¡Feliz 19! Sigue la celebración";
  return "Septiembre dieciochero";
}

/** Forma mínima de producto que necesita la detección. */
export type ProductoDieciocheroInput = {
  name?: string | null;
  description?: string | null;
  categories?: string[] | null;
};

/** ¿Alguna de las categorías del producto es una categoría dieciochera? */
export function tieneCategoriaDieciochera(producto: ProductoDieciocheroInput): boolean {
  const categorias = (producto.categories ?? []).map(normalizarTexto);
  return categorias.some(c => CATEGORIAS_DIECIOCHERAS.includes(c));
}

/**
 * ¿Este producto va en la sección de Fiestas Patrias?
 *
 * Primero la curaduría explícita (categoría), después las palabras clave.
 * La descripción se mira igual que el nombre porque un "Pack parrillero"
 * puede no decir "asado" en el título y sí en el detalle.
 */
export function esProductoDieciochero(producto: ProductoDieciocheroInput): boolean {
  if (tieneCategoriaDieciochera(producto)) return true;

  const texto = normalizarTexto(
    [producto.name, producto.description, ...(producto.categories ?? [])].join(" ")
  );
  return PALABRAS_DIECIOCHERAS.some(palabra => texto.includes(normalizarTexto(palabra)));
}

/**
 * Ordena la vitrina dieciochera: primero los curados a mano (categoría
 * explícita), después los destacados y al final el resto alfabético. Así la
 * empanada de pino —hoy el único producto cargado— queda siempre arriba.
 */
export function ordenarDieciocheros<T extends ProductoDieciocheroInput & { featured?: boolean | null }>(
  productos: T[]
): T[] {
  const peso = (p: T) => (tieneCategoriaDieciochera(p) ? 0 : p.featured ? 1 : 2);
  return [...productos].sort((a, b) => {
    const diferencia = peso(a) - peso(b);
    if (diferencia !== 0) return diferencia;
    return (a.name ?? "").localeCompare(b.name ?? "", "es");
  });
}
