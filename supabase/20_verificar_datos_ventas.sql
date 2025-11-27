-- =============================================================================
-- VERIFICACIÓN: DATOS DE VENTAS SINCRONIZADOS
-- =============================================================================
-- Fecha: 2025-10-29
-- Propósito: Verificar qué información de ventas está disponible en Supabase
-- =============================================================================

-- 1. VENTAS: Información básica sincronizada
-- -----------------------------------------------------------------------------
SELECT 
  s.id AS sale_id,
  s.total,
  s.payment_method AS metodo_pago,
  seller.name AS vendedor,
  u.email AS vendedor_email,
  s.seller_id AS vendedor_id,
  s.ts AS fecha,
  s.cash_received AS efectivo_recibido,
  s.change_given AS cambio,
  s.discount AS descuento,
  s.tax AS impuesto,
  s.notes AS notas,
  s.device_id AS dispositivo,
  s.client_sale_id AS id_venta_local,
  s.voided AS anulada
FROM public.sales s
LEFT JOIN public.sellers seller ON s.seller_id = seller.id
LEFT JOIN public.users u ON seller.user_id = u.id
WHERE s.seller_id IS NOT NULL  -- Solo ventas con vendedor (del teléfono)
ORDER BY s.ts DESC
LIMIT 10;

-- 2. ITEMS DE VENTA: Detalle de productos vendidos
-- -----------------------------------------------------------------------------
SELECT 
  si.sale_id,
  si.product_barcode AS codigo,
  si.product_name AS producto,
  si.quantity AS cantidad,
  si.unit_price AS precio_unitario,
  si.subtotal,
  si.discount AS descuento,
  seller.name AS vendedor,
  s.ts AS fecha_venta
FROM public.sale_items si
JOIN public.sales s ON si.sale_id = s.id
LEFT JOIN public.sellers seller ON s.seller_id = seller.id
WHERE s.seller_id IS NOT NULL
ORDER BY s.ts DESC
LIMIT 20;

-- 3. RESUMEN POR VENDEDOR
-- -----------------------------------------------------------------------------
SELECT 
  seller.name AS vendedor,
  u.email AS vendedor_email,
  COUNT(*) AS total_ventas,
  SUM(s.total) AS total_vendido,
  MIN(s.ts) AS primera_venta,
  MAX(s.ts) AS ultima_venta
FROM public.sales s
LEFT JOIN public.sellers seller ON s.seller_id = seller.id
LEFT JOIN public.users u ON seller.user_id = u.id
WHERE s.seller_id IS NOT NULL
GROUP BY seller.name, u.email
ORDER BY total_vendido DESC;

-- 4. VERIFICAR ESTRUCTURA DE TABLA SALES (ejecutar primero)
-- -----------------------------------------------------------------------------
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================
-- INFORMACIÓN QUE DEBERÍA ESTAR SINCRONIZADA:
-- =============================================================================
-- ✅ Total de la venta
-- ✅ Método de pago (efectivo, tarjeta, transferencia)
-- ✅ Vendedor que realizó la venta
-- ✅ Fecha y hora de la venta
-- ✅ Items vendidos (productos, cantidades, precios)
-- 
-- ⚠️ INFORMACIÓN ADICIONAL (verificar si existe):
-- - Efectivo recibido y cambio entregado
-- - Descuentos aplicados
-- - Impuestos
-- - Notas de la venta
-- - ID del dispositivo
-- - Cliente (si se captura)
-- - Estado de la venta (completada, cancelada, etc.)
-- =============================================================================
