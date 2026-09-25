-- =====================================================================
-- 20260828000200_suppliers_rut.sql
--
-- `suppliers` no tenía dónde guardar el RUT. Las cuatro facturas que se
-- procesaron el 27/08 lo traen impreso —es el dato que identifica sin
-- ambigüedad a quien emite— y no había columna, así que casar una factura con
-- su proveedor quedaba en reconocer el nombre a ojo.
--
-- El caso concreto: el proveedor está cargado como "Jean Tequeños" y su
-- factura dice "TEQUEÑITOS CHILE SPA". El costo idéntico ($3.530) dice que son
-- el mismo, pero el sistema no lo puede confirmar. Con el RUT, sí.
--
-- Sin formato forzado ni validación de dígito verificador: el objetivo es
-- poder anotarlo y buscar por él. Un CHECK estricto rechazaría un RUT
-- extranjero o una factura mal impresa justo cuando hay que registrarla.
-- Lo único que se impone es que no haya dos proveedores con el mismo, que es
-- el error que sí importa: dos fichas para el mismo emisor.
-- =====================================================================

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS rut text;

COMMENT ON COLUMN public.suppliers.rut IS
  'RUT del proveedor tal como figura en su factura (ej. 77.198.288-3). Sirve para casar una factura con su proveedor cuando el nombre de fantasia no coincide con la razon social.';

-- Único, pero sólo entre los que lo tienen cargado: los proveedores sin RUT
-- —los informales, que entregan con nota simple— no deben chocar entre sí.
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_rut_unico
  ON public.suppliers (rut)
  WHERE rut IS NOT NULL AND btrim(rut) <> '';

-- Los RUT que aparecen en las facturas procesadas el 27/08/2026. Se cargan
-- por nombre porque es la unica llave que hay hoy; el WHERE evita pisar un
-- valor si alguien ya lo cargo a mano.
UPDATE public.suppliers SET rut = '77.198.288-3'
 WHERE name = 'Dulce Pan' AND (rut IS NULL OR btrim(rut) = '');

UPDATE public.suppliers SET rut = '78.306.534-7'
 WHERE name = 'Jean Tequeños' AND (rut IS NULL OR btrim(rut) = '');

UPDATE public.suppliers SET rut = '90.703.000-8'
 WHERE name = 'Nestlé Chile S.A. (Savory)' AND (rut IS NULL OR btrim(rut) = '');
