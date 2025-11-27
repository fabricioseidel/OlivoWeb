-- =====================================================
-- AGREGAR COLUMNAS PARA DOCUMENTOS EN SUPPLIER_ORDERS
-- =====================================================
-- Fecha: 2025-10-30
-- Propósito: Permitir subir comprobante de pago y factura
-- =====================================================

-- Agregar columnas para documentos
ALTER TABLE supplier_orders 
ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
ADD COLUMN IF NOT EXISTS payment_receipt_name TEXT,
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_name TEXT;

-- Comentarios
COMMENT ON COLUMN supplier_orders.payment_receipt_url IS 'URL del comprobante de pago en Supabase Storage';
COMMENT ON COLUMN supplier_orders.payment_receipt_name IS 'Nombre original del archivo de comprobante';
COMMENT ON COLUMN supplier_orders.invoice_url IS 'URL de la factura del proveedor en Supabase Storage';
COMMENT ON COLUMN supplier_orders.invoice_name IS 'Nombre original del archivo de factura';

-- Verificación
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'supplier_orders' 
--   AND column_name LIKE '%receipt%' OR column_name LIKE '%invoice%';
