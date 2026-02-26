/* Migration: Inventory Movements and Sale Items */
/* Date: 2026-02-26 */

/* 1. Create sale_items table */
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_barcode TEXT NOT NULL REFERENCES public.products(barcode) ON DELETE RESTRICT,
    product_name TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

/* Index for fast lookups by sale or product */
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_barcode ON public.sale_items(product_barcode);

/* 2. Create inventory_movements table */
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
        CREATE TYPE movement_type AS ENUM ('IN', 'OUT');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_barcode TEXT NOT NULL REFERENCES public.products(barcode) ON DELETE CASCADE,
    type movement_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

/* Index for fast lookups by product */
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_barcode ON public.inventory_movements(product_barcode);

/* Trigger to update product stock automatically */
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'IN' THEN
        UPDATE public.products SET stock = COALESCE(stock, 0) + NEW.quantity WHERE barcode = NEW.product_barcode;
    ELSIF NEW.type = 'OUT' THEN
        UPDATE public.products SET stock = COALESCE(stock, 0) - NEW.quantity WHERE barcode = NEW.product_barcode;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_inventory_movement_stock ON public.inventory_movements;
CREATE TRIGGER tr_inventory_movement_stock
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION update_stock_on_movement();
