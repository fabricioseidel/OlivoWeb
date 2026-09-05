-- Unificación de los Kit Kat duplicados y corrección de categoría del cono.

begin;

-- 1. El código 5897400248768 es un escaneo malo del 7891000248768: mismo sufijo
-- y mismo gramaje. El stock se suma sucursal por sucursal antes de borrar la
-- fila del duplicado.
update branch_stock bs set stock = bs.stock + d.stock, updated_at = now()
from branch_stock d
where d.branch_id = bs.branch_id and d.stock > 0
  and d.product_barcode = '5897400248768' and bs.product_barcode = '7891000248768';

delete from branch_stock where product_barcode = '5897400248768';

update products set stock = 52, updated_at = now() where barcode = '7891000248768'; -- 42 + 10

-- El duplicado tenía un dato que el superviviente no: que también se consigue en
-- Central Mayorista. Se traslada como segunda opción en vez de perderse; el
-- costo cargado es el de Comech, así que ése sigue mandando.
insert into product_suppliers (product_id, supplier_id, priority, notes)
select '7891000248768', ps.supplier_id, 2,
       'Alternativa registrada al unificar el duplicado 5897400248768. Falta el costo.'
from product_suppliers ps where ps.product_id = '5897400248768'
on conflict (product_id, supplier_id) do nothing;

delete from product_suppliers where product_id = '5897400248768';

update products set name = 'Chocolate kitkat 41,5 g [duplicado, unificado 05/09/2026]',
       stock = 0, is_active = false, updated_at = now()
where barcode = '5897400248768';

-- 2. El cono estaba en "Chocolates, Helados". Es un helado.
update products set category = 'Helados', updated_at = now() where barcode = '8445291971356';

commit;

-- NO se tocó "Kitkat" (7891000248775): su código es válido y distinto del
-- 7891000248768, no un escaneo malo, y tiene una venta registrada. Si resulta
-- ser el mismo producto hay que unificarlo aparte, con ese dato a la vista.
