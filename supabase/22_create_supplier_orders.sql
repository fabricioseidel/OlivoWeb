-- =====================================================
-- TABLAS PARA GESTIÓN DE PEDIDOS A PROVEEDORES
-- =====================================================
-- Fecha: 2025-10-30
-- Descripción: Sistema de órdenes de compra a proveedores
--              con seguimiento de estado y pagos
-- =====================================================

-- Tabla principal de pedidos a proveedores
CREATE TABLE IF NOT EXISTS supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información del proveedor
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    
    -- Fechas
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expected_date DATE NOT NULL, -- Fecha esperada de entrega
    delivered_date DATE, -- Fecha real de entrega
    
    -- Estados
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (
        status IN ('pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado')
    ),
    payment_status TEXT NOT NULL DEFAULT 'pendiente' CHECK (
        payment_status IN ('pendiente', 'parcial', 'pagado')
    ),
    
    -- Montos
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Información adicional
    notes TEXT,
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_paid_amount CHECK (paid_amount >= 0 AND paid_amount <= total),
    CONSTRAINT valid_total CHECK (total >= 0)
);

-- Índices para supplier_orders
CREATE INDEX idx_supplier_orders_supplier ON supplier_orders(supplier_id);
CREATE INDEX idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX idx_supplier_orders_payment_status ON supplier_orders(payment_status);
CREATE INDEX idx_supplier_orders_order_date ON supplier_orders(order_date DESC);
CREATE INDEX idx_supplier_orders_expected_date ON supplier_orders(expected_date);

-- Tabla de items del pedido
CREATE TABLE IF NOT EXISTS supplier_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con el pedido
    order_id UUID NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
    
    -- Información del producto
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    supplier_sku TEXT, -- SKU del proveedor (puede diferir del nuestro)
    
    -- Cantidades y precios
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    
    -- Información adicional
    notes TEXT,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_subtotal CHECK (subtotal = quantity * unit_cost)
);

-- Índices para supplier_order_items
CREATE INDEX idx_supplier_order_items_order ON supplier_order_items(order_id);
CREATE INDEX idx_supplier_order_items_product ON supplier_order_items(product_id);

-- Trigger para actualizar updated_at en supplier_orders
CREATE OR REPLACE FUNCTION update_supplier_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_supplier_order_timestamp
    BEFORE UPDATE ON supplier_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_order_timestamp();

-- Trigger para recalcular el total del pedido al modificar items
CREATE OR REPLACE FUNCTION recalculate_supplier_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE supplier_orders
    SET total = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM supplier_order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_on_insert
    AFTER INSERT ON supplier_order_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_supplier_order_total();

CREATE TRIGGER trigger_recalculate_on_update
    AFTER UPDATE ON supplier_order_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_supplier_order_total();

CREATE TRIGGER trigger_recalculate_on_delete
    AFTER DELETE ON supplier_order_items
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_supplier_order_total();

-- Trigger para actualizar payment_status automáticamente
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.paid_amount = 0 THEN
        NEW.payment_status = 'pendiente';
    ELSIF NEW.paid_amount >= NEW.total THEN
        NEW.payment_status = 'pagado';
    ELSE
        NEW.payment_status = 'parcial';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_status
    BEFORE INSERT OR UPDATE OF paid_amount, total ON supplier_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_status();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_order_items ENABLE ROW LEVEL SECURITY;

-- Política para supplier_orders: permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden gestionar pedidos proveedores"
    ON supplier_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política para supplier_order_items: permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden gestionar items de pedidos"
    ON supplier_order_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE supplier_orders IS 'Órdenes de compra a proveedores';
COMMENT ON TABLE supplier_order_items IS 'Items incluidos en cada orden de compra';

COMMENT ON COLUMN supplier_orders.status IS 'Estado del pedido: pendiente, confirmado, enviado, entregado, cancelado';
COMMENT ON COLUMN supplier_orders.payment_status IS 'Estado del pago: pendiente, parcial, pagado';
COMMENT ON COLUMN supplier_orders.expected_date IS 'Fecha esperada de entrega del pedido';
COMMENT ON COLUMN supplier_orders.delivered_date IS 'Fecha real en que se recibió el pedido';

COMMENT ON COLUMN supplier_order_items.supplier_sku IS 'SKU del producto según el proveedor (puede diferir del nuestro)';
COMMENT ON COLUMN supplier_order_items.subtotal IS 'Subtotal del item (quantity * unit_cost) - calculado automáticamente';
