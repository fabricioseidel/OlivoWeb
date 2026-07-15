-- Columna independiente de `featured`, curada a mano, para la sección
-- "Todo a $1.000" de la home.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS promo_1000 BOOLEAN DEFAULT false;
