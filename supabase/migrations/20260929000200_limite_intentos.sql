-- =====================================================================
-- 20260929000200_limite_intentos.sql
--
-- Límite de intentos compartido entre todas las instancias.
--
-- src/lib/rate-limit.ts cuenta en memoria: en Vercel cada instancia tiene la
-- suya, así que el límite real era "N por instancia" y un atacante lo evitaba
-- sólo con repartir las peticiones. El login ni siquiera tenía límite: se
-- podían probar contraseñas sin freno.
--
-- Una tabla chica con una fila por clave ("login:email:x", "login:ip:y") y
-- una función que suma y responde en una sola sentencia, sin carreras.
-- Sólo la usa el servidor (service_role).
--
-- Aditiva e idempotente.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.limite_intentos (
  clave       text PRIMARY KEY,
  cuenta      integer NOT NULL DEFAULT 0,
  reinicia_en timestamptz NOT NULL
);

COMMENT ON TABLE public.limite_intentos IS
  'Contadores de intentos por clave y ventana (login, registro, recuperación). La escribe limite_intentos().';

ALTER TABLE public.limite_intentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.limite_intentos FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'limite_intentos'
       AND policyname = 'limite_intentos_all_service'
  ) THEN
    CREATE POLICY "limite_intentos_all_service" ON public.limite_intentos
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- p_sumar = false: sólo consulta (¿está bloqueado?), sin contar un intento.
-- Devuelve si se permite y, si no, cuántos segundos faltan.
CREATE OR REPLACE FUNCTION public.limite_intentos(
  p_clave       text,
  p_limite      integer,
  p_ventana_seg integer,
  p_sumar       boolean DEFAULT true
) RETURNS TABLE (permitido boolean, reintentar_seg integer)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cuenta integer;
  v_reinicia timestamptz;
BEGIN
  IF p_sumar THEN
    INSERT INTO public.limite_intentos AS l (clave, cuenta, reinicia_en)
    VALUES (p_clave, 1, now() + make_interval(secs => p_ventana_seg))
    ON CONFLICT (clave) DO UPDATE
       SET cuenta = CASE WHEN l.reinicia_en < now() THEN 1 ELSE l.cuenta + 1 END,
           reinicia_en = CASE WHEN l.reinicia_en < now()
                              THEN now() + make_interval(secs => p_ventana_seg)
                              ELSE l.reinicia_en END
    RETURNING cuenta, reinicia_en INTO v_cuenta, v_reinicia;
  ELSE
    SELECT cuenta, reinicia_en INTO v_cuenta, v_reinicia
      FROM public.limite_intentos WHERE clave = p_clave;
    IF v_reinicia IS NULL OR v_reinicia < now() THEN
      v_cuenta := 0;
    END IF;
  END IF;

  -- Limpieza ocasional para que la tabla no crezca sin fin.
  IF random() < 0.01 THEN
    DELETE FROM public.limite_intentos WHERE reinicia_en < now() - interval '1 day';
  END IF;

  IF (p_sumar AND v_cuenta > p_limite) OR (NOT p_sumar AND v_cuenta >= p_limite) THEN
    RETURN QUERY SELECT false, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reinicia - now())))::integer);
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.limite_intentos(text, integer, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.limite_intentos(text, integer, integer, boolean) TO service_role;
