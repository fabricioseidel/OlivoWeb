import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El ciclo de compra toca el inventario, así que un error acá se convierte en
 * stock que no existe. Lo que más se protege es que entre al stock LO QUE
 * LLEGÓ y no lo que se pidió: ese error es silencioso —nadie ve una excepción,
 * sólo un número mal— y llega hasta la venta web, que empieza a rechazar
 * pedidos por stock que sí hay, o a aceptar los que no.
 */

type Estado = {
  pedido: any;
  items: any[];
  rpc: any;
};

const estado: Estado = { pedido: null, items: [], rpc: { ok: true } };
const escrituras: { tabla: string; valores: any; filtros: Record<string, any> }[] = [];
const recepciones: { items: any[]; opciones: any }[] = [];
const reversos: { items: any[]; opciones: any }[] = [];

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    rpc: async (_nombre: string, _args: any) => ({ data: estado.rpc, error: null }),
    from: (tabla: string) => {
      const filtros: Record<string, any> = {};
      const api: any = {
        select: () => api,
        eq: (columna: string, valor: any) => {
          filtros[columna] = valor;
          return api;
        },
        in: () => api,
        neq: () => api,
        maybeSingle: async () => ({ data: estado.pedido, error: null }),
        update: (valores: any) => {
          escrituras.push({ tabla, valores, filtros });
          return api;
        },
        then: (resolve: any) =>
          resolve({
            data: tabla === 'supplier_order_items' ? estado.items : estado.pedido,
            error: null,
          }),
      };
      return api;
    },
  },
}));

vi.mock('@/server/inventory.service', () => ({
  applyReception: async (items: any[], opciones: any) => {
    recepciones.push({ items, opciones });
    return { ok: true };
  },
  reverseReception: async (items: any[], opciones: any) => {
    reversos.push({ items, opciones });
    return { ok: true };
  },
}));

import {
  marcarEnviado,
  confirmarDisponibilidad,
  registrarRecepcion,
  revertirRecepcion,
  generarMensajeCompra,
} from '@/server/purchase-cycle.service';

const PEDIDO = 'dddddddd-0000-0000-0000-000000000001';

const item = (extra: Partial<any> = {}) => ({
  id: 'item-1',
  quantity: 24,
  qty_received: null,
  unit_cost: 1500,
  tax_rate: 19,
  products: { barcode: '7591234567890', name: 'Harina PAN' },
  ...extra,
});

const escrituraDe = (tabla: string, campo: string) =>
  escrituras.find((e) => e.tabla === tabla && campo in e.valores);

beforeEach(() => {
  escrituras.length = 0;
  recepciones.length = 0;
  reversos.length = 0;
  estado.rpc = { ok: true };
  estado.pedido = {
    id: PEDIDO,
    status: 'enviado',
    supplier_id: '11111111-1111-1111-1111-111111111111',
  };
  estado.items = [item()];
});

describe('enviar', () => {
  it('rechaza un canal que no existe sin llamar a la base', async () => {
    const r = await marcarEnviado(PEDIDO, 'fax' as any);
    expect(r.ok).toBe(false);
  });

  it('acepta los cuatro canales previstos', async () => {
    for (const canal of ['whatsapp', 'online', 'presencial', 'telefono'] as const) {
      expect((await marcarEnviado(PEDIDO, canal)).ok).toBe(true);
    }
  });

  it('devuelve el motivo cuando la base rechaza la transición', async () => {
    estado.rpc = { ok: false, error: 'El pedido ya está recibido' };
    const r = await marcarEnviado(PEDIDO, 'whatsapp');

    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ error: 'El pedido ya está recibido' });
  });
});

