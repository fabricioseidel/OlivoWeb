"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ChevronRight, ChevronLeft, Package, Search, Sparkles } from "lucide-react";

// Piezas de la home que necesitan interactividad real en el navegador
// (carrusel con auto-avance, formularios controlados) — todo lo demás se
// renderiza server-side en page.tsx para que Google (y el usuario) vean
// contenido real en el primer HTML, no skeletons de carga.

// ── Promotional Banner Carousel ────────────────────────────────────────────────

const DEFAULT_HERO_TITLE = "Lo mejor de Venezuela";
const DEFAULT_HERO_SUBTITLE = "en Chile";
const DEFAULT_HERO_DESCRIPTION = "Productos auténticos con el sabor de casa. Entregas en 24-48h.";

const PROMO_SLIDES = [
  {
    id: "2",
    title: "Despacho gratis",
    subtitle: "desde $25.000",
    description: "Comprando desde $25.000 en productos seleccionados tu envío no tiene costo.",
    cta: "Comprar ahora",
    href: "/productos",
    bg: "from-blue-700 to-blue-900",
    accent: "text-yellow-300",
    badge: "🚚 Envío gratis",
  },
  {
    id: "3",
    title: "Nuevos productos",
    subtitle: "cada semana",
    description: "Seguimos ampliando nuestro catálogo. Descubre lo que llegó esta semana.",
    cta: "Explorar",
    href: "/productos",
    bg: "from-teal-700 to-emerald-900",
    accent: "text-emerald-300",
    badge: "✨ Novedades",
  },
];

export function HeroBanner({ heroTitle, heroDescription }: { heroTitle?: string; heroDescription?: string }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = [
    {
      id: "1",
      title: heroTitle || DEFAULT_HERO_TITLE,
      subtitle: heroTitle ? "" : DEFAULT_HERO_SUBTITLE,
      description: heroDescription || DEFAULT_HERO_DESCRIPTION,
      cta: "Ver catálogo",
      href: "/productos",
      bg: "from-emerald-700 to-emerald-900",
      accent: "text-amber-400",
      badge: "🔥 Más vendidos",
    },
    ...PROMO_SLIDES,
  ];

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, next]);

  const slide = slides[current];

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={`bg-gradient-to-r ${slide.bg} transition-colors duration-700`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-10 sm:py-14 gap-6 min-h-[220px] sm:min-h-[260px]">
            <div className="text-center sm:text-left max-w-lg">
              <span className={`inline-block text-xs font-black uppercase tracking-widest ${slide.accent} mb-2`}>
                {slide.badge}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-1">
                {/* Visualmente oculto: refuerza que esta página ES Olivo Market
                    para búsquedas de marca, sin tocar el copy promocional visible. */}
                <span className="sr-only">Olivo Market — </span>
                {slide.title}{" "}
                <span className={slide.accent}>{slide.subtitle}</span>
              </h1>
              <p className="text-white/70 text-sm sm:text-base mt-2 mb-5 max-w-md">{slide.description}</p>
              <Link href={slide.href}>
                <button className="bg-white text-gray-900 hover:bg-gray-100 font-black px-6 h-11 rounded-xl text-sm transition-colors shadow-lg active:scale-95">
                  {slide.cta} →
                </button>
              </Link>
            </div>
            <Package className="hidden sm:block w-40 h-40 text-white/10 shrink-0" />
          </div>
        </div>
      </div>

      <button
        onClick={prev}
        aria-label="Slide anterior"
        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        aria-label="Slide siguiente"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Ir al slide ${i + 1}`}
            className={`rounded-full transition-all ${i === current ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Search Bar ─────────────────────────────────────────────────────────────────

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  };

  return (
    <div className="bg-white border-b border-gray-100 py-3 px-4">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={submit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar productos… ej: harina pan, malta, hallacas"
            className="w-full h-11 pl-11 pr-24 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors active:scale-95"
          >
            Buscar
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Newsletter Section ─────────────────────────────────────────────────────────

export function NewsletterSection() {
  return (
    <section className="bg-emerald-700 py-8 sm:py-10">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <Sparkles className="w-6 h-6 text-emerald-300 mx-auto mb-2" />
        <h2 className="text-xl sm:text-2xl font-black text-white mb-1">¡Suscríbete y llévate 10% OFF!</h2>
        <p className="text-emerald-200 text-sm mb-5">Recibe nuestras mejores ofertas en tu email. Sin spam.</p>
        <NewsletterForm />
      </div>
    </section>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showToast("Por favor, ingresa un email válido", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage_footer" }),
      });
      if (res.ok) {
        showToast("¡Gracias por suscribirte! Revisa tu email.", "success");
        setEmail("");
      } else {
        const data = await res.json();
        showToast(data.error || "Error al suscribirse", "error");
      }
    } catch {
      showToast("Hubo un problema al conectar con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
      <Input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="flex-1 bg-white/15 border-white/30 text-white placeholder-white/50 focus:ring-white focus:border-white rounded-xl h-11"
      />
      <Button
        type="submit"
        loading={loading}
        className="bg-white text-emerald-700 hover:bg-gray-100 border-none h-11 px-5 rounded-xl font-black text-sm shrink-0 transition-colors active:scale-95"
      >
        Suscribirme
      </Button>
    </form>
  );
}
