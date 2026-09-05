-- Bebidas: unificación de duplicados, costos y baja de un producto descontinuado.
--
-- Dos productos se cargaron por inferencia y no por dato directo, porque así se
-- indicó ("al mismo precio que el resto"): la Coca-Cola Light 1.5 lt toma los
-- $1.560 que ya tienen la Coca-Cola Original 1.5, la Zero 1.5, la Fanta 1.5 y la
-- Sprite 1.5 en Don Joaquín, y la Limón Soda 1.5 toma los $1.350 de las Pepsi
-- 1.5 del mismo proveedor, que es la otra línea CCU del mismo formato.

begin;

-- 1. Duplicados de Nestéa. El stock se suma sucursal por sucursal antes de
-- borrar: un update del código chocaría con la fila que el superviviente ya
-- tiene en esa misma sucursal, y una suma al total sin tocar branch_stock
-- dejaría los dos conteos discrepando.
update branch_stock bs set stock = bs.stock + d.stock, updated_at = now()
from branch_stock d
where d.branch_id = bs.branch_id and d.stock > 0
  and ((d.product_barcode='591679005965'  and bs.product_barcode='7591016005965')
    or (d.product_barcode='561215446231'  and bs.product_barcode='7591016003671'));

delete from branch_stock where product_barcode in ('591679005965','561215446231');

update products set stock = 22, updated_at = now() where barcode = '7591016005965'; -- limón 90 gr: 12 + 10
update products set stock = 36, updated_at = now() where barcode = '7591016003671'; -- durazno 90 gr: 26 + 10

update products set name = name || ' [duplicado, unificado 05/09/2026]',
       stock = 0, is_active = false, updated_at = now()
where barcode in ('591679005965','561215446231');

-- 2. Pepsi Zero 2 lt: no se está consiguiendo.
update products set is_active = false, updated_at = now() where barcode = '7801620006877';

-- 3. Costos.
with lista(product_id, proveedor, precio_con_iva) as (
  values
    ('7591016203033'::text, 'Salazar La Vega',                              9500::numeric), -- Nestea Limón 1 kg
    ('7591016003671',       'Salazar La Vega',                              1500),          -- Nestea Durazno 90 Gr
    ('7802820678161',       'Embotelladora Andina S.A. (Coca-Cola Andina)',  980),          -- Powerade Naranja 850 Ml
    ('7801610022726',       'Distribuidora Don Joaquín',                    1560),          -- Coca-Cola Light 1.5 Lt
    ('7801620340186',       'Distribuidora Don Joaquín',                    1350)           -- Limón Soda 1.5 Lt
)
insert into product_suppliers (product_id, supplier_id, priority, unit_cost, tax_rate, cost_updated_at, cost_source)
select l.product_id, s.id, 1, round(l.precio_con_iva / 1.19, 6), 19, now(), 'manual'
from lista l join suppliers s on s.name = l.proveedor
on conflict (product_id, supplier_id) do update set
  priority = 1, unit_cost = excluded.unit_cost, tax_rate = excluded.tax_rate,
  cost_updated_at = excluded.cost_updated_at, cost_source = excluded.cost_source;

-- 4. La Coca-Cola Zero 2 lt retornable sólo se compra en Andina. Se deja el
-- vínculo sin costo: así deja de contar como "sin proveedor" y queda a la vista
-- que lo que falta es el precio, no saber a quién comprarle.
insert into product_suppliers (product_id, supplier_id, priority, notes)
select '7801610350256', id, 1, 'Sólo se compra en Embotelladora Andina. Falta cargar el costo.'
from suppliers where name = 'Embotelladora Andina S.A. (Coca-Cola Andina)'
on conflict (product_id, supplier_id) do nothing;

commit;
