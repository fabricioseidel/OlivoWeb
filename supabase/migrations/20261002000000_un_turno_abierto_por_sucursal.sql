-- Un solo turno de caja OPEN por sucursal.
--
-- El POS abría un turno con branch_id NULL cuando el selector de sucursal
-- todavía no había cargado (primer login en un teléfono); al recargar no lo
-- veía y abría otro en "Principal". Dos turnos abiertos reparten las ventas y
-- ninguno cuadra. El POS ya no manda sucursal nula (resolveBranchId), pero la
-- guarda tiene que estar en la base: dos teléfonos, o dos toques, pueden abrir
-- a la vez.
--
-- Los turnos sin sucursal (branch_id NULL, por ejemplo los de /admin/pos en
-- OlivoWeb) cuentan como una "sucursal" más, para que tampoco se dupliquen.
--
-- Efecto en OlivoWeb: una segunda apertura en la misma sucursal falla con
-- 23505 (unique_violation). Es lo correcto; conviene mostrar "Ya hay una caja
-- abierta en esta sucursal" en vez del error crudo. El POS ya lo maneja
-- (devuelve el turno abierto). El cron auto-close-shifts no se ve afectado.
--
-- ANTES DE APLICAR: esta consulta tiene que devolver 0 filas.
--   SELECT COALESCE(branch_id::text,'(sin sucursal)') AS sucursal, count(*), array_agg(id)
--     FROM public.cash_shifts WHERE status = 'OPEN' GROUP BY 1 HAVING count(*) > 1;
-- Si devuelve filas, hay que cerrar o declarar los turnos sobrantes, o
-- asignarles su sucursal, antes de aplicar. Para los huérfanos del POS:
--   SELECT id, started_at, starting_cash,
--          (SELECT count(*) FROM public.sales s WHERE s.shift_id = c.id) AS ventas
--     FROM public.cash_shifts c WHERE status = 'OPEN' AND branch_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cash_shifts WHERE status = 'OPEN'
     GROUP BY COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Hay sucursales con más de un turno abierto: resuélvelo antes (ver consulta en el encabezado)';
  END IF;
END $$;

-- cash_shifts es una tabla chica: el bloqueo dura milisegundos.
CREATE UNIQUE INDEX IF NOT EXISTS cash_shifts_un_turno_abierto_por_sucursal
  ON public.cash_shifts ((COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  WHERE status = 'OPEN';

COMMENT ON INDEX public.cash_shifts_un_turno_abierto_por_sucursal IS
  'Un solo turno OPEN por sucursal (los de branch_id NULL cuentan como una sucursal más).';
