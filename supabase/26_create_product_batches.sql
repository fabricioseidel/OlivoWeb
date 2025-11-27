-- =====================================================
-- SISTEMA DE LOTES Y FECHAS DE CADUCIDAD
-- =====================================================
-- Fecha: 2025-11-20
-- Descripción: Implementa control de lotes con fechas de caducidad
--              para productos recibidos de proveedores
-- =====================================================

-- Tabla de lotes de productos
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación con producto y pedido
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    supplier_order_id UUID REFERENCES supplier_orders(id) ON DELETE SET NULL,
    supplier_order_item_id UUID REFERENCES supplier_order_items(id) ON DELETE SET NULL,
    
    -- Información del lote
    batch_number TEXT, -- Número de lote del proveedor (opcional)
    quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
    quantity_current INTEGER NOT NULL CHECK (quantity_current >= 0),
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    
    -- Fechas importantes
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE, -- Fecha de caducidad (opcional para productos no perecederos)
    
    -- Notas
    notes TEXT,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_current_quantity CHECK (quantity_current <= quantity_received)
);

-- Índices para product_batches
CREATE INDEX idx_product_batches_product ON product_batches(product_id);
CREATE INDEX idx_product_batches_supplier_order ON product_batches(supplier_order_id);
CREATE INDEX idx_product_batches_expiry_date ON product_batches(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_product_batches_received_date ON product_batches(received_date DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_product_batch_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_batch_timestamp
    BEFORE UPDATE ON product_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_product_batch_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

-- Política para product_batches: permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden gestionar lotes"
    ON product_batches
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- VISTA PARA PRODUCTOS PRÓXIMOS A VENCER
-- =====================================================

CREATE OR REPLACE VIEW products_expiring_soon AS
SELECT 
    pb.id as batch_id,
    pb.product_id,
    p.name as product_name,
    p.barcode,
    pb.batch_number,
    pb.quantity_current,
    pb.expiry_date,
    pb.received_date,
    (pb.expiry_date - CURRENT_DATE) as days_until_expiry
FROM product_batches pb
JOIN products p ON pb.product_id = p.id
WHERE pb.expiry_date IS NOT NULL
  AND pb.quantity_current > 0
  AND pb.expiry_date >= CURRENT_DATE
  AND pb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY pb.expiry_date ASC;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE product_batches IS 'Lotes de productos recibidos con control de caducidad';
COMMENT ON COLUMN product_batches.batch_number IS 'Número de lote del proveedor (opcional)';
COMMENT ON COLUMN product_batches.quantity_received IS 'Cantidad recibida inicialmente en este lote';
COMMENT ON COLUMN product_batches.quantity_current IS 'Cantidad actual disponible en este lote';
COMMENT ON COLUMN product_batches.expiry_date IS 'Fecha de caducidad del lote (opcional para productos no perecederos)';
COMMENT ON VIEW products_expiring_soon IS 'Vista de productos próximos a vencer en los próximos 90 días';

-- Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload config';
