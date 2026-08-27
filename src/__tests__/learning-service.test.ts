import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Las ventas del POS y las de la web no se anotan con la misma clave.
 *
 * `sale_items.product_barcode` guarda el código de barras. `order_items.product_id`
 * guarda la clave numérica `products.id`. Son dos columnas distintas de la misma
 * tabla y no calzan entre sí: contra la base de producción, 0 de 19 líneas web
 * coinciden con un barcode y 19 de 19 coinciden con un id.
 *
 * Sumarlas sin traducir no rompe nada de forma visible: cada venta web se
 * acumula bajo una clave que ningún producto tiene, se descarta sola, y las
 * reglas de rotación informan con total seguridad que lo vendido por la web
 * nunca se vendió. Es el peor tipo de error — el que no avisa.
 *
 * Este test lo fija: un producto con ventas de POS parejas en las dos ventanas
 * y un salto que viene SÓLO de la web. Si la traducción se rompe, el salto
 * desaparece y no queda ningún hallazgo.
 */

const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const estado: Record<string, any[]> = {
  supplier_orders: [],
  supplier_order_items: [],
  supplier_cost_history: [],
  products: [],
  sale_items: [],
  order_items: [],
  product_suppliers: [],
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (tabla: string) => {
      const api: any = {
        select: () => api,
        eq: () => api,
        gte: () => api,
        not: () => api,
        // Respeta los límites de `range`: si devolviera siempre todo, un
        // servicio sin paginar pasaría igual y el test no probaría nada.
        range: async (desde: number, hasta: number) => ({
          data: (estado[tabla] ?? []).slice(desde, hasta + 1),
          error: null,
        }),
      };
      return api;
    },
  },
}));

import { obtenerAprendizaje } from '@/server/learning.service';

/**
 * La regla de velocidad exige 15 observaciones. Van 16 a propósito: uno de los
 * tests deja a un producto sin ventas, y con 15 justos el umbral se activaría
 * y borraría los hallazgos — el test fallaría por falta de datos, no por el
 * error que busca.
 */
const CUANTOS = 16;

beforeEach(() => {
  for (const k of Object.keys(estado)) estado[k] = [];

  for (let i = 0; i < CUANTOS; i++) {
    estado.products.push({
      id: 5000 + i,
      barcode: `78016200000${String(i).padStart(2, '0')}`,
      name: `Producto ${i}`,
      stock: 10,
      is_active: true,
      created_at: dias(400),
    });
  }

  // Ventas del POS: 6 unidades en cada ventana, para todos. Parejas a
  // propósito — así cualquier hallazgo que aparezca viene de la web.
  for (const p of estado.products) {
    for (const [cuando, cuantas] of [
      [dias(10), 6],
      [dias(45), 6],
    ] as const) {
      estado.sale_items.push({
        product_barcode: p.barcode,
        quantity: cuantas,
        sales: { ts: cuando, voided: false },
      });
    }
  }
});

describe('aprendizaje: ventas del POS y de la web', () => {
  it('cuenta la venta web del producto, no la tira por usar otra clave', async () => {
    const objetivo = estado.products[0];

    // Ojo: `product_id` es la clave numérica, como la escribe la web de verdad.
    estado.order_items.push({
      product_id: String(objetivo.id),
      quantity: 12,
      orders: { created_at: dias(5), status: 'paid' },
    });

    const { reglas } = await obtenerAprendizaje();
    const velocidad = reglas.find((r) => r.id === 'velocidad-cambiante')!;

    expect(velocidad.estado).toBe('listo');

    // 6 del POS + 12 de la web contra 6 de la ventana anterior.
    expect(velocidad.hallazgos).toHaveLength(1);
    expect(velocidad.hallazgos[0].sujeto).toBe(objetivo.name);
    expect(velocidad.hallazgos[0].detalle).toContain('de 6 a 18 unidades');
  });

  it('no le imputa la venta al producto cuyo barcode coincide con el id ajeno', async () => {
    // El caso venenoso: un producto cuyo BARCODE es igual al ID de otro. Si el
    // servicio usara `product_id` como si fuera barcode, la venta se le sumaría
    // a este — no se perdería, se le cargaría al producto equivocado.
    const impostor = { ...estado.products[1], barcode: String(estado.products[0].id) };
    estado.products[1] = impostor;

    estado.order_items.push({
      product_id: String(estado.products[0].id),
      quantity: 12,
      orders: { created_at: dias(5), status: 'paid' },
    });

    const { reglas } = await obtenerAprendizaje();
    const velocidad = reglas.find((r) => r.id === 'velocidad-cambiante')!;

    expect(velocidad.hallazgos.map((h) => h.sujeto)).not.toContain(impostor.name);
    expect(velocidad.hallazgos.map((h) => h.sujeto)).toEqual([estado.products[0].name]);
  });

  it('descarta la venta web anulada en vez de contarla como rotación', async () => {
    estado.order_items.push({
      product_id: String(estado.products[0].id),
      quantity: 12,
      orders: { created_at: dias(5), status: 'cancelado' },
    });

    const { reglas } = await obtenerAprendizaje();
    const velocidad = reglas.find((r) => r.id === 'velocidad-cambiante')!;

    // Todos quedan 6 contra 6: hay observaciones, pero ningún cambio de ritmo.
    expect(velocidad.estado).toBe('listo');
    expect(velocidad.hallazgos).toEqual([]);
  });
});
