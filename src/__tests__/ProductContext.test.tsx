import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useProducts, ProductContext, ProductProvider } from '../contexts/ProductContext';

describe('ProductContext', () => {
  it('provides default values', () => {
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
    expect(value).toBeDefined();
  expect(value?.products).toBeDefined();
  });
});