describe('confirmar disponibilidad', () => {
  it('"disponible" confirma la cantidad pedida, sin que nadie la teclee', async () => {
    await confirmarDisponibilidad(PEDIDO, [
      { itemId: 'item-1', disponibilidad: 'disponible' },
    ]);

    expect(escrituraDe('supplier_order_items', 'qty_confirmed')!.valores).toMatchObject({
      availability: 'disponible',
      qty_confirmed: 24,
    });
  });

  it('"sin stock" confirma cero', async () => {
    await confirmarDisponibilidad(PEDIDO, [
      { itemId: 'item-1', disponibilidad: 'sin_stock', cantidadConfirmada: 10 },
    ]);

    // La cantidad tecleada se ignora: decir "no tiene" y "tiene 10" a la vez
    // son dos cosas contrarias.
    expect(escrituraDe('supplier_order_items', 'qty_confirmed')!.valores.qty_confirmed).toBe(0);
  });

  it('"parcial" toma el número que puso la persona', async () => {
    await confirmarDisponibilidad(PEDIDO, [
      { itemId: 'item-1', disponibilidad: 'parcial', cantidadConfirmada: 18 },
    ]);

    expect(escrituraDe('supplier_order_items', 'qty_confirmed')!.valores.qty_confirmed).toBe(18);
  });

  it('no deja confirmar más de lo que se pidió', async () => {
    await confirmarDisponibilidad(PEDIDO, [
      { itemId: 'item-1', disponibilidad: 'parcial', cantidadConfirmada: 99 },
    ]);

    expect(escrituraDe('supplier_order_items', 'qty_confirmed')!.valores.qty_confirmed).toBe(24);
  });

  it('ignora líneas que no son de este pedido', async () => {
    // El id llega del navegador: no se puede confiar en que pertenezca al
    // pedido que se está confirmando.
    const r = await confirmarDisponibilidad(PEDIDO, [
      { itemId: 'item-de-otro-pedido', disponibilidad: 'disponible' },
    ]);

    expect(r).toMatchObject({ ok: true, actualizadas: 0 });
    expect(escrituraDe('supplier_order_items', 'qty_confirmed')).toBeUndefined();
  });

  it('sin líneas no hace nada', async () => {
    expect((await confirmarDisponibilidad(PEDIDO, [])).ok).toBe(false);
  });
});

describe('recibir', () => {
  it('mueve al stock lo que llegó, no lo que se pidió', async () => {
    const r = await registrarRecepcion(PEDIDO, [
      { itemId: 'item-1', cantidadRecibida: 18 },
    ]);

    expect(r.ok).toBe(true);
    expect(recepciones[0].items).toEqual([
      { barcode: '7591234567890', qty: 18, name: 'Harina PAN' },
    ]);
  });

  it('no sobrescribe la cantidad pedida: la diferencia es el dato', async () => {
    await registrarRecepcion(PEDIDO, [{ itemId: 'item-1', cantidadRecibida: 18 }]);

    const escritura = escrituraDe('supplier_order_items', 'qty_received')!;
    expect(escritura.valores.qty_received).toBe(18);
    expect(escritura.valores).not.toHaveProperty('quantity');
  });

  it('una línea que no llegó no genera movimiento de stock', async () => {
    await registrarRecepcion(PEDIDO, [{ itemId: 'item-1', cantidadRecibida: 0 }]);

    expect(recepciones).toHaveLength(0);
    expect(escrituraDe('supplier_order_items', 'qty_received')!.valores.qty_received).toBe(0);
  });

  it('devuelve el costo de la factura al proveedor, para que salte la revisión', async () => {
    const r = await registrarRecepcion(PEDIDO, [
      { itemId: 'item-1', cantidadRecibida: 24, costoFactura: 1650 },
    ]);

    // Escribir el costo dispara el trigger del historial (Fase 1) y hace que la
    // pantalla de precios (Fase 2) marque el producto como "el costo cambió".
    const escritura = escrituraDe('product_suppliers', 'unit_cost')!;
    expect(escritura.valores).toMatchObject({ unit_cost: 1650, cost_source: 'recepcion' });
    expect(escritura.filtros).toMatchObject({ product_id: '7591234567890' });

    expect(r.ok && r.variaciones[0]).toMatchObject({
      costoPedido: 1500,
      costoFactura: 1650,
      relevante: true,
    });
  });

  it('una variación menor al umbral se informa pero no se marca relevante', async () => {
    // 2% es redondeo del proveedor, no un cambio de precio.
    const r = await registrarRecepcion(PEDIDO, [
      { itemId: 'item-1', cantidadRecibida: 24, costoFactura: 1530 },
    ]);

    expect(r.ok && r.variaciones[0].relevante).toBe(false);
  });

  it('sin cambio de costo no toca al proveedor', async () => {
    const r = await registrarRecepcion(PEDIDO, [
      { itemId: 'item-1', cantidadRecibida: 24, costoFactura: 1500 },
    ]);

    expect(escrituraDe('product_suppliers', 'unit_cost')).toBeUndefined();
    expect(r.ok && r.variaciones).toHaveLength(0);
  });

  it('el subtotal pasa a ser lo facturado de verdad', async () => {
    await registrarRecepcion(PEDIDO, [
      { itemId: 'item-1', cantidadRecibida: 18, costoFactura: 1650 },
    ]);

    // 18 × 1.650 = 29.700. El CHECK viejo lo habría rechazado contra las 24
    // pedidas; por eso la Fase 3 lo retira.
    expect(escrituraDe('supplier_order_items', 'subtotal')!.valores.subtotal).toBe(29700);
  });

  it('no recibe dos veces el mismo pedido', async () => {
    estado.pedido = { ...estado.pedido, status: 'recibido' };
    const r = await registrarRecepcion(PEDIDO, [{ itemId: 'item-1', cantidadRecibida: 24 }]);

    expect(r.ok).toBe(false);
    expect(recepciones).toHaveLength(0);
  });

  it('no recibe un pedido cancelado', async () => {
    estado.pedido = { ...estado.pedido, status: 'cancelado' };
    expect((await registrarRecepcion(PEDIDO, [{ itemId: 'item-1', cantidadRecibida: 1 }])).ok).toBe(false);
  });

  it('rechaza cantidades imposibles sin tocar el inventario', async () => {
    for (const cantidad of [-1, 1.5, NaN]) {
      const r = await registrarRecepcion(PEDIDO, [
        { itemId: 'item-1', cantidadRecibida: cantidad },
      ]);
      expect(r.ok).toBe(false);
    }
    expect(recepciones).toHaveLength(0);
  });
});

