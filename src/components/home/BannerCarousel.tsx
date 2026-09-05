"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CarouselSlide } from "@/lib/page-blocks";

/**
 * Carrusel de banners de la portada.
 *
 * Decisiones que vale la pena no deshacer:
 *
 * 1. **El giro es circular de verdad, sin clonar diapositivas.** Cada banner se
 *    posiciona según su distancia circular al actual (`distanciaCircular`), así
 *    que del último al primero se avanza hacia adelante, como corresponde, en
 *    vez de rebobinar los cinco de golpe. Clonar el primero al final —el truco
 *    habitual— obliga a un salto sin animación que en móvil se alcanza a ver.
 *
 * 2. **Sólo se anima lo que está a la vista.** Los banners a distancia mayor que
 *    uno se recolocan sin transición; si no, al saltar del 1 al 4 con los puntos
 *    se vería desfilar todo lo del medio.
 *
 * 3. **El arrastre mueve el banner con el dedo**, no es un swipe que sólo
 *    dispara al soltar: sin ese seguimiento el gesto se siente roto en móvil.
 *
 * 4. **Nada se mueve solo si el visitante pidió que no**: con
 *    `prefers-reduced-motion` no hay avance automático ni transición. Y el
 *    avance se detiene con el mouse encima, con el foco dentro y con la pestaña
 *    en segundo plano.
 */

/** Ritmo por defecto entre banners. Menos de esto no se alcanza a leer. */
const SEGUNDOS_POR_DEFECTO = 6;

/** Cuánto hay que arrastrar para que cuente como cambio de banner. */
const UMBRAL_ARRASTRE_PX = 60;

const TRANSICION = "transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 620ms ease";

/**
 * Distancia con signo del banner `i` al actual, por el camino más corto.
 *
 * Con 5 banners parado en el 0, el 4 está a `-1` (a la izquierda) y no a `+4`:
 * es lo que hace que el giro sea continuo en ambos sentidos.
 */
export function distanciaCircular(i: number, actual: number, total: number): number {
  if (total <= 1) return 0;
  const bruta = (((i - actual) % total) + total) % total;
  return bruta > total / 2 ? bruta - total : bruta;
}

