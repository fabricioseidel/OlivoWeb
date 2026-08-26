import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Este servicio decide qué productos aparecen marcados como problema en la
 * pantalla de precios. Los dos errores que importan son simétricos: callar un
 * producto que se está vendiendo a pérdida, y llenar la lista de falsos
 * positivos hasta que nadie la mire.
 */

type Tabla = Record<string, any[]>;
const tablas: Tabla = {
  products: [],
  product_suppliers: [],
  suppliers: [],
  category_margins: [],
  supplier_cost_history: [],
};

const escrituras: { tabla: string; valores: any; barcode: string }[] = [];
const upserts: { tabla: string; valores: any }[] = [];
const borrados: { tabla: string; valor: string }[] = [];

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (tabla: string) => {
      const api: any = {
        select: () => api,
        not: () => api,
        order: () => api,
        range: async () => ({ data: tablas[tabla] ?? [], error: null }),
        update: (valores: any) => ({
          eq: async (_col: string, barcode: string) => {
            escrituras.push({ tabla, valores, barcode });
            return { error: null };
          },
        }),
        upsert: async (valores: any) => {
          upserts.push({ tabla, valores });
          return { error: null };
        },
        delete: () => ({
          eq: async (_col: string, valor: string) => {
            borrados.push({ tabla, valor });
            return { error: null };
          },
        }),
      };
      return api;
    },
  },
}));

import {
  obtenerFotoPrecios,
  aplicarPrecio,
  marcarRevisado,
  guardarMargenCategoria,
  borrarMargenCategoria,
} from '@/server/pricing.service';

const PROVEEDOR_A = '11111111-1111-1111-1111-111111111111';
const PROVEEDOR_B = '22222222-2222-2222-2222-222222222222';

const producto = (extra: Partial<any> = {}) => ({
  barcode: '1',
  name: 'Harina PAN',
  category: 'Abarrotes',
  sale_price: 2000,
  offer_price: null,
  is_active: true,
  price_reviewed_at: '2026-01-01T00:00:00Z',
  margin_override: null,
  ...extra,
});

const asignacion = (extra: Partial<any> = {}) => ({
  product_id: '1',
  supplier_id: PROVEEDOR_A,
  unit_cost: 1000,
  tax_rate: 19,
  unit_cost_gross: 1190,
  priority: 1,
  cost_updated_at: '2026-01-01T00:00:00Z',
  ...extra,
});

const fila = async (indice = 0) => (await obtenerFotoPrecios()).filas[indice];

beforeEach(() => {
  escrituras.length = 0;
  upserts.length = 0;
  borrados.length = 0;
  tablas.products = [producto()];
  tablas.product_suppliers = [asignacion()];
  tablas.suppliers = [
    { id: PROVEEDOR_A, name: 'Distribuidora Central' },
    { id: PROVEEDOR_B, name: 'Importadora Sur' },
  ];
  tablas.category_margins = [
    { category: '__default__', margin: 0.35, rounding: 'decena' },
  ];
  tablas.supplier_cost_history = [];
});

describe('margen', () => {
  it('calcula lo que deja el precio que ya está puesto', async () => {
    // Costo 1.000 neto → 1.190 con IVA. Vendido a 2.000 deja 40,5%.
    const f = await fila();

    expect(f.costoBruto).toBeCloseTo(1190, 6);
    expect(f.margenActual).toBeCloseTo(0.405, 3);
    expect(f.motivos).not.toContain('bajo-margen');
  });

  it('marca bajo margen lo que no llega a la regla', async () => {
    tablas.products = [producto({ sale_price: 1500 })];
    const f = await fila();

    expect(f.motivos).toContain('bajo-margen');
    expect(f.sugerido).toBe(1840); // 1.190/0,65 redondeado a la decena
    expect(f.diferencia).toBe(340);
  });

  it('vender bajo el costo no se cuenta además como bajo margen', async () => {
    // Serían dos motivos diciendo lo mismo y el producto saldría dos veces.
    tablas.products = [producto({ sale_price: 1000 })];
    const f = await fila();

    expect(f.motivos).toContain('bajo-costo');
    expect(f.motivos).not.toContain('bajo-margen');
    expect(f.margenActual).toBeLessThan(0);
  });

  it('sin costo cargado no inventa un margen', async () => {
    tablas.product_suppliers = [];
    const f = await fila();

    expect(f.motivos).toContain('sin-costo');
    expect(f.margenActual).toBeNull();
    expect(f.sugerido).toBeNull();
    expect(f.motivos).not.toContain('bajo-margen');
    expect(f.motivos).not.toContain('bajo-costo');
  });
});

