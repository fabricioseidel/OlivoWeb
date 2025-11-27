-- =============================================================================
-- AGREGAR COLUMNAS PARA COMPROBANTES DE TRANSFERENCIA
-- =============================================================================
-- Fecha: 2025-10-30
-- Propósito: Agregar columnas para almacenar comprobantes de transferencia
-- =============================================================================

-- Agregar columnas si no existen
DO $$ 
BEGIN
  -- Columna para la URI del comprobante
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'transfer_receipt_uri'
  ) THEN
    ALTER TABLE public.sales 
    ADD COLUMN transfer_receipt_uri TEXT;
    
    RAISE NOTICE 'Columna transfer_receipt_uri agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna transfer_receipt_uri ya existe';
  END IF;

  -- Columna para el nombre del archivo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND column_name = 'transfer_receipt_name'
  ) THEN
    ALTER TABLE public.sales 
    ADD COLUMN transfer_receipt_name TEXT;
    
    RAISE NOTICE 'Columna transfer_receipt_name agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna transfer_receipt_name ya existe';
  END IF;
END $$;

-- Verificar las columnas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
  AND table_schema = 'public'
  AND column_name IN ('transfer_receipt_uri', 'transfer_receipt_name')
ORDER BY column_name;
