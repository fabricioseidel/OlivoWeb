-- Pedido Central Mayorista (detalle entregado 2026-09-04).
-- Los precios de la lista vienen CON IVA y por UNIDAD de venta del proveedor.
-- Doctrina del proyecto: product_suppliers.unit_cost se guarda NETO y POR UNIDAD
-- (precio_con_iva / 1.19 / unidades_por_bulto). El trigger
-- product_suppliers_sync_purchase_price propaga a products.purchase_price.

with proveedor as (
  select id from suppliers where name = 'Central Mayorista'
),
lista(product_id, precio_con_iva, unidades) as (
  values
    ('7802810006332'::text,  240::numeric,  1::numeric),  -- Jugo Watts Durazno 200 Ml
    ('400050659638',         810,           1),           -- Atún Lomitos en Agua 160 Gr Smart Price
    ('7802200893498',       1300,           1),           -- Orly trufa 95g (Ambrosoli)
    ('7802800535569',      15890,          24),           -- Papas Kryspo Original 37g (display 24 tarros)
    ('7622201693152',        650,           1),           -- Galleta Oreo Chocolate 108 Gr
    ('7622201693091',        650,           1),           -- Galleta Oreo Original 108 Gr
    ('7622201693138',        650,           1),           -- Galleta Oreo Vainilla 108 Gr
    ('900000000062',        1690,           9),           -- Hallulla unidad (paquete ATM 9u Club House)
    ('7802810006592',        240,           1),           -- Jugo Watts Manzana 200 Ml
    ('7802900028473',       2460,           6),           -- Leche chocolate 200 Ml Soprole (pack x6)
    ('7804617470286',      11760,          12),           -- Leche Entera 1L Surlat (caja x12)
    ('7802900056025',       2460,           6),           -- Leche Frutilla 200 Ml Soprole (pack x6)
    ('7801305004082',       1000,           1),           -- Lentejas Listas Wasil 380 Gr
    ('7802900120016',       1190,           1),           -- Mantequilla con sal Soprole 125g
    ('7802900121013',       2350,           1),           -- Mantequilla con sal Soprole 250g
    ('7802900600006',        510,           1),           -- Margarina 125 Gr Soprole
    ('900000000061',        1690,           8),           -- Marraqueta unidad (paquete ATM 8u Club House)
    ('7891150099920',       2190,           1),           -- Mascarilla Luminoso UV 300 Gr Sedal
    ('7805000301484',        750,           1),           -- Mayonesa Sachet 93 Gr Hellmann's
    ('7802810006752',        240,           1),           -- Jugo Watts Naranja 200 Ml
    ('7801907004305',        520,           1),           -- Paté ternera San Jorge 125 Gr
    ('7801305004099',       1000,           1),           -- Porotos Negros Listos Wasil 380 Gr
    ('900000000042',         550,           1)            -- Yogurt 1+1 Zucaritas 140 Gr Soprole
)
insert into product_suppliers (
  product_id, supplier_id, priority, unit_cost, pack_size,
  tax_rate, cost_updated_at, cost_source
)
select
  l.product_id,
  pr.id,
  1,
  round(l.precio_con_iva / 1.19 / l.unidades, 6),
  case when l.unidades > 1 then l.unidades::int else null end,
  19,
  now(),
  'pedido'
from lista l cross join proveedor pr
on conflict (product_id, supplier_id) do update set
  priority        = 1,
  unit_cost       = excluded.unit_cost,
  pack_size       = excluded.pack_size,
  tax_rate        = excluded.tax_rate,
  cost_updated_at = excluded.cost_updated_at,
  cost_source     = excluded.cost_source;

-- Desempate de proveedor preferido: donde Central Mayorista quedó más barato y
-- había otro vínculo también en prioridad 1, el otro baja a 2. Con dos vínculos
-- en la misma prioridad, cuál define el costo dependía del orden de lectura.
update product_suppliers ps
set priority = 2
where ps.product_id in ('7802810006752','7802900120016','7802900121013')
  and ps.supplier_id <> (select id from suppliers where name = 'Central Mayorista')
  and ps.priority = 1;

-- Productos del pedido que NO existían en el catálogo. Los marcados [CREADO] se
-- dieron de alta en 34_productos_nuevos_central_mayorista_2026-09-04.sql.
--   VASO PLASTICO TRANSPAR 50UNX300CC CHEAP      $1.420
--   BOLSA CHOKITA 20UN NESTLE                    $6.390  [CREADO]
--   CARNE MOLIDA VACUNO 1KG KARMAC               $5.690
--   CHORIZO PARRILLERO 400 GRAMOS                $3.190  [CREADO]
--   CROCANTE SP 100GR                              $550
--   HAMBURGUESA SUPER BEEF 100GR                   $660
--   JARABE GRANADINA 900CC MITJANS                $5.270  [CREADO]
--   JUGO PIÑA 200ML WATTS                          $240  [CREADO]
--   LONGANICILLA DE CAMPO 280GR LA CRIANZA        $2.220  [CREADO]
--   NUGGETS DE POLLO IN OUT SP 275 GRS             $950
--   PAN BLANCO XL 770GR CASTAÑO                   $2.390  (el catálogo tiene Ideal 750 gr, otro producto)
--   POSTRE MANJARATE 80GR SOPROLE                  $570
--   QUESO CREMA NATURAL 100GR COLUN                $600  (el catálogo tiene Soprole, otra marca)  [CREADO]
--   SALCHICHA TRAD CERDO 250GR SAN JORGE           $820  [CREADO]
--   DISPLAY BARRA CHOCOLATE 21,5GR SNICKERS     $11.690  (existe "Snickers 21.5 Gr" pero falta saber
--                                                         cuántas unidades trae el display)
