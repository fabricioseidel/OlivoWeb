import { describe, it, expect } from "vitest";
import { distanciaCircular } from "@/components/home/BannerCarousel";
import { slidesPublicables, MAX_CAROUSEL_SLIDES } from "@/lib/page-blocks";

describe("distanciaCircular", () => {
  it("da cero para el banner actual", () => {
    expect(distanciaCircular(2, 2, 5)).toBe(0);
  });

  it("toma el camino corto hacia atrás en vez de dar la vuelta larga", () => {
    // Parado en el 0, el último banner está a la izquierda: es lo que hace que
    // del primero al último se retroceda un paso y no se desfilen los cinco.
    expect(distanciaCircular(4, 0, 5)).toBe(-1);
  });

  it("toma el camino corto hacia adelante al cerrar la vuelta", () => {
    // Y del último al primero se avanza, no se rebobina.
    expect(distanciaCircular(0, 4, 5)).toBe(1);
  });

  it("mantiene vecinos a distancia uno en toda la vuelta", () => {
    const total = 5;
    for (let actual = 0; actual < total; actual++) {
      expect(distanciaCircular((actual + 1) % total, actual, total)).toBe(1);
      expect(distanciaCircular((actual - 1 + total) % total, actual, total)).toBe(-1);
    }
  });

  it("nunca deja más de dos banners a la vista", () => {
    // El componente anima sólo los que están a distancia <= 1. Si hubiera tres,
    // se verían pedazos de un banner que nadie pidió.
    for (const total of [2, 3, 4, 5]) {
      for (let actual = 0; actual < total; actual++) {
        const visibles = Array.from({ length: total }, (_, i) =>
          distanciaCircular(i, actual, total)
        ).filter(d => Math.abs(d) <= 1);
        expect(visibles.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it("no se rompe con un solo banner", () => {
    expect(distanciaCircular(0, 0, 1)).toBe(0);
  });
});

describe("slidesPublicables", () => {
  it("descarta los banners sin imagen", () => {
    // Se crean vacíos y se les sube la foto después: sin este filtro la portada
    // mostraría una franja negra mientras tanto.
    const slides = slidesPublicables([
      { id: "a", imageUrl: "https://x/1.jpg" },
      { id: "b" },
      { id: "c", imageUrl: "   " },
    ]);
    expect(slides.map(s => s.id)).toEqual(["a"]);
  });

  it("recorta al máximo permitido", () => {
    const muchos = Array.from({ length: 9 }, (_, i) => ({
      id: `s${i}`,
      imageUrl: `https://x/${i}.jpg`,
    }));
    expect(slidesPublicables(muchos)).toHaveLength(MAX_CAROUSEL_SLIDES);
  });

  it("tolera que el bloque todavía no tenga banners", () => {
    expect(slidesPublicables(undefined)).toEqual([]);
    expect(slidesPublicables(null)).toEqual([]);
  });
});
