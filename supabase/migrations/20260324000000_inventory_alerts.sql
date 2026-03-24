-- Añadir campos para alertas de inventario y pedidos inteligentes
ALTER TABLE products
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS optimum_stock INTEGER DEFAULT 20;

-- Para los productos existentes, establecer 'optimum_stock' basado en el stock actual si es mayor a 20
UPDATE products SET optimum_stock = stock WHERE stock > 20 AND optimum_stock = 20;
