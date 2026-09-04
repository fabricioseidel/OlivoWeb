-- Productos nuevos del pedido de Central Mayorista (04-09-2026) y ajuste de los
-- precios que quedaron bajo margen con los costos nuevos.
--
-- Precio de venta = costo_con_iva / 0.65, redondeado a la decena hacia arriba:
-- es la regla de `category_margins.__default__` (35% de margen, redondeo
-- "decena"), la misma que aplica el taller de precios.
--
-- Los códigos 9000000001xx son internos: el producto no trae EAN utilizable o
-- se vende en un formato propio del local (el pack de marraqueta).

begin;

insert into products (barcode, name, category, sale_price, stock, is_active, description) values
  ('900000000114', 'Marraqueta Pre-horneada 8 un Club House', 'Panadería',            2400, 0, true,
   'Paquete de 8 marraquetas pre-horneadas en atmósfera controlada. Se terminan en el horno de casa.'),
  ('900000000115', 'Chokita Chocolate Nestlé',                'Chocolates',            500, 0, true,
   'Barra de chocolate con galleta crocante. Se vende por unidad.'),
  ('900000000116', 'Jugo Watts Piña 200 Ml',                  'Bebidas, Jugos',        500, 0, true,
   'Jugo de piña en caja individual de 200 ml. Se vende por unidad.'),
  ('900000000117', 'Salchicha Tradicional Cerdo 250 Gr San Jorge', 'Cecinas',          1270, 0, true,
   'Salchichas tradicionales de cerdo, bandeja de 250 gr.'),
  ('900000000118', 'Queso Crema Natural 100 Gr Colun',        'Lácteos, Quesos',       930, 0, true,
   'Queso crema natural Colun en formato de 100 gr.'),
  ('900000000119', 'Longanicilla de Campo 280 Gr La Crianza', 'Cecinas',              3420, 0, true,
   'Longanicillas de campo ahumadas, bandeja de 280 gr.'),
  ('900000000120', 'Jarabe Granadina 900 Cc Mitjans',         'Abarrotes',            8110, 0, true,
   'Jarabe de granadina Mitjans, botella de 900 cc. Para preparar bebidas y cócteles.'),
  ('900000000121', 'Chorizo Parrillero 400 Gr',               'Cecinas',              4910, 0, true,
   'Chorizos parrilleros, bandeja de 400 gr.');

-- Costo de Central Mayorista para los productos recién creados. Mismo criterio
-- que el resto del pedido: unit_cost NETO y POR UNIDAD de venta.
with proveedor as (
  select id from suppliers where name = 'Central Mayorista'
),
lista(product_id, precio_con_iva, unidades) as (
  values
    ('900000000114'::text, 1690::numeric,  1::numeric),  -- el paquete de 8 se compra y se vende entero
    ('900000000115',       5500,          20),           -- bolsa de 20 en promo, lista $6.390
    ('900000000116',        240,           1),
    ('900000000117',        820,           1),
    ('900000000118',        600,           1),
    ('900000000119',       2220,           1),
    ('900000000120',       5270,           1),
    ('900000000121',       3190,           1)
)
insert into product_suppliers (
  product_id, supplier_id, priority, unit_cost, pack_size,
  tax_rate, cost_updated_at, cost_source
)
select
  l.product_id, pr.id, 1,
  round(l.precio_con_iva / 1.19 / l.unidades, 6),
  case when l.unidades > 1 then l.unidades::int else null end,
  19, now(), 'pedido'
from lista l cross join proveedor pr;

-- Precios que el costo nuevo dejó bajo el margen de la categoría.
-- Mayonesa sachet: el costo subió de $575 a $750 con IVA y el precio no se
-- había movido, así que dejaba 16,7%. Paté ternera estaba en $0.
update products set sale_price = 1160, price_reviewed_at = now() where barcode = '7805000301484';
update products set sale_price =  640, price_reviewed_at = now() where barcode = '7802900028473';
update products set sale_price =  800, price_reviewed_at = now() where barcode = '7801907004305';

commit;

-- Siguen sin crearse (no se pidieron): vaso plástico 50un, carne molida Karmac
-- 1kg, crocante SP 100gr, hamburguesa Super Beef 100gr, nuggets In Out SP 275gr,
-- pan blanco XL 770gr Castaño, postre Manjarate 80gr y el display de Snickers
-- (falta saber cuántas unidades trae la caja).
--
-- Los ocho productos nuevos quedan con stock 0 y sin foto: no aparecen en la
-- tienda pública hasta que se les cargue imagen (isProductVisible exige foto,
-- categoría, precio y costo), pero ya se pueden vender en el POS.

-- Costos de promoción: la lista del proveedor muestra el precio completo, pero
-- el Orly trufa y la bolsa de chokitas se compraron en oferta. Se guarda lo que
-- efectivamente se pagó (es el costo con el que hay que medir el margen) y el
-- precio de lista queda en product_suppliers.notes, para que la próxima compra
-- a precio normal no parezca un alza inexplicada.
update product_suppliers
set notes = 'Comprado en promoción a $950 con IVA (lista: $1.300)'
where product_id = '7802200893498'
  and supplier_id = (select id from suppliers where name = 'Central Mayorista');

update product_suppliers
set notes = 'Comprado en promoción a $5.500 la bolsa de 20 con IVA (lista: $6.390)'
where product_id = '900000000115'
  and supplier_id = (select id from suppliers where name = 'Central Mayorista');
