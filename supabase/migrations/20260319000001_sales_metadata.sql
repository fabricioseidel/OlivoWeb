-- =============================================================================
-- MIGRACIÓN DE METADATOS DE VENTAS
-- =============================================================================
-- Fecha: 2026-03-19
-- Propósito: Agregar columnas para registro de vendedor, impuestos y efectivo.
-- =============================================================================

-- 1. Agregar columnas a la tabla sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS seller_name TEXT,
ADD COLUMN IF NOT EXISTS seller_email TEXT,
ADD COLUMN IF NOT EXISTS cash_received DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS change_given DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax DECIMAL(12, 2) DEFAULT 0;

-- 2. Asegurar que los índices existan para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_seller_name ON public.sales(seller_name);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);

-- 3. Actualizar la caché del esquema
NOTIFY pgrst, 'reload config';

RAISE NOTICE 'Migración de metadatos de ventas completada con éxito.';
