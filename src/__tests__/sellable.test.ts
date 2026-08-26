import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Esta regla puede sacar productos del aire. Los dos errores que importan son
 * opuestos: bloquear una venta que debía pasar —el cliente ve "no disponible"
 * en algo que sí está— y dejar pasar una que la regla debía frenar.
 *
 * El tercero, más sutil, es que el panel y el checkout usen criterios
 * distintos: el panel diría "quedan 3 fuera" y el checkout rechazaría otros.
 * Por eso los dos pasan por `evaluarVendibles`.
 */

const estado: {
  settings: { data: any; error: any };
  productos: any[];
  costos: any[];
} = {
  settings: { data: { require_reviewed_price: false }, error: null },
  productos: [],
  costos: [],
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (tabla: string) => {
      const api: any = {
        select: () => api,
        eq: () => api,
        in: () => api,
        not: () => api,
        range: async () => ({ data: estado.productos, error: null }),
        maybeSingle: async () => estado.settings,
        then: (resolve: any) =>
          resolve(
            tabla === 'product_suppliers'
              ? { data: estado.costos, error: null }
              : { data: estado.productos, error: null }
          ),
      };
      return api;
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: () => {}, warn: () => {}, info: () => {} },
}));

import {
  evaluarVendibles,
  bloqueadosParaVenta,
  impactoDeLaRegla,
  reglaActiva,
  mensajeBloqueo,
  invalidateSellableRuleCache,
} from '@/server/sellable.service';

const producto = (extra: Partial<any> = {}) => ({
  barcode: '1',
  name: 'Harina PAN',
  category: 'Abarrotes',
  price_reviewed_at: '2026-01-01T00:00:00Z',
  ...extra,
});

beforeEach(() => {
  invalidateSellableRuleCache();
  estado.settings = { data: { require_reviewed_price: true }, error: null };
  estado.productos = [producto()];
  estado.costos = [{ product_id: '1' }];
});

describe('el criterio', () => {
  it('deja pasar lo que tiene costo y precio revisado', () => {
    expect(evaluarVendibles([producto()], new Set(['1']))).toEqual([]);
  });

  it('frena lo que no tiene costo cargado', () => {
    const fuera = evaluarVendibles([producto()], new Set());
    expect(fuera[0].motivos).toEqual(['sin-costo']);
  });

  it('frena lo que nunca se revisó', () => {
    const fuera = evaluarVendibles([producto({ price_reviewed_at: null })], new Set(['1']));
    expect(fuera[0].motivos).toEqual(['sin-revisar']);
  });

  it('informa los dos motivos cuando faltan los dos', () => {
    const fuera = evaluarVendibles([producto({ price_reviewed_at: null })], new Set());
    expect(fuera[0].motivos).toEqual(['sin-costo', 'sin-revisar']);
  });
});

describe('el interruptor', () => {
  it('apagada, no bloquea nada ni consulta el catálogo', async () => {
    estado.settings = { data: { require_reviewed_price: false }, error: null };
    // Aunque el producto incumpla de las dos formas.
    estado.productos = [producto({ price_reviewed_at: null })];
    estado.costos = [];

    expect(await bloqueadosParaVenta(['1'])).toEqual([]);
  });

  it('encendida, bloquea lo que incumple', async () => {
    estado.productos = [producto({ price_reviewed_at: null })];
    const bloqueados = await bloqueadosParaVenta(['1']);

    expect(bloqueados).toHaveLength(1);
    expect(bloqueados[0].nombre).toBe('Harina PAN');
  });

  it('un carrito vacío no consulta nada', async () => {
    expect(await bloqueadosParaVenta([])).toEqual([]);
  });

  it('ante un fallo de la base NO bloquea: el margen no vale una venta caída', async () => {
    // Es lo contrario del modo vitrina, que ante la duda cierra. Vitrina
    // protege de cobrar por un pedido que nadie va a preparar; esta regla
    // sólo protege el margen.
    estado.settings = { data: null, error: { code: '500', message: 'boom' } };
    expect(await reglaActiva()).toBe(false);
    expect(await bloqueadosParaVenta(['1'])).toEqual([]);
  });

  it('una base recién instalada, sin fila de configuración, no bloquea', async () => {
    estado.settings = { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    expect(await reglaActiva()).toBe(false);
  });

  it('un valor ausente cuenta como apagada', async () => {
    estado.settings = { data: {}, error: null };
    expect(await reglaActiva()).toBe(false);
  });
});

describe('impacto antes de encenderla', () => {
  it('cuenta qué quedaría fuera y por qué', async () => {
    estado.productos = [
      producto({ barcode: '1', name: 'Ok' }),
      producto({ barcode: '2', name: 'Sin revisar', price_reviewed_at: null }),
      producto({ barcode: '3', name: 'Sin costo' }),
      producto({ barcode: '4', name: 'Sin nada', price_reviewed_at: null }),
    ];
    estado.costos = [{ product_id: '1' }, { product_id: '2' }];

    const impacto = await impactoDeLaRegla();

    expect(impacto.total).toBe(4);
    expect(impacto.bloqueados).toHaveLength(3);
    expect(impacto.sinCosto).toBe(2);      // 3 y 4
    expect(impacto.sinRevisar).toBe(2);    // 2 y 4
  });

  it('dice si la regla ya está encendida', async () => {
    expect((await impactoDeLaRegla()).activa).toBe(true);
  });

  it('el panel y el checkout coinciden: mismo criterio, misma lista', async () => {
    estado.productos = [
      producto({ barcode: '1', name: 'Ok' }),
      producto({ barcode: '2', name: 'Sin revisar', price_reviewed_at: null }),
    ];
    estado.costos = [{ product_id: '1' }, { product_id: '2' }];

    const delPanel = (await impactoDeLaRegla()).bloqueados.map((b) => b.barcode);
    const delCheckout = (await bloqueadosParaVenta(['1', '2'])).map((b) => b.barcode);

    expect(delCheckout).toEqual(delPanel);
  });
});

describe('lo que ve el cliente', () => {
  const bloqueado = (nombre: string) => ({
    barcode: nombre,
    nombre,
    categoria: null,
    motivos: ['sin-costo' as const],
  });

  it('nombra el producto y dice qué hacer', () => {
    const texto = mensajeBloqueo([bloqueado('Harina PAN')]);

    expect(texto).toContain('Harina PAN');
    expect(texto).toMatch(/quitalo del carrito/i);
  });

  it('no le cuenta al cliente que falta el costo de proveedor', () => {
    // Es un problema nuestro; al cliente sólo le sirve lo accionable.
    const texto = mensajeBloqueo([bloqueado('Harina PAN')]);

    expect(texto).not.toMatch(/costo|proveedor|margen|revisad/i);
  });

  it('con muchos productos no vomita la lista entera', () => {
    const nombres = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco'];
    const texto = mensajeBloqueo(nombres.map(bloqueado));

    expect(texto).toContain('Uno, Dos, Tres');
    expect(texto).toContain('2 más');
    expect(texto).not.toContain('Cuatro');
    expect(texto).not.toContain('Cinco');
  });
});
