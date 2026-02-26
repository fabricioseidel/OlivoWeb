import { useEffect } from 'react';
import { logger } from "@/utils/logger";

// Hook para manejar errores no capturados
export function useErrorHandler() {
  useEffect(() => {
    // Manejar promesas rechazadas no capturadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection:', event.reason);

      // Prevenir que el error se propague al navegador
      event.preventDefault();

      // Mostrar el error de forma más amigable
      const errorMessage = typeof event.reason === 'string'
        ? event.reason
        : event.reason?.message || 'Error desconocido';

      logger.error('Error no manejado:', errorMessage);

      // Opcional: mostrar una notificación toast
      // toast.error(errorMessage);
    };

    // Manejar errores JavaScript no capturados
    const handleError = (event: ErrorEvent) => {
      logger.error('Unhandled error:', event.error || event.message);
      event.preventDefault();
    };

    // Agregar listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
}

// Función utilitaria para hacer fetch con mejor manejo de errores
export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error) {
    logger.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

// Función para manejar respuestas JSON de forma segura
export async function safeJsonParse<T = any>(response: Response): Promise<T> {
  try {
    const text = await response.text();
    if (!text) {
      throw new Error('Empty response');
    }
    return JSON.parse(text);
  } catch (error) {
    logger.error('Error parsing JSON:', error);
    throw new Error('Invalid JSON response');
  }
}
