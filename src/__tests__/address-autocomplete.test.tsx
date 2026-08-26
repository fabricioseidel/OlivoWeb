import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import AddressAutocomplete from '@/components/AddressAutocomplete';

/**
 * El buscador de direcciones dispara una petición con retardo mientras el
 * cliente escribe. Lo que se protege acá es lo que pasa cuando esa petición
 * queda a medias: si el cliente sale del checkout, o si sigue escribiendo.
 *
 * Sin cancelar, el temporizador salta sobre un componente que ya no existe.
 * En producción es una petición inútil y un aviso de React; en la suite
 * reventaba el proceso entero después del teardown ("window is not defined"),
 * de forma intermitente — una ejecución pasaba y la siguiente no.
 */

type Pendiente = { resolver: (valor: any) => void; abortada: () => boolean };

let pendientes: Pendiente[] = [];

beforeEach(() => {
  pendientes = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init?: RequestInit) => {
      let abortada = false;
      return new Promise((resolve, reject) => {
        pendientes.push({ resolver: resolve, abortada: () => abortada });
        init?.signal?.addEventListener('abort', () => {
          abortada = true;
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const sugerencia = (nombre: string) => ({
  display_name: nombre,
  address: { road: 'Av. Irarrázaval' },
  lat: '-33.45',
  lon: '-70.6',
});

const escribir = (texto: string) =>
  fireEvent.change(screen.getByRole('textbox'), { target: { value: texto } });

const responder = async (indice: number, datos: any) => {
  await act(async () => {
    pendientes[indice].resolver({ ok: true, json: async () => datos });
  });
};

const esperarPeticiones = (n: number) =>
  waitFor(() => expect(fetch).toHaveBeenCalledTimes(n));

describe('búsqueda de direcciones', () => {
  it('busca tras el retardo y muestra las sugerencias', async () => {
    render(<AddressAutocomplete onChange={() => {}} />);
    escribir('Irarrazaval');

    await esperarPeticiones(1);
    await responder(0, [sugerencia('Av. Irarrázaval 1234, Ñuñoa')]);

    expect(screen.getByText('Av. Irarrázaval 1234, Ñuñoa')).toBeInTheDocument();
  });

  it('no busca con menos de tres caracteres', async () => {
    render(<AddressAutocomplete onChange={() => {}} />);
    escribir('Ir');

    await new Promise((r) => setTimeout(r, 400));
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('cancelación', () => {
  it('al desmontar cancela la petición en vuelo', async () => {
    const { unmount } = render(<AddressAutocomplete onChange={() => {}} />);
    escribir('Irarrazaval');
    await esperarPeticiones(1);

    unmount();

    // Sin esto la respuesta llegaría a un componente que ya no existe.
    expect(pendientes[0].abortada()).toBe(true);
  });

  it('al desmontar antes de que salte el retardo no llega a buscar', async () => {
    const { unmount } = render(<AddressAutocomplete onChange={() => {}} />);
    escribir('Irarrazaval');

    unmount();
    await new Promise((r) => setTimeout(r, 400));

    // El temporizador quedó cancelado: es el caso que rompía la suite.
    expect(fetch).not.toHaveBeenCalled();
  });

  it('una respuesta vieja que llega tarde no pisa la búsqueda nueva', async () => {
    render(<AddressAutocomplete onChange={() => {}} />);
    escribir('Irarrazaval');
    await esperarPeticiones(1);

    // El cliente sigue escribiendo: la búsqueda anterior deja de importar.
    escribir('Irarrazaval 1234');
    await esperarPeticiones(2);
    await responder(1, [sugerencia('Av. Irarrázaval 1234, Ñuñoa')]);

    // Ahora contesta la vieja, tarde.
    await responder(0, [sugerencia('RESULTADO VIEJO')]);

    expect(screen.queryByText('RESULTADO VIEJO')).not.toBeInTheDocument();
    expect(screen.getByText('Av. Irarrázaval 1234, Ñuñoa')).toBeInTheDocument();
  });

  it('cancelar no se confunde con una caída del servicio', async () => {
    render(<AddressAutocomplete onChange={() => {}} />);
    escribir('Irarrazaval');
    await esperarPeticiones(1);

    // Seguir escribiendo aborta la anterior. Si eso contara como error, el
    // aviso de "escribí la dirección a mano" saldría con cada tecla.
    escribir('Irarrazaval 1');
    await esperarPeticiones(2);

    expect(screen.queryByText(/manualmente|a mano|no disponible/i)).not.toBeInTheDocument();
  });
});