describe('regla de margen aplicada', () => {
  it('la categoría manda sobre el margen general', async () => {
    tablas.category_margins.push({ category: 'Abarrotes', margin: 0.5, rounding: 'decena' });
    const f = await fila();

    expect(f.margenObjetivo).toBe(0.5);
    expect(f.origenMargen).toBe('categoria');
    expect(f.motivos).toContain('bajo-margen'); // 40,5% no llega al 50%
  });

  it('el margen propio del producto manda sobre el de su categoría', async () => {
    tablas.category_margins.push({ category: 'Abarrotes', margin: 0.5, rounding: 'decena' });
    tablas.products = [producto({ margin_override: 0.2 })];
    const f = await fila();

    expect(f.margenObjetivo).toBe(0.2);
    expect(f.origenMargen).toBe('producto');
    expect(f.motivos).not.toContain('bajo-margen');
  });

  it('sin reglas cargadas cae en el 35% histórico', async () => {
    tablas.category_margins = [];
    const f = await fila();

    expect(f.margenObjetivo).toBe(0.35);
    expect(f.origenMargen).toBe('general');
  });

  it('usa el redondeo de la categoría para proponer el precio', async () => {
    tablas.category_margins.push({
      category: 'Abarrotes', margin: 0.35, rounding: 'terminacion90',
    });
    const f = await fila();

    expect(f.sugerido).toBe(1890);
  });
});

describe('proveedor que manda', () => {
  it('elige el de prioridad más baja', async () => {
    tablas.product_suppliers = [
      asignacion({ supplier_id: PROVEEDOR_B, priority: 2, unit_cost: 900, unit_cost_gross: 1071 }),
      asignacion({ supplier_id: PROVEEDOR_A, priority: 1, unit_cost: 1000 }),
    ];
    const f = await fila();

    expect(f.costoNeto).toBe(1000);
    expect(f.proveedores.find((p: any) => p.preferido)?.supplierName).toBe('Distribuidora Central');
  });

  it('un proveedor principal sin costo no puede decidir el precio', async () => {
    tablas.product_suppliers = [
      asignacion({ supplier_id: PROVEEDOR_A, priority: 1, unit_cost: null, unit_cost_gross: null }),
      asignacion({ supplier_id: PROVEEDOR_B, priority: 2, unit_cost: 900, unit_cost_gross: 1071 }),
    ];
    const f = await fila();

    expect(f.costoNeto).toBe(900);
    expect(f.motivos).not.toContain('sin-costo');
  });

  it('avisa cuando otro proveedor lo deja más barato', async () => {
    tablas.product_suppliers = [
      asignacion({ supplier_id: PROVEEDOR_A, priority: 1, unit_cost: 1000 }),
      asignacion({ supplier_id: PROVEEDOR_B, priority: 2, unit_cost: 850, unit_cost_gross: 1011.5 }),
    ];
    const f = await fila();

    expect(f.hayProveedorMasBarato).toBe(true);
  });

  it('no avisa cuando el que se usa ya es el más barato', async () => {
    tablas.product_suppliers = [
      asignacion({ supplier_id: PROVEEDOR_A, priority: 1, unit_cost: 800 }),
      asignacion({ supplier_id: PROVEEDOR_B, priority: 2, unit_cost: 900 }),
    ];
    expect((await fila()).hayProveedorMasBarato).toBe(false);
  });
});

describe('costo que cambió', () => {
  const cambio = (extra: Partial<any> = {}) => ({
    product_barcode: '1',
    supplier_id: PROVEEDOR_A,
    unit_cost: 1200,
    previous_unit_cost: 1000,
    recorded_at: '2026-06-01T00:00:00Z',
    ...extra,
  });

  it('marca el producto cuando el costo subió después de revisar el precio', async () => {
    tablas.supplier_cost_history = [cambio()];
    const f = await fila();

    expect(f.motivos).toContain('costo-cambio');
    expect(f.variacionCosto).toBeCloseTo(0.2, 6);
    expect(f.costoAnterior).toBe(1000);
  });

  it('ignora un cambio anterior a la última revisión: ya se tuvo en cuenta', async () => {
    tablas.supplier_cost_history = [cambio({ recorded_at: '2025-06-01T00:00:00Z' })];
    const f = await fila();

    expect(f.motivos).not.toContain('costo-cambio');
    expect(f.variacionCosto).toBeNull();
  });

  it('un cambio menor al umbral no genera ruido', async () => {
    // 2% es redondeo del proveedor, no un cambio de precio.
    tablas.supplier_cost_history = [cambio({ unit_cost: 1020 })];
    expect((await fila()).motivos).not.toContain('costo-cambio');
  });

  it('una bajada fuerte también importa: se puede vender más barato', async () => {
    tablas.supplier_cost_history = [cambio({ unit_cost: 800 })];
    expect((await fila()).motivos).toContain('costo-cambio');
  });

  it('se queda con el cambio más reciente de cada par producto+proveedor', async () => {
    tablas.supplier_cost_history = [
      cambio({ unit_cost: 1300, previous_unit_cost: 1200, recorded_at: '2026-07-01T00:00:00Z' }),
      cambio(),
    ];
    expect((await fila()).costoAnterior).toBe(1200);
  });

  it('no mira el historial de un proveedor que no es el que manda', async () => {
    tablas.supplier_cost_history = [cambio({ supplier_id: PROVEEDOR_B })];
    expect((await fila()).motivos).not.toContain('costo-cambio');
  });
});

