import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Cancelar un pedido impago: lo usan el webhook de MercadoPago y el cron de
 * pedidos abandonados.
 *
 * Lo que se fija acá es lo que costó caro cuando faltó: que el cupón vuelva
 * (el de bienvenida es de un solo uso y se perdía con un pago fallido), que
 * una cancelación atrasada no deshaga un pedido pagado, y que un aviso
 * repetido no devuelva el stock dos veces.
 */

type Llamada = { metodo: string; args: any[] };

const estado: {
  llamadas: Llamada[];
  tomadas: any[] | null;
  abandonados: Array<{ id: string }>;
} = { llamadas: [], tomadas: [], abandonados: [] };

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (tabla: string) => {
      const api: any = {};
      for (const metodo of ['update', 'eq', 'neq', 'not', 'or', 'limit']) {
        api[metodo] = (...args: any[]) => {
          estado.llamadas.push({ metodo, args });
          return api;
        };
      }
      api.select = (...args: any[]) => {
        estado.llamadas.push({ metodo: 'select', args });
        // El cron consulta con select() primero y encadena filtros después;
        // la cancelación termina con select(). Un thenable sirve a los dos.
        return api;
      };
      api.then = (resolve: any) =>
        resolve(
          estado.llamadas.some((l) => l.metodo === 'update')
            ? { data: estado.tomadas, error: null }
            : { data: estado.abandonados, error: null }
        );
      void tabla;
      return api;
    },
  },
}));

const restoreOrderStock = vi.fn(async () => ({
  ok: true as const,
  devueltos: 1,
  fallidos: 0,
  sinResolver: [] as string[],
}));
const releaseCouponUsage = vi.fn(async () => 1);
const addBonusPoints = vi.fn(async () => undefined);
const sendOrderCancelledEmail = vi.fn(async () => undefined);

vi.mock('@/server/inventory.service', () => ({ restoreOrderStock }));
vi.mock('@/server/coupon.service', () => ({ releaseCouponUsage }));
vi.mock('@/server/loyalty.service', () => ({ addBonusPoints }));
vi.mock('@/server/email.service', () => ({ sendOrderCancelledEmail }));
vi.mock('@/server/audit.service', () => ({ auditLog: vi.fn(async () => undefined) }));

const { cancelarPedido } = await import('@/server/order-cancel.service');

const base = { actor: 'test', motivo: 'prueba' };

beforeEach(() => {
  estado.llamadas = [];
  estado.tomadas = [{ id: 'o1', shipping_address: { email: 'a@b.cl', pointsRedeemed: 50 } }];
  estado.abandonados = [];
  vi.clearAllMocks();
});

describe('cancelarPedido', () => {
  it('devuelve stock, cupón y puntos, y avisa al cliente', async () => {
    const r = await cancelarPedido('o1', { ...base, estadoPago: 'cancelled' });

    expect(r).toEqual({ ok: true, cancelada: true });
    expect(restoreOrderStock).toHaveBeenCalledWith('o1', expect.anything());
    expect(releaseCouponUsage).toHaveBeenCalledWith('o1');
    expect(addBonusPoints).toHaveBeenCalledWith(expect.objectContaining({ points: 50 }));
    expect(sendOrderCancelledEmail).toHaveBeenCalledOnce();
  });

  it('una cancelación no toca pedidos pagados; un reembolso sí', async () => {
    await cancelarPedido('o1', { ...base, estadoPago: 'cancelled' });
    expect(estado.llamadas).toContainEqual({ metodo: 'neq', args: ['payment_status', 'paid'] });

    estado.llamadas = [];
    await cancelarPedido('o1', { ...base, estadoPago: 'refunded' });
    expect(estado.llamadas).not.toContainEqual({ metodo: 'neq', args: ['payment_status', 'paid'] });
  });

  it('reclama por status, para que un pedido con un intento rechazado se pueda cancelar', async () => {
    await cancelarPedido('o1', { ...base, estadoPago: 'cancelled' });
    expect(estado.llamadas).toContainEqual({
      metodo: 'not',
      args: ['status', 'in', '("cancelled","refunded")'],
    });
  });

  it('si otro aviso ya lo canceló, no deshace nada dos veces', async () => {
    estado.tomadas = [];
    const r = await cancelarPedido('o1', { ...base, estadoPago: 'cancelled' });

    expect(r).toEqual({ ok: true, cancelada: false, razon: 'ya_cancelada' });
    expect(restoreOrderStock).not.toHaveBeenCalled();
    expect(releaseCouponUsage).not.toHaveBeenCalled();
    expect(sendOrderCancelledEmail).not.toHaveBeenCalled();
  });
});

describe('cron de pedidos abandonados', () => {
  const pedir = (secreto?: string) =>
    new Request('http://x/api/cron/cancelar-pedidos-abandonados', {
      headers: secreto ? { authorization: `Bearer ${secreto}` } : {},
    }) as any;

  it('sin el secreto no hace nada', async () => {
    process.env.CRON_SECRET = 's3cr3t';
    const { GET } = await import('@/app/api/cron/cancelar-pedidos-abandonados/route');
    const res = await GET(pedir('otro'));
    expect(res.status).toBe(401);
  });

  it('cancela sólo pedidos de MercadoPago pendientes e impagos', async () => {
    process.env.CRON_SECRET = 's3cr3t';
    estado.abandonados = [{ id: 'o1' }];
    const { GET } = await import('@/app/api/cron/cancelar-pedidos-abandonados/route');

    const res = await GET(pedir('s3cr3t'));
    const body = await res.json();

    expect(estado.llamadas).toContainEqual({ metodo: 'eq', args: ['payment_method', 'mercadopago'] });
    expect(estado.llamadas).toContainEqual({ metodo: 'eq', args: ['status', 'pending'] });
    expect(estado.llamadas).toContainEqual({ metodo: 'neq', args: ['payment_status', 'paid'] });
    expect(body.cancelados).toBe(1);
    expect(releaseCouponUsage).toHaveBeenCalledWith('o1');
  });
});
