-- =====================================================================
-- 20260929000300_canjear_puntos_atomico.sql
--
-- redeemPoints leía el saldo, comprobaba que alcanzara y después insertaba
-- el movimiento: dos canjes a la vez (dos pestañas, un doble clic en el
-- checkout) veían el mismo saldo y gastaban los mismos puntos dos veces.
--
-- Esta función hace las tres cosas bajo un candado por cliente, en una sola
-- transacción. Sólo la llama el servidor.
--
-- Aditiva e idempotente.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.canjear_puntos(
  p_email       text,
  p_puntos      integer,
  p_descripcion text
) RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_saldo integer;
BEGIN
  IF p_puntos IS NULL OR p_puntos <= 0 THEN
    RAISE EXCEPTION 'Cantidad de puntos inválida' USING ERRCODE = 'check_violation';
  END IF;

  -- Un canje por cliente a la vez; los de otros clientes no esperan.
  PERFORM pg_advisory_xact_lock(hashtext('canje-puntos:' || v_email));

  SELECT COALESCE(SUM(points), 0)::integer INTO v_saldo
    FROM public.loyalty_transactions
   WHERE lower(customer_email) = v_email;

  IF p_puntos > v_saldo THEN
    RAISE EXCEPTION 'Puntos insuficientes' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.loyalty_transactions
    (customer_id, customer_email, type, points, balance_after, description, reference_type, reference_id)
  VALUES
    (v_email, v_email, 'redeem', -p_puntos, v_saldo - p_puntos, p_descripcion, 'redemption', NULL);

  UPDATE public.customers SET loyalty_points = v_saldo - p_puntos WHERE lower(email) = v_email;

  RETURN v_saldo - p_puntos;
END;
$$;

REVOKE ALL ON FUNCTION public.canjear_puntos(text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.canjear_puntos(text, integer, text) TO service_role;
