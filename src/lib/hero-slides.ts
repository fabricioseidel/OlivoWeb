/**
 * Diapositivas del carrusel de la portada.
 *
 * Viven DENTRO del bloque "hero" del Constructor (`config.slides`), no como
 * bloques sueltos en `appearance.blocks`. Esa lista es el orden de las
 * secciones de la portada: si las diapositivas se mezclan ahí, el editor del
 * carrusel muestra "Ofertas" o "Categorías" como si fueran diapositivas y
 * borrar una diapositiva borra una sección de la portada.
 *
 * El orden de las diapositivas es el orden del arreglo. No hay un campo
 * `order` aparte que se pueda desincronizar al moverlas.
 */

import { DEFAULT_BLOCKS, type PageBlock } from "@/lib/page-blocks";

export type HeroSlide = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkText: string;
  linkUrl: string;
  active: boolean;
};

/** Cambio automático de diapositiva, en milisegundos. */
export const INTERVALO_CARRUSEL_MS = 6000;

function esSlide(v: unknown): v is HeroSlide {
  return typeof v === "object" && v !== null && typeof (v as HeroSlide).id === "string";
}

/** Todas las diapositivas guardadas en el bloque hero, activas o no. */
export function slidesDelHero(bloque: PageBlock | null | undefined): HeroSlide[] {
  const crudas = bloque?.config?.slides;
  return Array.isArray(crudas) ? crudas.filter(esSlide) : [];
}

/** Las que se muestran en la portada: activas y con algo que mostrar. */
export function slidesVisibles(bloque: PageBlock | null | undefined): HeroSlide[] {
  return slidesDelHero(bloque).filter(
    (s) => s.active !== false && Boolean(s.title?.trim() || s.imageUrl?.trim()),
  );
}

/**
 * Devuelve los bloques con las diapositivas reemplazadas en el hero, sin
 * tocar las demás secciones. Si la portada no tiene hero, se agrega el de
 * por defecto al principio: un carrusel sin hero no tendría dónde mostrarse.
 */
export function conSlides(bloques: PageBlock[] | null | undefined, slides: HeroSlide[]): PageBlock[] {
  const lista = bloques && bloques.length ? bloques : DEFAULT_BLOCKS;
  const i = lista.findIndex((b) => b.type === "hero");
  if (i < 0) {
    const hero = DEFAULT_BLOCKS.find((b) => b.type === "hero")!;
    return [{ ...hero, config: { ...hero.config, slides } }, ...lista];
  }
  return lista.map((b, j) => (j === i ? { ...b, config: { ...b.config, slides } } : b));
}

/** El bloque hero de una lista de bloques (el primero, si hubiera varios). */
export function bloqueHero(bloques: PageBlock[] | null | undefined): PageBlock | undefined {
  return (bloques ?? []).find((b) => b.type === "hero");
}

export function nuevaSlide(id: string): HeroSlide {
  return { id, title: "", description: "", imageUrl: "", linkText: "Ver más", linkUrl: "/productos", active: true };
}

/**
 * Sólo enlaces internos ("/ofertas") o https. Evita que un enlace mal
 * pegado ("javascript:…", "www.algo") quede como botón de la portada.
 */
export function enlaceValido(url: string | null | undefined): boolean {
  const u = (url ?? "").trim();
  return /^\/(?!\/)/.test(u) || /^https:\/\/[^\s]+$/i.test(u);
}

/** Mueve la diapositiva `i` una posición hacia arriba (-1) o abajo (+1). */
export function moverSlide(slides: HeroSlide[], i: number, paso: -1 | 1): HeroSlide[] {
  const j = i + paso;
  if (i < 0 || i >= slides.length || j < 0 || j >= slides.length) return slides;
  const copia = [...slides];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}