describe('sin revisar', () => {
  it('un precio nunca revisado se marca como tal', async () => {
    tablas.products = [producto({ price_reviewed_at: null })];
    expect((await fila()).motivos).toContain('sin-revisar');
  });

  it('y cualquier cambio de costo cuenta, porque no hay revisión contra la cual comparar', async () => {
    tablas.products = [producto({ price_reviewed_at: null })];
    tablas.supplier_cost_history = [{
      product_barcode: '1', supplier_id: PROVEEDOR_A,
      unit_cost: 1200, previous_unit_cost: 1000, recorded_at: '2020-01-01T00:00:00Z',
    }];
    expect((await fila()).motivos).toContain('costo-cambio');
  });
});

describe('catálogo', () => {
  it('deja fuera los productos inactivos: no están a la venta a propósito', async () => {
    tablas.products = [producto(), producto({ barcode: '2', name: 'Viejo', is_active: false })];
    const foto = await obtenerFotoPrecios();

    expect(foto.filas).toHaveLength(1);
    expect(foto.resumen.total).toBe(1);
  });

  it('ordena poniendo primero lo que pierde plata', async () => {
    tablas.products = [
      producto({ barcode: '1', name: 'Sano', sale_price: 2000 }),
      producto({ barcode: '2', name: 'A pérdida', sale_price: 1000 }),
      producto({ barcode: '3', name: 'Poco margen', sale_price: 1500 }),
    ];
    tablas.product_suppliers = [
      asignacion({ product_id: '1' }),
      asignacion({ product_id: '2' }),
      asignacion({ product_id: '3' }),
    ];
    const foto = await obtenerFotoPrecios();

    expect(foto.filas.map((f: any) => f.nombre)).toEqual(['A pérdida', 'Poco margen', 'Sano']);
  });

  it('el resumen cuenta cada problema por separado', async () => {
    tablas.products = [
      producto({ barcode: '1', sale_price: 1000 }),                       // bajo costo
      producto({ barcode: '2', sale_price: 2000, price_reviewed_at: null }), // sin revisar
      producto({ barcode: '3', sale_price: 2000 }),                       // sin costo
    ];
    tablas.product_suppliers = [asignacion({ product_id: '1' }), asignacion({ product_id: '2' })];
    const foto = await obtenerFotoPrecios();

    expect(foto.resumen.bajoCosto).toBe(1);
    expect(foto.resumen.sinRevisar).toBe(1);
    expect(foto.resumen.sinCosto).toBe(1);
    expect(foto.resumen.total).toBe(3);
  });
});

describe('aplicar precio', () => {
  it('guarda el precio y la marca de revisión juntos', async () => {
    const r = await aplicarPrecio('1', 1840, 'usuario-1');

    expect(r.ok).toBe(true);
    expect(escrituras[0].valores.sale_price).toBe(1840);
    expect(escrituras[0].valores.price_reviewed_at).toBeTruthy();
    expect(escrituras[0].valores.price_reviewed_by).toBe('usuario-1');
    expect(escrituras[0].barcode).toBe('1');
  });

  it('sin autor identificado guarda NULL, no cadena vacía', async () => {
    // "" en una columna uuid no guarda "sin autor": la base rechaza la fila
    // entera y el precio no se guardaría.
    await aplicarPrecio('1', 1840, '');
    expect(escrituras[0].valores.price_reviewed_by).toBeNull();
  });

  it('redondea al peso: no existe el medio peso', async () => {
    await aplicarPrecio('1', 1840.6, null);
    expect(escrituras[0].valores.sale_price).toBe(1841);
  });

  it('rechaza un precio de cero o negativo sin tocar la base', async () => {
    expect((await aplicarPrecio('1', 0, null)).ok).toBe(false);
    expect((await aplicarPrecio('1', -5, null)).ok).toBe(false);
    expect((await aplicarPrecio('1', NaN, null)).ok).toBe(false);
    expect(escrituras).toHaveLength(0);
  });

  it('marcar como revisado no toca el precio', async () => {
    await marcarRevisado('1', 'usuario-1');

    expect(escrituras[0].valores.price_reviewed_at).toBeTruthy();
    expect(escrituras[0].valores).not.toHaveProperty('sale_price');
  });
});