export default function BannerCarousel({
  slides,
  autoplaySeconds = SEGUNDOS_POR_DEFECTO,
  ariaLabel = "Promociones destacadas",
}: {
  slides: CarouselSlide[];
  autoplaySeconds?: number;
  ariaLabel?: string;
}) {
  const total = slides.length;
  const [actual, setActual] = useState(0);
  const [arrastre, setArrastre] = useState(0);
  const [sinMovimiento, setSinMovimiento] = useState(false);

  // Tres motivos distintos para no avanzar, cada uno con su interruptor. Con un
  // solo booleano compartido, sacar el mouse del carrusel reanudaba el avance
  // aunque el foco siguiera dentro, que es justo el caso de quien navega con
  // teclado y necesita que se quede quieto.
  const [hover, setHover] = useState(false);
  const [foco, setFoco] = useState(false);
  const [oculto, setOculto] = useState(false);
  const pausado = hover || foco || oculto;

  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const inicioArrastre = useRef<number | null>(null);
  const anchoContenedor = useRef(1);
  // Se lee en el click del enlace, que llega DESPUÉS de que el arrastre
  // terminó y el estado volvió a cero: por eso es un ref y no estado.
  const huboArrastre = useRef(false);

  // El índice puede quedar fuera de rango si el admin borra banners mientras
  // alguien tiene la portada abierta.
  const indice = total > 0 ? actual % total : 0;

  const ir = useCallback(
    (destino: number) => {
      if (total === 0) return;
      setActual(((destino % total) + total) % total);
    },
    [total]
  );

  const siguiente = useCallback(() => ir(indice + 1), [ir, indice]);
  const anterior = useCallback(() => ir(indice - 1), [ir, indice]);

  // Preferencia del sistema. Se escucha el cambio porque se puede activar sin
  // recargar la página.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setSinMovimiento(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  // Avance automático. Se rearma en cada cambio de banner, así que tocar una
  // flecha reinicia la cuenta en vez de dejar medio intervalo corriendo.
  useEffect(() => {
    if (total <= 1 || pausado || sinMovimiento || autoplaySeconds <= 0) return;
    if (typeof document !== "undefined" && document.hidden) return;
    const id = window.setTimeout(siguiente, autoplaySeconds * 1000);
    return () => window.clearTimeout(id);
  }, [total, pausado, sinMovimiento, autoplaySeconds, siguiente, indice]);

  // Con la pestaña en segundo plano el timer sigue corriendo y al volver el
  // visitante se encuentra el carrusel en otro banner sin haber visto la
  // transición.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const alCambiar = () => setOculto(document.hidden);
    alCambiar();
    document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      siguiente();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      anterior();
    }
  };

  const iniciarArrastre = (e: React.PointerEvent) => {
    if (total <= 1 || e.pointerType === "mouse") return;
    inicioArrastre.current = e.clientX;
    huboArrastre.current = false;
    anchoContenedor.current = contenedorRef.current?.offsetWidth || 1;
  };

  const moverArrastre = (e: React.PointerEvent) => {
    if (inicioArrastre.current === null) return;
    const recorrido = e.clientX - inicioArrastre.current;
    if (Math.abs(recorrido) > 4) huboArrastre.current = true;
    setArrastre(recorrido);
  };

  const terminarArrastre = () => {
    if (inicioArrastre.current === null) return;
    const recorrido = arrastre;
    inicioArrastre.current = null;
    setArrastre(0);
    if (recorrido <= -UMBRAL_ARRASTRE_PX) siguiente();
    else if (recorrido >= UMBRAL_ARRASTRE_PX) anterior();
  };

  const arrastrando = inicioArrastre.current !== null;
  const arrastrePorcentaje = (arrastre / (anchoContenedor.current || 1)) * 100;

  if (total === 0) return null;

  return (
    <section className="px-4 py-4 max-w-7xl mx-auto">
      <div
        ref={contenedorRef}
        role="region"
        aria-roledescription="carrusel"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={alTeclear}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFoco(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setFoco(false);
        }}
        onPointerDown={iniciarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
        className="group o-focus relative overflow-hidden rounded-2xl bg-brand-950 shadow-sm touch-pan-y select-none
                   aspect-[16/9] sm:aspect-[21/8] lg:aspect-[64/17]"
      >
        {slides.map((slide, i) => {
          const delta = distanciaCircular(i, indice, total);
          const visible = Math.abs(delta) <= 1;
          const activo = delta === 0;
          const desplazamiento = delta * 100 + (visible ? arrastrePorcentaje : 0);
          const conTexto = Boolean(slide.title || slide.description || slide.buttonText);
          const oscuro = slide.textTheme === "dark";

          const contenido = (
            <>
              {slide.imageUrl && (
                <Image
                  src={slide.imageUrl}
                  alt={slide.title || ""}
                  fill
                  // El primero es casi siempre el elemento más grande de la
                  // pantalla inicial: cargarlo con prioridad es lo que evita
                  // que la portada mida mal en las métricas de carga.
                  priority={i === 0}
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-cover"
                  draggable={false}
                />
              )}
              {/* El velo sólo existe para que se lea el texto. Sin texto, la
                  imagen se muestra tal cual la subieron. */}
              {conTexto && (
                <div
                  aria-hidden
                  className={`absolute inset-0 ${
                    oscuro
                      ? "bg-gradient-to-r from-white/85 via-white/55 to-transparent"
                      : "bg-gradient-to-r from-black/70 via-black/40 to-transparent"
                  }`}
                />
              )}
              {conTexto && (
                <div className="relative h-full flex flex-col justify-center gap-2 px-6 sm:px-10 lg:px-14 max-w-xl">
                  {slide.title && (
                    <p
                      className={`text-xl sm:text-3xl lg:text-4xl font-black tracking-tight ${
                        oscuro ? "text-gray-900" : "text-white"
                      }`}
                    >
                      {slide.title}
                    </p>
                  )}
                  {slide.description && (
                    <p
                      className={`text-xs sm:text-sm lg:text-base ${
                        oscuro ? "text-gray-700" : "text-white/85"
                      }`}
                    >
                      {slide.description}
                    </p>
                  )}
                  {slide.buttonText && (
                    <span
                      className={`mt-2 inline-flex h-10 w-fit items-center gap-1 rounded-lg px-5 text-sm font-semibold ${
                        oscuro
                          ? "bg-gray-900 text-white"
                          : "bg-brand-boton text-brand-contraste"
                      }`}
                    >
                      {slide.buttonText}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </div>
              )}
            </>
          );

          // El destino del banner completo o, si no hay, el del botón: tocar
          // cualquier parte del banner es lo que la gente espera en el celular.
          const destino = slide.href || slide.buttonLink;

          return (
            <div
              key={slide.id}
              // Los que están fuera de vista quedan fuera del orden de
              // tabulación y del lector de pantalla: si no, se navega a
              // enlaces invisibles.
              aria-hidden={!activo}
              className={`absolute inset-0 ${activo ? "" : "pointer-events-none"}`}
              style={{
                transform: `translate3d(${desplazamiento}%, 0, 0)`,
                opacity: visible ? 1 : 0,
                transition: sinMovimiento || arrastrando || !visible ? "none" : TRANSICION,
              }}
            >
              {destino ? (
                <Link
                  href={destino}
                  tabIndex={activo ? 0 : -1}
                  // Arrastrar para pasar de banner terminaba abriendo el
                  // enlace al soltar el dedo. No sirve mirar el estado del
                  // arrastre: para cuando llega el click ya volvió a cero.
                  onClick={(e) => {
                    if (huboArrastre.current) {
                      e.preventDefault();
                      huboArrastre.current = false;
                    }
                  }}
                  className="block h-full w-full"
                >
                  {contenido}
                </Link>
              ) : (
                <div className="h-full w-full">{contenido}</div>
              )}
            </div>
          );
        })}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label="Banner anterior"
              className="o-focus absolute left-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full
                         bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55
                         opacity-0 group-hover:opacity-100 focus-visible:opacity-100 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={siguiente}
              aria-label="Banner siguiente"
              className="o-focus absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full
                         bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55
                         opacity-0 group-hover:opacity-100 focus-visible:opacity-100 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => ir(i)}
                  aria-label={`Ir al banner ${i + 1} de ${total}`}
                  aria-current={i === indice ? "true" : undefined}
                  className={`o-focus h-2 rounded-full transition-all duration-300 ${
                    i === indice ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
