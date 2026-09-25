"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HeroCarousel({ blocks, storeSettings }: { blocks: any[], storeSettings: any }) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [heroQuery, setHeroQuery] = useState("");

  const slides = (blocks || []).filter((b: any) => b.type === "carousel_slide" && b.active !== false).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const submitHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  };

  const nextSlide = () => setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  // Fallback to static hero if no slides are defined
  if (slides.length === 0) {
    const heroTitle = storeSettings?.heroTitle || "Sabor que te conecta con casa";
    const heroDescription = storeSettings?.heroDescription || "Llevamos lo mejor de Venezuela directo a tu puerta en Chile.";
    
    return (
      <section className="bg-[#1a4731] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="text-white z-10 relative">
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4 tracking-tight drop-shadow-md">
              {heroTitle}
            </h1>
            <p className="text-emerald-100/90 text-base md:text-lg mb-8 max-w-xl font-medium">
              {heroDescription}
            </p>
            <form onSubmit={submitHeroSearch} className="flex max-w-xl gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner"
                />
              </div>
              <button
                type="submit"
                className="h-12 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm transition-all transform hover:scale-105 shadow-md"
              >
                Buscar
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden bg-gray-900 min-h-[400px] md:min-h-[500px]">
      {slides.map((slide: any, index: number) => {
        const isActive = index === current;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center ${isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
          >
            {/* Background Image */}
            {slide.imageUrl ? (
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear"
                  style={{ backgroundImage: `url(${slide.imageUrl})`, transform: isActive ? 'scale(1.05)' : 'scale(1)' }}
                />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-900 to-emerald-700 z-0" />
            )}
            
            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 relative z-20 w-full">
              <div className="max-w-2xl transform transition-all duration-700 delay-100" style={{ opacity: isActive ? 1 : 0, transform: isActive ? 'translateY(0)' : 'translateY(20px)' }}>
                {slide.title && (
                  <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-lg">
                    {slide.title}
                  </h1>
                )}
                {slide.description && (
                  <p className="text-lg md:text-xl text-white/90 mb-8 font-medium drop-shadow-md">
                    {slide.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-4 items-center">
                  {slide.linkUrl && (
                    <Link href={slide.linkUrl} className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base px-8 h-14 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/30">
                      {slide.linkText || "Ver m\u00E1s"} <ChevronRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Search Bar (Always visible over carousel) */}
      <div className="absolute bottom-6 md:bottom-12 left-0 right-0 z-30 px-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={submitHeroSearch} className="flex gap-2 bg-white/20 p-2 rounded-2xl backdrop-blur-md border border-white/30 shadow-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 pointer-events-none" />
              <input
                type="search"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="Buscar empanadas, teque\u00F1os, malt\u00EDn..."
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-white/95 text-gray-900 text-base md:text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="h-14 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base md:text-lg transition-all shadow-md shrink-0"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      {/* Navigation arrows (if > 1 slide) */}
      {slides.length > 1 && (
        <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between z-20 pointer-events-none">
          <button onClick={prevSlide} className="pointer-events-auto w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={nextSlide} className="pointer-events-auto w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Pagination dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-28 md:bottom-32 left-0 right-0 flex justify-center gap-2 z-20">
          {slides.map((_: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-3 h-3 rounded-full transition-all ${idx === current ? "bg-emerald-400 w-8" : "bg-white/50 hover:bg-white/80"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
