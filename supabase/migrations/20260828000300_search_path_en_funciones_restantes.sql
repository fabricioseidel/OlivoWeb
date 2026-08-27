-- =====================================================================
-- 20260828000300_search_path_en_funciones_restantes.sql
--
-- Termina lo que empezó `20260827013538`, que fijó `search_path` en tres
-- funciones del motor de reposición. Quedaban 23 sin él, y el linter de
-- Supabase las reporta una por una como `function_search_path_mutable`.
--
-- POR QUÉ IMPORTA
--
-- Sin `search_path` fijo, una función resuelve los nombres no calificados
-- usando el path de quien la llama. Quien pueda crear objetos en un esquema
-- que aparezca antes que `public` puede poner ahí una tabla o función con el
-- nombre que la función usa, y la llamada se va a la suya.
--
-- En las siete **SECURITY DEFINER** eso es grave, porque corren con los
-- privilegios del dueño de la función y no con los de quien llama:
-- `apply_sale_v2`, `decrement_product_stock`, `decrement_stock_atomic`,
-- `get_seller_name_from_user`, `increment_product_stock`,
-- `list_sales_missing_items` y `login_user` — esta última es la que valida
-- contraseñas.
--
-- EL CASO QUE HAY QUE MIRAR ANTES DE APLICAR
--
-- `login_user` llama a `crypt(...)` **sin calificar**, y `crypt` no vive en
-- `public` sino en `extensions` (es de pgcrypto). Fijarle
-- `search_path = public, pg_temp` —lo que hace el resto— la dejaría sin poder
-- resolver `crypt` y **nadie podría iniciar sesión**. Por eso a esa se le pasa
-- `extensions` en el path.
--
-- Se comprobó una por una cuáles referencian otros esquemas o pgcrypto: sólo
-- `login_user`. `extensions` es un esquema del propio Supabase, no uno donde
-- un tercero pueda crear objetos, así que incluirlo no debilita la protección.
--
-- `ALTER FUNCTION ... SET search_path` no toca el cuerpo: son las mismas
-- funciones, con el path fijado.
-- =====================================================================

DO $$
DECLARE
  f record;
  v_path text;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       -- Sólo las que no lo tienen: la migración es idempotente y no pisa
       -- un path distinto que alguien haya fijado a propósito.
       AND NOT EXISTS (
         SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c
          WHERE c LIKE 'search_path=%'
       )
  LOOP
    v_path := CASE
      -- pgcrypto vive en `extensions`; sin él, login_user no resuelve crypt().
      WHEN f.proname = 'login_user' THEN 'public, extensions, pg_temp'
      ELSE 'public, pg_temp'
    END;

    EXECUTE format('ALTER FUNCTION %s SET search_path = %s', f.sig, v_path);
  END LOOP;
END $$;

-- Comprobación: si quedara alguna sin path, la migración avisa en vez de
-- dar por hecho que funcionó.
DO $$
DECLARE
  v_faltan integer;
BEGIN
  SELECT count(*) INTO v_faltan
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prokind = 'f'
     AND NOT EXISTS (
       SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c
        WHERE c LIKE 'search_path=%');

  IF v_faltan > 0 THEN
    RAISE WARNING 'Quedan % funciones en public sin search_path fijo.', v_faltan;
  END IF;
END $$;
