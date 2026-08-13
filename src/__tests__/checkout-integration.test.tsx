import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutPage from '../app/checkout/page';
import { SessionProvider } from 'next-auth/react';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

// Mock useCart to return items
const mockCartItems = [
  { id: '1', name: 'Producto Test', price: 1000, quantity: 2, image: '/test.jpg' }
];

vi.mock('../contexts/CartContext', async () => {
  const actual = await vi.importActual('../contexts/CartContext');
  return {
    ...actual,
    useCart: () => ({
      cartItems: mockCartItems,
      clearCart: vi.fn(),
      validateCartWithServer: vi.fn().mockResolvedValue(true),
    }),
  };
});

describe('CheckoutPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders checkout form and summary', () => {
    render(
      <SessionProvider session={null}>
        <CheckoutPage />
      </SessionProvider>
    );

    // Check header (texto dividido en spans → usar accessible name del heading)
    expect(screen.getByRole('heading', { name: /Finalizar Pedido/i })).toBeInTheDocument();

    // Check summary items
    expect(screen.getByText('Producto Test')).toBeInTheDocument();

    // Check form fields presence
    expect(screen.getByLabelText(/Nombre completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Dirección$/i)).toBeInTheDocument();
  });

  it('validates required fields on continue', async () => {
    window.alert = vi.fn();

    render(
      <SessionProvider session={null}>
        <CheckoutPage />
      </SessionProvider>
    );

    // El checkout ofrece el mismo avance en el formulario y en el resumen fijo.
    const [continueBtn] = screen.getAllByRole('button', { name: /Continuar al pago/i });
    fireEvent.click(continueBtn);

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('completa tus datos')
    );
  });

  it('advances to payment step when required fields are filled', async () => {
    render(
      <SessionProvider session={null}>
        <CheckoutPage />
      </SessionProvider>
    );

    // Fill step 1 (fullName, email y address son los campos requeridos)
    fireEvent.change(screen.getByLabelText(/Nombre completo/i), { target: { value: 'Juan Perez' } });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), { target: { value: 'juan@test.com' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: '123456789' } });
    fireEvent.change(screen.getByLabelText(/^Dirección$/i), { target: { value: 'Calle Falsa 123' } });
    fireEvent.change(screen.getByLabelText(/Ciudad/i), { target: { value: 'Santiago' } });

    // Go to step 2
    fireEvent.click(screen.getAllByRole('button', { name: /Continuar al pago/i })[0]);

    // Step 2: confirmación de ruta + método de pago + botón de finalizar
    await waitFor(() => {
      expect(screen.getByText(/Revisa tu entrega/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/MercadoPago/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^Pagar \$/i })).toBeInTheDocument();
  });
});
