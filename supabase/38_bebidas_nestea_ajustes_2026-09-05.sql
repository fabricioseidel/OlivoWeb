-- Bebidas, segunda pasada: baja de tres productos que no se están consiguiendo,
-- costo de los dos Nestéa de 450 gr y precio de los dos de 90 gr.

begin;

-- 1. Sin disponibilidad hoy.
update products set is_active = false, updated_at = now()
where barcode in ('7801610001523',   -- Coca-Cola Original 2.5 Lt
                  '7801610350256',   -- Coca-Cola Zero 2 Lt Retornable
                  '7804673740095');  -- Don Limón Menta Jengibre 600 Ml

-- 2. Los dos Nestéa grandes son de 450 gr y cuestan lo mismo. Al de limón se le
-- pone el gramaje en el nombre: llamarlo sólo "Grande" es lo que lo hacía
-- indistinguible del de 1 kg.
update products set name = 'Nestea Limón 450 Gr', updated_at = now() where barcode = '7591016022474';

with lista(product_id) as (values ('7591016022474'::text), ('7591016022481'))
insert into product_suppliers (product_id, supplier_id, priority, unit_cost, tax_rate, cost_updated_at, cost_source)
select l.product_id, s.id, 1, round(9500::numeric / 1.19, 6), 19, now(), 'manual'
from lista l cross join suppliers s where s.name = 'Salazar La Vega'
on conflict (product_id, supplier_id) do update set
  priority = 1, unit_cost = excluded.unit_cost, tax_rate = excluded.tax_rate,
  cost_updated_at = excluded.cost_updated_at, cost_source = excluded.cost_source;

update product_suppliers set priority = 2
where product_id in ('7591016022474','7591016022481')
  and supplier_id <> (select id from suppliers where name = 'Salazar La Vega')
  and priority = 1;

-- 3. Los dos Nestéa de 90 gr a $2.300.
update products set sale_price = 2300, price_reviewed_at = now()
where barcode in ('7591016005965','7591016003671');

commit;

-- 4. El Nestéa de 1 kg no existe: era el de 450 gr cargado con otro nombre y
-- otro código. Se unifica y el formato grande queda a $14.000, que es el precio
-- al que se vende. A los $10.000 que tenía habría quedado al 5% de margen.
begin;

update branch_stock bs set stock = bs.stock + d.stock, updated_at = now()
from branch_stock d
where d.branch_id = bs.branch_id and d.stock > 0
  and d.product_barcode = '7591016203033' and bs.product_barcode = '7591016022474';

delete from branch_stock where product_barcode = '7591016203033';

update products set stock = 20, sale_price = 14000, price_reviewed_at = now(), updated_at = now()
where barcode = '7591016022474';  -- limón 450 gr: 10 + 10

update products set sale_price = 14000, price_reviewed_at = now(), updated_at = now()
where barcode = '7591016022481';  -- durazno 450 gr

update products set name = 'Nestea Limón 1 kg [duplicado, unificado 05/09/2026]',
       stock = 0, is_active = false, updated_at = now()
where barcode = '7591016203033';

-- El vínculo con el proveedor se borra en vez de dejarse colgando: el producto
-- ya no se compra, y un vínculo vivo lo seguiría trayendo a las pantallas de
-- reposición.
delete from product_suppliers where product_id = '7591016203033';

commit;
