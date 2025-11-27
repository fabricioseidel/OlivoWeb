-- =====================================================
-- FUNCIONES PARA GESTIÓN AUTOMÁTICA DE INVENTARIO
-- =====================================================
-- Fecha: 2025-11-20
-- Descripción: Funciones para incrementar/decrementar stock
--              cuando se reciben o cancelan pedidos a proveedores
-- =====================================================

-- Función para incrementar el stock de un producto
CREATE OR REPLACE FUNCTION increment_product_stock(
    p_product_id BIGINT,
    p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET stock = COALESCE(stock, 0) + p_quantity
    WHERE id = p_product_id;
    
    -- Log de la operación
    RAISE NOTICE 'Stock incrementado para producto %: +%', p_product_id, p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para decrementar el stock de un producto
CREATE OR REPLACE FUNCTION decrement_product_stock(
    p_product_id BIGINT,
    p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET stock = GREATEST(COALESCE(stock, 0) - p_quantity, 0)
    WHERE id = p_product_id;
    
    -- Log de la operación
    RAISE NOTICE 'Stock decrementado para producto %: -%', p_product_id, p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION increment_product_stock IS 'Incrementa el stock de un producto cuando se recibe un pedido';
COMMENT ON FUNCTION decrement_product_stock IS 'Decrementa el stock de un producto (sin permitir valores negativos)';

-- Notificar a PostgREST
NOTIFY pgrst, 'reload config';