describe('categorías', () => {
  it('muestra el margen real de cada una, que es la evidencia para fijar la regla', async () => {
    tablas.products = [
      producto({ barcode: '1', category: 'Bebidas', sale_price: 1400 }),
      producto({ barcode: '2', category: 'Bebidas', sale_price: 1600 }),
      producto({ barcode: '3', category: 'Abarrotes', sale_price: 2000 }),
    ];
    tablas.product_suppliers = ['1', '2', '3'].map((id) => asignacion({ product_id: id }));

    const foto = await obtenerFotoPrecios();
    const bebidas = foto.categorias.find((c: any) => c.categoria === 'Bebidas')!;

    expect(bebidas.productos).toBe(2);
    // 1.400 deja 15%, 1.600 deja 25,6% → promedio ~20,3%
    expect(bebidas.margenActual).toBeCloseTo(0.203, 2);
    expect(bebidas.margen).toBeNull(); // todavía sin regla propia
    expect(bebidas.bajoLaRegla).toBe(2); // ninguno llega al 35% general
  });

  it('refleja la regla propia cuando existe', async () => {
    tablas.category_margins.push({ category: 'Abarrotes', margin: 0.2, rounding: 'terminacion90' });
    const foto = await obtenerFotoPrecios();
    const abarrotes = foto.categorias.find((c: any) => c.categoria === 'Abarrotes')!;

    expect(abarrotes.margen).toBe(0.2);
    expect(abarrotes.redondeo).toBe('terminacion90');
    expect(abarrotes.bajoLaRegla).toBe(0); // 40,5% supera el 20%
  });

  it('pone primero las categorías con más productos bajo la regla', async () => {
    tablas.products = [
      producto({ barcode: '1', category: 'Sanas', sale_price: 3000 }),
      producto({ barcode: '2', category: 'Problematicas', sale_price: 1300 }),
      producto({ barcode: '3', category: 'Problematicas', sale_price: 1300 }),
    ];
    tablas.product_suppliers = ['1', '2', '3'].map((id) => asignacion({ product_id: id }));

    const foto = await obtenerFotoPrecios();
    expect(foto.categorias[0].categoria).toBe('Problematicas');
  });
});

describe('guardar márgenes', () => {
  it('guarda la regla de una categoría', async () => {
    const r = await guardarMargenCategoria('Bebidas', 0.22, 'terminacion90', 'usuario-1');

    expect(r.ok).toBe(true);
    expect(upserts[0].valores).toMatchObject({
      category: 'Bebidas',
      margin: 0.22,
      rounding: 'terminacion90',
      updated_by: 'usuario-1',
    });
  });

  it('rechaza un margen del 100% o más: el precio sería infinito', async () => {
    expect((await guardarMargenCategoria('Bebidas', 1, 'decena')).ok).toBe(false);
    expect((await guardarMargenCategoria('Bebidas', 1.5, 'decena')).ok).toBe(false);
    expect((await guardarMargenCategoria('Bebidas', -0.1, 'decena')).ok).toBe(false);
    expect(upserts).toHaveLength(0);
  });

  it('rechaza una categoría vacía', async () => {
    expect((await guardarMargenCategoria('   ', 0.3, 'decena')).ok).toBe(false);
    expect(upserts).toHaveLength(0);
  });

  it('quita la regla propia de una categoría', async () => {
    const r = await borrarMargenCategoria('Bebidas');

    expect(r.ok).toBe(true);
    expect(borrados[0]).toMatchObject({ tabla: 'category_margins', valor: 'Bebidas' });
  });

  it('no deja borrar el margen general: dejaría a la pantalla sin referencia', async () => {
    const r = await borrarMargenCategoria('__default__');

    expect(r.ok).toBe(false);
    expect(borrados).toHaveLength(0);
  });
});
