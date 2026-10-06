-- Cupón "carrito gratis": cubre el carrito entero a PRECIO DE LISTA (sin
-- ofertas) hasta `discount_value`. El cliente sólo paga el envío; retirando en
-- tienda el pedido sale $0.

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_type_check
  CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping', 'full_cart'));

-- Cupón de la ganadora del concurso: $50.000, un solo uso, no se aplica solo.
INSERT INTO public.coupons
  (code, name, description, discount_type, discount_value, min_purchase,
   max_uses, max_uses_per_customer, is_active, applies_to, auto_apply)
VALUES
  ('GANADORA-OLIVO50', 'Premio concurso — $50.000',
   'Carrito gratis hasta $50.000 a precios completos. Sólo pagas el envío; retiro en tienda sin costo.',
   'full_cart', 50000, 0, 1, 1, true, 'all', false)
ON CONFLICT (code) DO NOTHING;
