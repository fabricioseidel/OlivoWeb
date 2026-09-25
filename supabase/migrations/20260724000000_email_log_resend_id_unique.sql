-- Índice único sobre resend_id para que el webhook de Resend pueda hacer
-- upserts idempotentes (los NULL siguen permitiendo múltiples filas, así que
-- los envíos fallidos sin ID de Resend no se ven afectados).
--
-- Nota: si existieran filas duplicadas por resend_id (bug del webhook previo a
-- este fix), hay que deduplicarlas antes de que este índice se pueda crear.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_log_resend_id_unique
  ON public.email_log (resend_id);
