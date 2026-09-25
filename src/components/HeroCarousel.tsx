"use client";

/**
 * Carrusel de la portada: las diapositivas que se cargan en
 * Configuración → Apariencia → Carrusel de inicio.
 *
 * - El <h1> sigue siendo el título del hero ("Minimarket en Ñuñoa…"), que es
 *   la señal de SEO local más fuerte de la página. Los títulos de las
 *   diapositivas van en <h2>: con un <h1> por diapositiva la portada tendría
 *   varios, y el buscador no sabría cuál es el tema.
 * - Se detiene al pasar el mouse o enfocar con teclado, y no avanza solo si el
 *   sistema pide menos movimiento (WCAG 2.2.2).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { INTERVALO_CARRUSEL_MS, enlaceValido, type HeroSlide } from "@/lib/hero-slides";

export default function HeroCarousel({
  slides,
  titulo,
  subtitulo,
  placeholderBusqueda = "Buscar productos...",
}: {
  slides: HeroSlide[];
  /** El título del bloque hero: se muestra como <h1>. */
  titulo: string;
  subtitulo?: string;
  placeholderBusqueda?: string;
}) {
  const router = useRouter();
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [detenidoPorUsuario, setDetenidoPorUsuario] = useState(false);
  const [menosMovimiento, setMenosMovimiento] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const total = slides.length;
  const indice = total ? Math.min(actual, total - 1) : 0;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenosMovimiento(mq.matches);
    const cambio = (e: MediaQueryListEvent) => setMenosMovimiento(e.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);

  const avanza = total > 1 && !pausado && !detenidoPorUsuario && !menosMovimiento;
  useEffect(() => {
    if (!avanza) return;
    const t = setInterval(() => setActual((p) => (p + 1) % total), INTERVALO_CARRUSEL_MS);
    return () => clearInterval(t);
  }, [avanza, total]);

  const ir = (i: number) => setActual(((i % total) + total) % total);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busqueda.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  };

  if (!total) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados"
      className="relative w-full overflow-hidden bg-brand-950"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausado(false);
      }}
    >
      <div className="relative min-h-[460px] md:min-h-[520px]">
        {slides.map((s, i) => {
          const activa = i === indice;
          return (
            <div
              key={s.id}
              role="group"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${total}`}
              aria-hidden={!activa}
              className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${activa ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              {s.imageUrl ? (
                <>
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${s.imageUrl})` }}
                  />
                  {/* Velo para que el texto blanco se lea sobre cualquier foto. */}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-950/60 to-brand-950/20" />
                </>
              ) : (
                <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800" />
              )}

              <div className="relative z-10 max-w-7xl mx-auto px-4 pt-20 pb-44 md:pt-20 md:pb-44">
                <div className="max-w-2xl text-white">
                  {s.title && <h2 className="o-display mb-3 text-white drop-shadow">{s.title}</h2>}
                  {s.description && <p className="text-base md:text-lg text-white/90 mb-6 max-w-xl">{s.description}</p>}
                  {s.linkUrl && enlaceValido(s.linkUrl) && (
                    <Link
                      href={s.linkUrl}
                      tabIndex={activa ? 0 : -1}
                      className="o-focus inline-flex items-center gap-1.5 h-12 px-6 rounded-xl bg-brand-boton text-brand-contraste font-bold text-sm md:text-base hover:bg-brand-700 transition-colors shadow-lg"
                    >
                      {s.linkText || "Ver más"} <ChevronRight className="w-5 h-5" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Título del hero y buscador: fijos sobre todas las diapositivas. */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-brand-950/95 via-brand-950/70 to-transparent pt-10 pb-5 md:pb-7">
          <div className="max-w-7xl mx-auto px-4">
            {subtitulo && <p className="text-xs md:text-sm font-semibold text-brand-300 mb-1">{subtitulo}</p>}
            <h1 className="text-base md:text-xl font-bold text-white mb-3">{titulo}</h1>
            <form onSubmit={buscar} className="flex max-w-2xl gap-2" role="search">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden />
                <input
                  type="search"
                  aria-label="Buscar productos"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={placeholderBusqueda}
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <button
                type="submit"
                className="o-focus h-12 shrink-0 rounded-xl bg-brand-boton px-6 text-sm font-semibold text-brand-contraste transition-colors hover:bg-brand-700"
              >
                Buscar
              </button>
            </form>
          </div>
        </div>

        {total > 1 && (
          <div className="absolute z-30 top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDetenidoPorUsuario((v) => !v)}
              aria-label={detenidoPorUsuario ? "Reanudar el carrusel" : "Detener el carrusel"}
              className="o-focus w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 text-white flex items-center justify-center"
            >
              {detenidoPorUsuario ? <Play className="w-4 h-4" aria-hidden /> : <Pause className="w-4 h-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => ir(indice - 1)}
              aria-label="Diapositiva anterior"
              className="o-focus w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 text-white flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => ir(indice + 1)}
              aria-label="Diapositiva siguiente"
              className="o-focus w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 border border-white/20 text-white flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" aria-hidden />
            </button>
          </div>
        )}

        {total > 1 && (
          <div className="absolute z-30 top-4 left-2 md:left-1/2 md:-translate-x-1/2 flex items-center">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => ir(i)}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                aria-current={i === indice}
                className="o-focus flex items-center justify-center min-w-[32px] min-h-[40px] px-1 group"
              >
                <span
                  aria-hidden
                  className={`block h-2.5 rounded-full transition-all ${i === indice ? "w-8 bg-brand-300" : "w-2.5 bg-white/50 group-hover:bg-white/80"}`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
