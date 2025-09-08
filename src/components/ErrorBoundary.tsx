'use client';

import { useErrorHandler } from '@/hooks/useErrorHandler';

// Componente para inicializar el manejo de errores globales
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  useErrorHandler();
  return <>{children}</>;
}
