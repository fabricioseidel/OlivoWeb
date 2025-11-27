-- =============================================================================
-- SCRIPT 11: CORREGIR COLUMNAS DE sale_items
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Renombrar columnas para coincidir con la función apply_sale
-- =============================================================================

-- Renombrar columnas para que coincidan con lo que espera apply_sale
ALTER TABLE public.sale_items 
  RENAME COLUMN barcode TO product_barcode;

ALTER TABLE public.sale_items 
  RENAME COLUMN name TO product_name;

ALTER TABLE public.sale_items 
  RENAME COLUMN qty TO quantity;

-- Agregar columna discount si no existe
ALTER TABLE public.sale_items 
  ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;

-- Verificar estructura final
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'sale_items' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
