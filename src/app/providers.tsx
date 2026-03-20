"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <CartProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </CartProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
