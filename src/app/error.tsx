'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        ¡Ups! Algo salió mal
      </h2>
      <p className="text-gray-600 mb-8 max-w-md">
        Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
        Por favor, intenta recargar la página.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()}>
          Intentar de nuevo
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
