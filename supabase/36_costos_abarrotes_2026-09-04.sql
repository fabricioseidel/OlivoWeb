-- Costos de los 10 productos de Abarrotes que estaban sin costo, con el proveedor
-- que corresponde a cada uno. Precios del catálogo, con IVA.
--
-- unit_cost se guarda NETO (doctrina de pricing); el trigger propaga a
-- products.purchase_price. El plátano se vende por kilo (by_weight), así que su
-- costo por kilo ES el costo unitario.

begin;

with lista(product_id, proveedor, precio_con_iva) as (
  values
    ('900000000104'::text, 'Inversiones CB',    1750::numeric),  -- Plátano Maduro (por kilo)
    ('7803600981532',      'Central Mayorista', 1290),           -- Sal parrillera Lobos 750 g
    ('7801505001706',      'Central Mayorista',  970),           -- Azúcar Iansa granulada 900 gr
    ('7802575007261',      'Central Mayorista', 2390),           -- Lasaña tradicional Carozzi 400 g
    ('7804677980008',      'Salazar La Vega',   1500),           -- Panela Tierra Colombiana 500 gr
    ('7802900332419',      'Central Mayorista',  550),           -- Soprole 1+1 chococrispi
    ('7801505231974',      'Central Mayorista',  950),           -- Azúcar Flor Iansa 500 gr
    ('7802575006035',      'Central Mayorista',  790),           -- Corbatas Carozzi 400 g
    ('7802575004437',      'Central Mayorista',  790),           -- Spaghetti Carozzi 400 gr
    ('7809559200717',      'Central Mayorista',  670)            -- Harina con polvo Smart Price 1 kg
)
insert into product_suppliers (product_id, supplier_id, priority, unit_cost, tax_rate, cost_updated_at, cost_source)
select l.product_id, s.id, 1, round(l.precio_con_iva / 1.19, 6), 19, now(), 'manual'
from lista l join suppliers s on s.name = l.proveedor
on conflict (product_id, supplier_id) do update set
  priority = 1, unit_cost = excluded.unit_cost, tax_rate = excluded.tax_rate,
  cost_updated_at = excluded.cost_updated_at, cost_source = excluded.cost_source;

-- Precios de venta al 35% sobre el costo con IVA, redondeo a la decena hacia
-- arriba (regla de category_margins.__default__).
--
-- La lasaña es el caso caro: a $3.000 con costo $2.390 dejaba 20,3%. Los otros
-- cuatro estaban al revés, muy por encima del precio que corresponde al costo.
update products set sale_price = 1990, price_reviewed_at = now() where barcode = '7803600981532'; -- 3.000 -> 1.990
update products set sale_price = 3680, price_reviewed_at = now() where barcode = '7802575007261'; -- 3.000 -> 3.680
update products set sale_price =  850, price_reviewed_at = now() where barcode = '7802900332419'; -- 1.200 -> 850
update products set sale_price = 1220, price_reviewed_at = now() where barcode = '7802575006035'; -- 1.400 -> 1.220
update products set sale_price = 1040, price_reviewed_at = now() where barcode = '7809559200717'; -- 1.300 -> 1.040

-- El spaghetti no venía en la lista de precios a corregir, pero cuesta lo mismo
-- que las corbatas y estaba $200 más barato: mismo costo con dos precios es la
-- incoherencia que se está limpiando, y a $1.200 quedaba en 34,2%, bajo la regla.
update products set sale_price = 1220, price_reviewed_at = now() where barcode = '7802575004437'; -- 1.200 -> 1.220

commit;
