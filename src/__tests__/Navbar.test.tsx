import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Navbar from '../components/layout/Navbar';
import { vi } from 'vitest';
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '../contexts/CartContext';

describe('Navbar', () => {
  it('renders logo and navigation', () => {
    render(
      <SessionProvider session={null}>
        <CartProvider>
          <Navbar />
        </CartProvider>
      </SessionProvider>
    );
  expect(screen.getByRole('navigation')).toBeInTheDocument();
  expect(screen.getByText(/OLIVOMARKET/i)).toBeInTheDocument();
  });
});
