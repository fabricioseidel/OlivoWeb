-- Unificación de los Maruchan duplicados, baja de la Coca-Cola Express y carga
-- de los dos costos que faltaban (catálogo Central Mayorista, precios con IVA).
--
-- Había tres registros de sopa instantánea pollo/carne sin precio ni costo. Dos
-- eran el MISMO producto (vaso de pollo 64 gr) cargado con dos códigos: el real
-- de Maruchan (prefijo 041789) y uno con prefijo 041369, que no es de la marca.
-- El de 85 gr NO es duplicado: es el sobre, otro formato y otro precio.

begin;

-- 1. El stock por sucursal y el movimiento de inventario pasan al código bueno.
update branch_stock set product_barcode = '041789001918', updated_at = now()
where product_barcode = '041369001918';

update inventory_movements set product_barcode = '041789001918'
where product_barcode = '041369001918';

-- 2. El superviviente absorbe el stock y toma la convención de nombres del catálogo.
update products
set name = 'Sopa Instantánea Pollo 64 Gr Maruchan',
    category = 'Abarrotes',
    description = 'Sopa instantánea Maruchan sabor pollo 64 gr.',
    stock = 3,
    updated_at = now()
where barcode = '041789001918';

-- 3. El duplicado se marca y se desactiva, igual que los unificados de agosto.
update products
set name = 'Sopa instantánea pollo 64g [duplicado, unificado 04/09/2026]',
    stock = 0, is_active = false, updated_at = now()
where barcode = '041369001918';

-- 4. Coca-Cola Express: sin precio, sin costo, sin stock y sin ventas registradas.
update products set is_active = false, updated_at = now()
where barcode = '2848610880104';

-- 5. Typo de marca en el sobre de 85 gr ("marchan").
update products
set name = 'Sopa Instantánea Carne 85 Gr Maruchan', updated_at = now()
where barcode = '041789002922';

-- 6. Costos del catálogo de Central Mayorista, con IVA como el resto del pedido.
with proveedor as (select id from suppliers where name = 'Central Mayorista'),
lista(product_id, precio_con_iva) as (
  values ('041789001918'::text, 950::numeric),   -- vaso pollo 64 gr
         ('041789002922',       580)             -- sobre carne de res 85 gr
)
insert into product_suppliers (product_id, supplier_id, priority, unit_cost, tax_rate, cost_updated_at, cost_source)
select l.product_id, pr.id, 1, round(l.precio_con_iva / 1.19, 6), 19, now(), 'pedido'
from lista l cross join proveedor pr
on conflict (product_id, supplier_id) do update set
  priority = 1, unit_cost = excluded.unit_cost, tax_rate = excluded.tax_rate,
  cost_updated_at = excluded.cost_updated_at, cost_source = excluded.cost_source;

-- 7. Precios de venta. El pollo 64 gr va a $1.500, el mismo que el de carne 64 gr:
-- mismo formato, mismo costo y en la góndola van juntos. La regla del 35% daría
-- $1.470, pero dos precios distintos para el mismo vaso confunden al cliente y a
-- quien repone. El sobre de 85 gr sí sale de la regla: 580 / 0,65 = 892 → $900.
update products set sale_price = 1500, price_reviewed_at = now() where barcode = '041789001918';
update products set sale_price =  900, price_reviewed_at = now() where barcode = '041789002922';

commit;
