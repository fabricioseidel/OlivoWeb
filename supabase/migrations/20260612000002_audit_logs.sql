-- Auditoría de operaciones sensibles (hallazgo #15 de la auditoría de seguridad).
-- Solo escribe el servidor (service-role); los clientes no pueden leer ni escribir.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,            -- ej: ORDER_PAID, ORDER_STATUS_CHANGED, ADMIN_BOOTSTRAP, SALE_UPDATED
  entity TEXT NOT NULL,            -- ej: orders, sales, users
  entity_id TEXT,
  actor TEXT,                      -- email/id del usuario o 'system'/'webhook'
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Sin políticas para anon/authenticated: con RLS habilitado, todo acceso de
-- clientes queda denegado. El service-role bypassa RLS.
