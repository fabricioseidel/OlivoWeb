import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del servicio: lo que nos interesa es CUÁNTAS veces se llama
const fetchAllProducts = vi.hoisted(() => vi.fn(async () => []));
const fetchAllCategories = vi.hoisted(() => vi.fn(async () => [] as string[]));

vi.mock('@/services/products', async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return { ...real, fetchAllProducts };
});
vi.mock('@/services/categories', () => ({
  fetchAllCategories,
  upsertCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

import { ProductProvider, useProducts } from '@/contexts/ProductContext';
import { CategoryProvider, useCategories } from '@/contexts/CategoryContext';

function ConsumidorProductos() {
  const { loading } = useProducts();
  return <span>productos:{String(loading)}</span>;
}

function ConsumidorCategorias() {
  const { categories } = useCategories();
  return <span>categorias:{categories.length}</span>;
}

/**
 * El layout raíz envuelve también al admin. Si los providers cargaran al
 * montarse, abrir el POS desde el teléfono descargaría todo el catálogo de la
 * tienda sin usarlo. La carga debe dispararla el consumidor, no el provider.
 */
describe('carga perezosa del catálogo', () => {
  beforeEach(() => {
    fetchAllProducts.mockClear();
    fetchAllCategories.mockClear();
  });

  it('ProductProvider no pide productos si nadie los consume', async () => {
    render(
      <ProductProvider>
        <div>pantalla sin catálogo</div>
      </ProductProvider>
    );
    await screen.findByText('pantalla sin catálogo');
    expect(fetchAllProducts).not.toHaveBeenCalled();
  });

  it('los pide en cuanto un componente usa useProducts', async () => {
    render(
      <ProductProvider>
        <ConsumidorProductos />
      </ProductProvider>
    );
    await waitFor(() => expect(fetchAllProducts).toHaveBeenCalledTimes(1));
  });

  it('no los pide dos veces con varios consumidores', async () => {
    render(
      <ProductProvider>
        <ConsumidorProductos />
        <ConsumidorProductos />
      </ProductProvider>
    );
    await waitFor(() => expect(fetchAllProducts).toHaveBeenCalledTimes(1));
  });

  it('CategoryProvider tampoco pide categorías sin consumidor', async () => {
    render(
      <CategoryProvider>
        <div>sin categorías</div>
      </CategoryProvider>
    );
    await screen.findByText('sin categorías');
    expect(fetchAllCategories).not.toHaveBeenCalled();
  });

  it('las pide al usar useCategories', async () => {
    render(
      <CategoryProvider>
        <ConsumidorCategorias />
      </CategoryProvider>
    );
    await waitFor(() => expect(fetchAllCategories).toHaveBeenCalledTimes(1));
  });
});
