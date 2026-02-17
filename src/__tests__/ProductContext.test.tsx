import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useProducts, ProductProvider } from '../contexts/ProductContext';

describe('ProductContext', () => {
  it('provides default values', async () => {
    let value: ReturnType<typeof useProducts> | undefined;
    function TestComponent() {
      value = useProducts();
      return <div>Test</div>;
    }
    render(
      <ProductProvider>
        <TestComponent />
      </ProductProvider>
    );
    
    await waitFor(() => {
      expect(value).toBeDefined();
      expect(value?.loading).toBe(false);
    });
    
    expect(value?.products).toBeDefined();
  });
});
