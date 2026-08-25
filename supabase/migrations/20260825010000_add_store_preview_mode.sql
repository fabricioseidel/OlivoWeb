-- Modo vitrina: la tienda se puede mirar completa pero todavía no vende.
--
-- Sirve para publicar el sitio antes de estar listo para recibir pedidos: el
-- catálogo, las fichas y las landings quedan visibles e indexables, y las
-- rutas que cobran responden 503 con el mensaje configurado.
--
-- El valor por defecto es TRUE a propósito. Al aplicar esta migración la
-- tienda queda en vitrina, que es el estado seguro: se abre cuando alguien
-- decide abrirla desde Configuración → Políticas, no por el hecho de haber
-- desplegado. Al revés —abierta por defecto— un despliegue podría empezar a
-- cobrar pedidos que nadie está preparando.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS preview_mode    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS preview_message text;

COMMENT ON COLUMN public.settings.preview_mode    IS 'true = la tienda se ve pero no acepta pedidos ni pagos. Se cambia desde Configuración → Políticas.';
COMMENT ON COLUMN public.settings.preview_message IS 'Aviso que ve el cliente mientras la tienda está en vitrina. Si está vacío se usa el texto por defecto del código.';
