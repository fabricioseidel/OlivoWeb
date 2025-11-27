import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartProvider, useCart } from '../contexts/CartContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component to access cart context
const TestComponent = () => {
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, total } = useCart();
  
  return (
    <div>
      <div data-testid="cart-count">{cartItems.length}</div>
      <div data-testid="cart-total">{total}</div>
      <button 
        onClick={() => addToCart({
          id: '1',
          name: 'Test Product',
          price: 100,
          slug: 'test-product',
          image: ''
        })}
        data-testid="add-button"
      >
        Add Product
      </button>
      <button 
        onClick={() => removeFromCart('1')}
        data-testid="remove-button"
      >
        Remove Product
      </button>
      <button 
        onClick={() => updateQuantity('1', 2)}
        data-testid="update-button"
      >
        Update Quantity
      </button>
      <button 
        onClick={clearCart}
        data-testid="clear-button"
      >
        Clear Cart
      </button>
      {cartItems.map((item) => (
        <div key={item.id} data-testid={`cart-item-${item.id}`}>
          {item.name} - Qty: {item.quantity} - Price: {item.price}
        </div>
      ))}
    </div>
  );
};

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should provide cart functionality', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

  // Inicialmente carrito vacío: subtotal 0, envío 0, total 0
  expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
  expect(screen.getByTestId('cart-total')).toHaveTextContent('0');

    // Add product to cart
    fireEvent.click(screen.getByTestId('add-button'));
    
    await waitFor(() => {
      // 1 item de 100 + shipping 10 => total 110
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
      expect(screen.getByTestId('cart-total')).toHaveTextContent('110');
      expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
    });

    // Update quantity
    fireEvent.click(screen.getByTestId('update-button'));
    
    await waitFor(() => {
      // 2 * 100 + shipping 10 = 210
      expect(screen.getByTestId('cart-total')).toHaveTextContent('210');
    });

    // Remove product
    fireEvent.click(screen.getByTestId('remove-button'));
    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
      expect(screen.getByTestId('cart-total')).toHaveTextContent('0');
    });

    // Clear cart
    fireEvent.click(screen.getByTestId('clear-button'));
    
    await waitFor(() => {
      // ya estaba vacío; sigue total 0
      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
      expect(screen.getByTestId('cart-total')).toHaveTextContent('0');
    });
  });
});