describe('revertir', () => {
  it('devuelve exactamente lo que había entrado, no lo pedido', async () => {
    estado.items = [item({ qty_received: 18 })];
    await revertirRecepcion(PEDIDO);

    // Revertir con las 24 pedidas descontaría seis unidades que nunca llegaron.
    expect(reversos[0].items[0].qty).toBe(18);
  });

  it('si nunca se anotó la recepción, usa lo pedido', async () => {
    estado.items = [item({ qty_received: null })];
    await revertirRecepcion(PEDIDO);

    expect(reversos[0].items[0].qty).toBe(24);
  });

  it('una recepción de cero no genera reverso', async () => {
    estado.items = [item({ qty_received: 0 })];
    await revertirRecepcion(PEDIDO);

    expect(reversos).toHaveLength(0);
  });
});

describe('mensaje de compra', () => {
  const pedido = { id: PEDIDO, proveedor: 'Distribuidora Central', notas: null };
  const lineas = [
    { nombre: 'Harina PAN', sku: '7591234567890', cantidad: 24, costoNeto: 1500, tasa: 19 },
  ];

  it('al proveedor le llega el precio con IVA, que es contra lo que confirma', async () => {
    const texto = generarMensajeCompra('whatsapp', pedido, lineas);

    expect(texto).toContain('Harina PAN');
    expect(texto).toContain('$1.785'); // 1.500 + IVA
    expect(texto).toMatch(/IVA incluido/);
    expect(texto).toMatch(/disponible/i); // le pregunta si tiene todo
  });

  it('la guía presencial lleva casillas y espacio para anotar el precio real', async () => {
    const texto = generarMensajeCompra('presencial', pedido, lineas);

    expect(texto).toContain('[ ]');
    expect(texto).toMatch(/Llegó: ____/);
    expect(texto).toMatch(/Precio pagado/);
  });

  it('un producto sin costo no inventa un precio', async () => {
    const texto = generarMensajeCompra('whatsapp', pedido, [
      { ...lineas[0], costoNeto: null },
    ]);

    expect(texto).toContain('precio a confirmar');
    expect(texto).not.toContain('$NaN');
  });
});
