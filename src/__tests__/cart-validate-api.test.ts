import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `/api/cart/validate` es lo último que corre antes de mandar al cliente a
 * pagar. Si miente, el cliente ve el total cambiar solo en la pantalla de
 * pago —que es exactamente lo que pasaba con las ofertas: la ruta comparaba
 * contra `sale_price` a secas, así que **todo producto en oferta salía como
 * "cambió de precio"** y el carrito se reescribía con el precio de lista, más
 * caro.
 *
 * Los tests de `precio-oferta` cubren la fórmula; estos cubren la ruta, que es
 * donde estaba el error: la fórmula nunca estuvo mal, simplemente no se
 * llamaba.
 */

const state: {
  products: any[];
  branch: any;
  branchStock: any[];
} = { products: [], branch: { id: 'suc-1' }, branchStock: [] };

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (tabla: string) => {
      const api: any = {
        select: () => api,
        eq: () => api,
        in: () => api,
        maybeSingle: async () => ({ data: state.branch, error: null }),
        then: (resolve: any) =>
          resolve(
            tabla === 'products'
              ? { data: state.products, error: null }
              : { data: state.branchStock, error: null }
          ),
      };
      return api;
    },
  },
}));

import { POST } from '@/app/api/cart/validate/route';

/** El catálogo tal como lo devuelve Supabase: `numeric` llega como string. */
const producto = (p: {
  barcode: string;
  name: string;
  sale_price: number;
  offer_price?: number | null;
  stock?: number;
}) => ({
  id: 1,
  barcode: p.barcode,
  name: p.name,
  sale_price: p.sale_price,
  offer_price: p.offer_price === undefined ? null : String(p.offer_price),
  stock: p.stock ?? 50,
  is_active: true,
});

const validar = async (items: any[]) => {
  const req = new Request('http://localhost/api/cart/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const res = await POST(req as any);
  return (await res.json()).updates as any[];
};

beforeEach(() => {
  state.branch = { id: 'suc-1' };
  state.branchStock = [];
  state.products = [
    // Los tres del pedido real del 14-08-2026 que salió $800 caro.
    producto({ barcode: '7702084137520', name: 'Harina De Maíz PAN Blanca', sale_price: 1800, offer_price: 1500 }),
    producto({ barcode: '7804671630671', name: 'Harina De Maiz La Criolla', sale_price: 1750, offer_price: 1500 }),
    producto({ barcode: '7707237414046', name: 'Harina De Maíz La Nieve', sale_price: 1750, offer_price: 1500 }),
    producto({ barcode: '7801610000571', name: 'Coca-Cola 591 Original', sale_price: 1500, offer_price: 1400 }),
    producto({ barcode: 'SIN-OFERTA', name: 'Producto normal', sale_price: 2490 }),
  ];
});

describe('ofertas', () => {
  it('no toca un carrito armado con precios de oferta', async () => {
    const updates = await validar([
      { id: '7702084137520', quantity: 1, price: 1500 },
      { id: '7804671630671', quantity: 1, price: 1500 },
      { id: '7707237414046', quantity: 1, price: 1500 },
    ]);

    expect(updates).toEqual([]);
  });

  it('mezcla ofertas y precios de lista sin inventar cambios', async () => {
    const updates = await validar([
      { id: '7801610000571', quantity: 2, price: 1400 },
      { id: 'SIN-OFERTA', quantity: 1, price: 2490 },
    ]);

    expect(updates).toEqual([]);
  });

  it('corrige a la baja un carrito viejo que quedó con el precio de lista', async () => {
    // Alguien dejó el carrito abierto antes de que se cargara la oferta.
    const updates = await validar([{ id: '7702084137520', quantity: 1, price: 1800 }]);

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      priceChanged: true,
      oldPrice: 1800,
      newPrice: 1500,
    });
  });

  it('sube el precio cuando la oferta se terminó', async () => {
    state.products = [producto({ barcode: 'X', name: 'Sin oferta ya', sale_price: 1800 })];

    const updates = await validar([{ id: 'X', quantity: 1, price: 1500 }]);

    expect(updates[0]).toMatchObject({ priceChanged: true, oldPrice: 1500, newPrice: 1800 });
  });

  it('ignora una "oferta" más cara que el precio de lista', async () => {
    state.products = [producto({ barcode: 'X', name: 'Oferta al revés', sale_price: 1800, offer_price: 2000 })];

    const updates = await validar([{ id: 'X', quantity: 1, price: 1800 }]);

    expect(updates).toEqual([]);
  });
});

describe('redondeo', () => {
  it('no marca cambio de precio por los decimales de la base', async () => {
    // La vitrina redondea al mapear; la base guarda `numeric`. Comparar los dos
    // sin redondear marcaba como "cambió de precio" algo que nadie tocó.
    state.products = [producto({ barcode: 'X', name: 'Con decimales', sale_price: 1499.5 })];

    const updates = await validar([{ id: 'X', quantity: 1, price: 1500 }]);

    expect(updates).toEqual([]);
  });
});

describe('lo que ya andaba sigue andando', () => {
  it('recorta la cantidad al stock de la sucursal que despacha', async () => {
    state.branchStock = [{ product_barcode: '7702084137520', stock: 2 }];

    const updates = await validar([{ id: '7702084137520', quantity: 5, price: 1500 }]);

    expect(updates[0]).toMatchObject({ insufficientStock: true, availableQty: 2 });
    // Sin cambio de precio: la oferta sigue siendo la correcta.
    expect(updates[0].priceChanged).toBeUndefined();
  });

  it('saca del carrito un producto que ya no existe', async () => {
    const updates = await validar([{ id: 'NO-EXISTE', quantity: 1, price: 1000 }]);

    expect(updates[0]).toMatchObject({ insufficientStock: true, availableQty: 0 });
  });
});
