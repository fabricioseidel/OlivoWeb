-- =====================================================
-- ACTUALIZAR ESTADOS DE PEDIDOS DE PROVEEDORES
-- =====================================================
-- Fecha: 2025-11-20
-- Descripción: Actualiza los estados para reflejar mejor el flujo de trabajo
--              - "entregado" -> "recibido"
--              - "enviado" -> "enviado_por_whatsapp" (cuando aplica)
--              - Añade nuevo estado "gestionado"
-- =====================================================

-- PASO 1: Eliminar la restricción CHECK existente PRIMERO
-- Esto permite que existan temporalmente cualquier valor
ALTER TABLE supplier_orders 
DROP CONSTRAINT IF EXISTS supplier_orders_status_check;

-- PASO 2: Normalizar todos los estados existentes
-- Convertir estados antiguos a nuevos
UPDATE supplier_orders 
SET status = 'enviado_por_whatsapp' 
WHERE status = 'enviado';

UPDATE supplier_orders 
SET status = 'recibido' 
WHERE status = 'entregado';

-- Si hay algún estado inválido, convertirlo a 'pendiente'
UPDATE supplier_orders 
SET status = 'pendiente' 
WHERE status NOT IN ('pendiente', 'confirmado', 'enviado_por_whatsapp', 'gestionado', 'recibido', 'cancelado');

-- PASO 3: Crear la nueva restricción CHECK con los estados actualizados
ALTER TABLE supplier_orders
ADD CONSTRAINT supplier_orders_status_check
CHECK (status IN (
    'pendiente', 
    'confirmado', 
    'enviado_por_whatsapp', 
    'gestionado', 
    'recibido', 
    'cancelado'
));

-- PASO 4: Actualizar el comentario de la columna
COMMENT ON COLUMN supplier_orders.status IS 'Estado del pedido: pendiente, confirmado, enviado_por_whatsapp, gestionado, recibido, cancelado';

-- PASO 5: Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload config';
