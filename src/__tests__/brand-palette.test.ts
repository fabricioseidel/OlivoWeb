import { describe, it, expect } from 'vitest';
import {
  escalaDeMarca,
  leerHex,
  textoLegibleSobre,
  COLOR_PRIMARIO_DEFECTO,
  PASOS,
} from '@/lib/brand-palette';

/**
 * Esta escala pinta el sitio entero. Lo que más se protege es que el color por
 * defecto siga devolviendo la escala emerald original: de eso depende que
 * cambiar 133 archivos a `brand-*` no altere ni un píxel hasta que alguien
 * toque el color a propósito.
 */

/** Escala real de Tailwind emerald, contra la que se compara. */
const EMERALD: Record<number, string> = {
  50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
  400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
  800: '#065f46', 900: '#064e3b', 950: '#022c22',
};

const aRgb = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const distancia = (a: string, b: string) => {
  const [x, y] = [aRgb(a), aRgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

describe('el color por defecto reproduce emerald', () => {
  it('el paso 600 es exactamente el color que se le pasó', () => {
    const escala = escalaDeMarca(COLOR_PRIMARIO_DEFECTO)!;
    expect(escala[600].toLowerCase()).toBe(COLOR_PRIMARIO_DEFECTO.toLowerCase());
  });

  it('los once pasos son EXACTAMENTE emerald, no una aproximación', () => {
    // Byte por byte. De esto depende que migrar el sitio de `emerald-*` a
    // `brand-*` no cambie ni un píxel: si esta prueba se afloja, el refactor
    // deja de ser invisible y hay que revisar el sitio entero a ojo.
    const escala = escalaDeMarca(COLOR_PRIMARIO_DEFECTO)!;
    for (const paso of PASOS) {
      expect(escala[paso].toLowerCase(), `paso ${paso}`).toBe(EMERALD[paso]);
      expect(distancia(escala[paso], EMERALD[paso])).toBe(0);
    }
  });

  it('reproduce el croma que sube hasta el 400 — lo que color-mix no puede', () => {
    // Es la razón de existir de este módulo: los tonos claros son MÁS
    // saturados que el base. Mezclar con blanco los dejaría lavados.
    const escala = escalaDeMarca(COLOR_PRIMARIO_DEFECTO)!;
    const saturacion = (hex: string) => {
      const [r, g, b] = aRgb(hex);
      return Math.max(r, g, b) - Math.min(r, g, b);
    };
    expect(saturacion(escala[400])).toBeGreaterThan(saturacion(escala[600]));
  });
});

describe('otros colores', () => {
  it('conserva el tono elegido en toda la escala', () => {
    // Un azul tiene que dar una escala azul, no un azul que deriva a violeta.
    const escala = escalaDeMarca('#2563eb')!;
    for (const paso of [200, 400, 600, 800] as const) {
      const [r, , b] = aRgb(escala[paso]);
      expect(b, `paso ${paso} debería seguir siendo azul`).toBeGreaterThan(r);
    }
  });

  it('un color apagado da una escala apagada, sin inventar saturación', () => {
    const apagado = escalaDeMarca('#6b7280')!;  // gris
    const vivo = escalaDeMarca('#059669')!;
    const saturacion = (hex: string) => {
      const [r, g, b] = aRgb(hex);
      return Math.max(r, g, b) - Math.min(r, g, b);
    };
    expect(saturacion(apagado[400])).toBeLessThan(saturacion(vivo[400]));
  });

  it('la luminosidad siempre baja del 50 al 950', () => {
    for (const color of ['#059669', '#2563eb', '#dc2626', '#facc15']) {
      const escala = escalaDeMarca(color)!;
      const claridad = (hex: string) => aRgb(hex).reduce((s, c) => s + c, 0);
      for (let i = 1; i < PASOS.length; i++) {
        expect(
          claridad(escala[PASOS[i]]),
          `${color}: el paso ${PASOS[i]} debería ser más oscuro que ${PASOS[i - 1]}`
        ).toBeLessThan(claridad(escala[PASOS[i - 1]]));
      }
    }
  });

  it('un color intenso fuera de gama no cambia de tono al ajustarse', () => {
    // Recortar canal por canal volvería anaranjado un rojo intenso. Se baja el
    // croma, que conserva el tono elegido.
    const escala = escalaDeMarca('#ff0000')!;
    const [r, g, b] = aRgb(escala[400]);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
    expect(Math.abs(g - b), 'un rojo no debe derivar a naranja ni a rosa').toBeLessThan(40);
  });
});

describe('entradas raras', () => {
  it('acepta con y sin almohadilla, y en formato corto', () => {
    expect(leerHex('#059669')).toEqual([5, 150, 105]);
    expect(leerHex('059669')).toEqual([5, 150, 105]);
    expect(leerHex('#0a0')).toEqual([0, 170, 0]);
    expect(leerHex('  #059669  ')).toEqual([5, 150, 105]);
  });

  it('devuelve null en vez de pintar el sitio de un color inventado', () => {
    for (const malo of ['', 'rojo', '#12345', '#gggggg', 'undefined']) {
      expect(escalaDeMarca(malo), `"${malo}" no debería producir escala`).toBeNull();
    }
  });

  it('el blanco y el negro no rompen la escala', () => {
    for (const extremo of ['#ffffff', '#000000']) {
      const escala = escalaDeMarca(extremo)!;
      expect(escala).not.toBeNull();
      for (const paso of PASOS) {
        expect(escala[paso]).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe('texto legible', () => {
  it('elige blanco sobre colores oscuros y negro sobre claros', () => {
    expect(textoLegibleSobre('#059669')).toBe('#ffffff');
    expect(textoLegibleSobre('#1f2937')).toBe('#ffffff');
    // Un amarillo con texto blanco sería ilegible.
    expect(textoLegibleSobre('#facc15')).toBe('#111111');
    expect(textoLegibleSobre('#ffffff')).toBe('#111111');
  });

  it('ante un color inválido no deja el texto invisible', () => {
    expect(textoLegibleSobre('no-es-color')).toBe('#ffffff');
  });
});
