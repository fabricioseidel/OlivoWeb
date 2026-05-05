-- Función para decrementar stock de forma atómica y segura
CREATE OR REPLACE FUNCTION decrement_stock_atomic(
    p_product_id BIGINT,
    p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Seleccionar con bloqueo de fila
    SELECT stock INTO v_current_stock
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;
    
    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RETURN FALSE;
    END IF;
    
    UPDATE products
    SET stock = stock - p_quantity
    WHERE id = p_product_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
