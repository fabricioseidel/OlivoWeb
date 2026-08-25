import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Modo vitrina: la tienda se ve pero no vende.
 *
 * Lo que se protege acá es que el bloqueo sea del SERVIDOR. Un botón
 * deshabilitado no impide llamar la ruta de crear pedido a mano, y si eso pasa
 * antes de abrir se genera un cobro real por un pedido que nadie va a
 * preparar. Por eso también importa el caso de "no se pudo leer la
 * configuración": ahí hay que cerrar, no abrir.
 */

const state: { row: any; error: any } = { row: null, error: null };

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: () => {
      const api: any = {
        select: () => api,
        eq: () => api,
        maybeSingle: async () => ({ data: state.row, error: state.error }),
      };
      return api;
    },
  },
}));

import {
  assertOrdersEnabled,
  getStoreStatus,
  invalidateStoreStatusCache,
} from '@/server/store-status.service';
import {
  PREVIEW_DEFAULT_MESSAGE,
  toStoreStatus,
  STORE_STATUS_FALLBACK,
} from '@/lib/store-status';

beforeEach(() => {
  state.row = null;
  state.error = null;
  invalidateStoreStatusCache();
});

describe('estado de la tienda', () => {
  it('con la tienda abierta deja pasar los pedidos', async () => {
    state.row = { preview_mode: false, preview_message: null };
    expect(await assertOrdersEnabled()).toEqual({ ok: true });
  });

  it('en vitrina rechaza el pedido y devuelve el motivo', async () => {
    state.row = { preview_mode: true, preview_message: 'Abrimos el lunes' };
    const res = await assertOrdersEnabled();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe('Abrimos el lunes');
  });

  it('usa el texto por defecto si el aviso quedó vacío', async () => {
    state.row = { preview_mode: true, preview_message: '   ' };
    const res = await assertOrdersEnabled();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe(PREVIEW_DEFAULT_MESSAGE);
  });

  it('sin fila de settings queda en vitrina, no abierta', async () => {
    state.row = null;
    expect(await getStoreStatus()).toEqual(STORE_STATUS_FALLBACK);
    expect((await assertOrdersEnabled()).ok).toBe(false);
  });

  it('si la base falla cierra las ventas en vez de dejarlas pasar', async () => {
    state.error = { code: '500', message: 'conexión caída' };
    expect((await assertOrdersEnabled()).ok).toBe(false);
  });

  it('cachea la lectura pero la invalidación la refresca al instante', async () => {
    state.row = { preview_mode: true, preview_message: null };
    expect((await getStoreStatus()).previewMode).toBe(true);

    // Cambia la base: sin invalidar, sigue sirviendo el valor cacheado.
    state.row = { preview_mode: false, preview_message: null };
    expect((await getStoreStatus()).previewMode).toBe(true);

    // Es lo que hace el guardado de configuración al abrir la tienda.
    invalidateStoreStatusCache();
    expect((await getStoreStatus()).previewMode).toBe(false);
  });
});

describe('toStoreStatus', () => {
  it('solo un false explícito abre la tienda', () => {
    // Un campo ausente o nulo —una base sin migrar, un body incompleto— no
    // puede interpretarse como "abierta".
    expect(toStoreStatus({}).previewMode).toBe(true);
    expect(toStoreStatus({ previewMode: null }).previewMode).toBe(true);
    expect(toStoreStatus({ previewMode: true }).previewMode).toBe(true);
    expect(toStoreStatus({ previewMode: false }).previewMode).toBe(false);
  });

  it('recorta el aviso y cae al texto por defecto si queda vacío', () => {
    expect(toStoreStatus({ previewMessage: '  Volvemos pronto  ' }).previewMessage).toBe(
      'Volvemos pronto'
    );
    expect(toStoreStatus({ previewMessage: '' }).previewMessage).toBe(PREVIEW_DEFAULT_MESSAGE);
  });
});
