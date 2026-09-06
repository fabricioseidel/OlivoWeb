-- Verificación de correo al crear una cuenta, e interruptor del envío flash.
--
-- Ya aplicada en producción el 2026-09-06; el archivo queda para que una base
-- nueva llegue al mismo esquema. Es idempotente.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS verification_token   text,
  ADD COLUMN IF NOT EXISTS verification_sent_at timestamptz;

-- Las cuentas que ya existían quedan verificadas. Exigirles confirmar de golpe
-- las dejaría fuera sin aviso, y el requisito es para las cuentas nuevas.
UPDATE public.users
   SET email_verified_at = COALESCE(created_at, now())
 WHERE email_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS users_verification_token_idx
  ON public.users (verification_token)
  WHERE verification_token IS NOT NULL;

COMMENT ON COLUMN public.users.email_verified_at IS
  'Cuándo confirmó su correo. NULL = registrada y sin confirmar: no puede iniciar sesión.';

-- El interruptor arranca apagado a propósito: ofrecer un envío que después no
-- se puede despachar es peor que no ofrecerlo.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS flash_delivery_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.settings.flash_delivery_enabled IS
  'Si el envío flash se ofrece en el checkout. Apagado, la opción no aparece aunque Uber cotice.';
