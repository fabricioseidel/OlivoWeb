-- Tokens de recuperación de contraseña.
--
-- Se guarda el HASH del token, nunca el token en claro: si alguien llegara a
-- leer la tabla no podría usar los enlaces pendientes, igual que con las
-- contraseñas.

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON public.password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
  ON public.password_reset_tokens (expires_at);

-- Solo el service role (las rutas de API del servidor) toca esta tabla.
-- Sin políticas, RLS bloquea a anon y authenticated por completo.
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.password_reset_tokens FROM anon, authenticated;

COMMENT ON TABLE public.password_reset_tokens IS
  'Tokens de recuperación de contraseña. Se almacena el hash SHA-256, no el token.';
