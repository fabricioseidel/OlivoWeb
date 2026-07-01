import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Navbar from '../components/layout/Navbar';
import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '../contexts/CartContext';
import { ToastProvider } from '../contexts/ToastContext';

describe('Navbar', () => {
  it('renders logo and navigation', () => {
    render(
      <SessionProvider session={null}>
        <ToastProvider>
          <CartProvider>
            <Navbar />
          </CartProvider>
        </ToastProvider>
      </SessionProvider>
    );
  expect(screen.getByRole('navigation')).toBeInTheDocument();
  // Navbar may render the brand as an image (logo) or text; accept either.
  const hasText = screen.queryByText(/OLIVOMARKET/i);
  if (hasText) {
    expect(hasText).toBeInTheDocument();
  } else {
    expect(screen.getByAltText(/OLIVOMARKET/i)).toBeInTheDocument();
  }
  });
});
