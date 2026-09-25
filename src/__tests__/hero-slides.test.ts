import { describe, expect, it } from "vitest";
import type { PageBlock } from "@/lib/page-blocks";
import { conSlides, enlaceValido, moverSlide, nuevaSlide, slidesDelHero, slidesVisibles, bloqueHero } from "@/lib/hero-slides";

const bloques: PageBlock[] = [
  { id: "b1", type: "hero", enabled: true, title: "Minimarket en Ñuñoa" },
  { id: "b2", type: "offers", enabled: true },
  { id: "b3", type: "categories", enabled: true },
];

const slide = (id: string, extra: object = {}) => ({ ...nuevaSlide(id), title: `Slide ${id}`, ...extra });

describe("carrusel de la portada", () => {
  it("guarda las diapositivas en el hero sin tocar las demás secciones", () => {
    const r = conSlides(bloques, [slide("a"), slide("b")]);
    expect(r.map((b) => b.type)).toEqual(["hero", "offers", "categories"]);
    expect(slidesDelHero(bloqueHero(r)).map((s) => s.id)).toEqual(["a", "b"]);
    expect(r[0].title).toBe("Minimarket en Ñuñoa");
    expect(r[1]).toBe(bloques[1]);
  });

  it("si no hay hero, agrega el de por defecto al principio", () => {
    const r = conSlides([bloques[1]], [slide("a")]);
    expect(r[0].type).toBe("hero");
    expect(r[1].type).toBe("offers");
  });

  it("sólo muestra las activas que tienen título o imagen", () => {
    const hero = conSlides(bloques, [
      slide("a"),
      slide("b", { active: false }),
      slide("c", { title: "", imageUrl: "" }),
      slide("d", { title: "", imageUrl: "https://img/x.jpg" }),
    ])[0];
    expect(slidesVisibles(hero).map((s) => s.id)).toEqual(["a", "d"]);
  });

  it("mover cambia el orden de verdad", () => {
    const s = [slide("a"), slide("b"), slide("c")];
    expect(moverSlide(s, 0, 1).map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(moverSlide(s, 2, -1).map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(moverSlide(s, 0, -1)).toBe(s);
  });

  it("ignora basura en config.slides", () => {
    expect(slidesDelHero({ ...bloques[0], config: { slides: "x" } })).toEqual([]);
    expect(slidesDelHero({ ...bloques[0], config: { slides: [null, { id: "a" }] } })).toHaveLength(1);
  });

  it("acepta enlaces internos o https", () => {
    expect(enlaceValido("/ofertas")).toBe(true);
    expect(enlaceValido("https://www.olivomarket.cl/x")).toBe(true);
    expect(enlaceValido("//evil.com")).toBe(false);
    expect(enlaceValido("javascript:alert(1)")).toBe(false);
    expect(enlaceValido("www.algo.cl")).toBe(false);
  });
});
