import { describe, expect, it } from 'vitest';

import {
  CATEGORIA_FIESTAS_PATRIAS,
  esCategoriaDieciochera,
  esProductoDieciochero,
} from '@/lib/fiestas-patrias';

describe('esCategoriaDieciochera', () => {
  it('reconoce la categoría que el panel puede asignar a mano', () => {
    expect(esCategoriaDieciochera(CATEGORIA_FIESTAS_PATRIAS)).toBe(true);
    expect(esCategoriaDieciochera('Fiestas Patrias')).toBe(true);
    // Sin tildes ni mayúsculas: es el mismo nombre.
    expect(esCategoriaDieciochera('fiestas patrias')).toBe(true);
    expect(esCategoriaDieciochera('Asado')).toBe(true);
    expect(esCategoriaDieciochera('Parrilla')).toBe(true);
  });

  it('no marca como de temporada a una categoría cualquiera', () => {
    for (const nombre of ['Bebidas', 'Abarrotes', 'Lácteos', 'Panadería', 'Quesos']) {
      expect(esCategoriaDieciochera(nombre)).toBe(false);
    }
    expect(esCategoriaDieciochera(null)).toBe(false);
    expect(esCategoriaDieciochera('')).toBe(false);
  });
});

describe('curaduría manual de la sección del 18', () => {
  it('un producto entra a la sección sólo por llevar la categoría', () => {
    // El caso que motivó el cambio: un producto que no dice nada dieciochero
    // en el nombre, pero que la tienda quiere mostrar en la sección del 18.
    const vasos = { name: 'Vaso plástico x50', description: '', categories: ['Fiestas Patrias'] };
    expect(esProductoDieciochero(vasos)).toBe(true);
  });

  it('sigue funcionando la red de seguridad por palabras clave', () => {
    expect(esProductoDieciochero({ name: 'Empanada de pino', categories: ['Panadería'] })).toBe(true);
    expect(esProductoDieciochero({ name: 'Carbón 5 kg', categories: ['Abarrotes'] })).toBe(true);
  });

  it('no arrastra a un producto cualquiera', () => {
    expect(esProductoDieciochero({ name: 'Coca-Cola 1.5 Lt', categories: ['Bebidas'] })).toBe(false);
  });
});
