-- =====================================================================
-- 20260925000000_gestion_documental.sql
--
-- Gestión documental: facturas, boletas, libro mensual e impuestos.
--
-- Hasta hoy la única huella tributaria en la base eran `invoice_url` en
-- `supplier_orders` (una foto, sin folio ni montos) y el total de cada venta.
-- Con eso no se puede responder lo que el dueño necesita saber cada mes:
-- cuánto IVA se va a pagar el 20, cuánto hay que separar para Previred el 13,
-- y si alguna factura de proveedor quedó sin revisar o se cargó dos veces.
--
-- Cinco tablas:
--
--   tax_documents    documentos emitidos y recibidos, con folio y montos
--   tax_periods      un mes tributario: tasa de PPM, remanente y cierre
--   tax_obligations  pagos del calendario (F29, Previred, patente, renta)
--   employees        trabajadores, para estimar las imposiciones
--   tax_settings     una sola fila con las tasas que cambian por ley
--
-- Todas con RLS y acceso sólo por service_role: el login del sitio es
-- NextAuth, no Supabase Auth, así que una política para `authenticated` no
-- protegería nada. Las rutas /api/admin/documentos exigen rol ADMIN.
--
-- Los archivos (PDF, fotos, XML) van a un bucket PRIVADO nuevo. El bucket
-- `uploads` es público y ahí están hoy las facturas de los pedidos a
-- proveedores: cualquiera con la URL las ve.
--
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Configuración tributaria (fila única)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tax_settings (
  id                  boolean PRIMARY KEY DEFAULT true CHECK (id),
  -- PPM Pro Pyme general: 0,125% transitorio (Ley 21.755) hasta dic-2027.
  tasa_ppm            numeric(6,3) NOT NULL DEFAULT 0.125 CHECK (tasa_ppm >= 0 AND tasa_ppm <= 100),
  -- Tasas previsionales que no sean las por defecto (ver src/lib/documentos/imposiciones.ts).
  tasas_previsionales jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tax_settings IS
  'Una sola fila con las tasas tributarias y previsionales editables. No va en settings porque esa tabla se lee con la clave anónima.';

INSERT INTO public.tax_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) Documentos tributarios
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tax_documents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direccion             text NOT NULL CHECK (direccion IN ('emitido', 'recibido')),
  -- Código SII del documento (33 factura, 39 boleta, 61 nota de crédito…);
  -- BHE = boleta de honorarios electrónica.
  tipo                  text NOT NULL CHECK (tipo IN ('33','34','39','41','46','48','52','56','61','BHE')),
  folio                 bigint CHECK (folio IS NULL OR folio > 0),
  fecha                 date NOT NULL,
  -- Mes en que se declara. Suele ser el de `fecha`, pero una factura
  -- recibida tarde puede usarse como crédito en los dos meses siguientes.
  periodo               text NOT NULL CHECK (periodo ~ '^\d{4}-(0[1-9]|1[0-2])$'),

  -- Proveedor en los recibidos, cliente en los emitidos. RUT sin puntos y con
  -- guión (12345678-9): así se compara.
  contraparte_rut       text,
  contraparte_nombre    text,
  contraparte_giro      text,
  contraparte_direccion text,
  contraparte_email     text,

  -- Pesos enteros.
  neto                  bigint NOT NULL DEFAULT 0,
  exento                bigint NOT NULL DEFAULT 0,
  iva                   bigint NOT NULL DEFAULT 0,
  otros_impuestos       bigint NOT NULL DEFAULT 0,
  retencion             bigint NOT NULL DEFAULT 0,
  total                 bigint NOT NULL DEFAULT 0,

  estado                text NOT NULL,
  estado_pago           text NOT NULL DEFAULT 'pendiente'
                        CHECK (estado_pago IN ('pendiente', 'pagado', 'no_aplica')),
  vence_pago            date,
  pagado_el             date,

  supplier_id           uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_order_id     uuid REFERENCES public.supplier_orders(id) ON DELETE SET NULL,
  -- Documento que corrige una nota de crédito o débito.
  referencia_id         uuid REFERENCES public.tax_documents(id) ON DELETE SET NULL,

  -- Detalle de lo que se emite: [{descripcion, cantidad, precio, exento}].
  items                 jsonb,
  origen                text NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'rcv', 'proveedor_dte')),
  proveedor_dte         text,
  proveedor_track_id    text,

  archivo_path          text,
  archivo_nombre        text,
  notas                 text,
  creado_por            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tax_documents_estado_segun_direccion CHECK (
    (direccion = 'emitido'  AND estado IN ('borrador', 'emitido', 'anulado', 'error')) OR
    (direccion = 'recibido' AND estado IN ('pendiente', 'aceptado', 'reclamado'))
  ),
  -- Un documento emitido sin folio no existe para el SII: no se deja marcar así.
  CONSTRAINT tax_documents_emitido_con_folio CHECK (estado <> 'emitido' OR folio IS NOT NULL)
);

COMMENT ON TABLE public.tax_documents IS
  'Documentos tributarios emitidos y recibidos (facturas, boletas, notas, honorarios). Fuente del libro mensual y del F29 estimado.';
COMMENT ON COLUMN public.tax_documents.periodo IS
  'Mes tributario YYYY-MM en que se declara el documento.';
COMMENT ON COLUMN public.tax_documents.estado IS
  'Emitidos: borrador (sin folio), emitido, anulado, error. Recibidos: pendiente (sin revisar), aceptado, reclamado (no da crédito).';

-- El mismo documento no puede entrar dos veces. En los emitidos el emisor es
-- siempre la empresa: basta tipo + folio. En los recibidos, el folio se repite
-- entre proveedores y hay que incluir el RUT de quien lo emitió.
CREATE UNIQUE INDEX IF NOT EXISTS tax_documents_emitido_unico
  ON public.tax_documents (tipo, folio)
  WHERE direccion = 'emitido' AND folio IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tax_documents_recibido_unico
  ON public.tax_documents (tipo, contraparte_rut, folio)
  WHERE direccion = 'recibido' AND folio IS NOT NULL AND contraparte_rut IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tax_documents_periodo ON public.tax_documents (periodo, direccion);
CREATE INDEX IF NOT EXISTS idx_tax_documents_supplier ON public.tax_documents (supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tax_documents_supplier_order ON public.tax_documents (supplier_order_id) WHERE supplier_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tax_documents_referencia ON public.tax_documents (referencia_id) WHERE referencia_id IS NOT NULL;

DROP TRIGGER IF EXISTS tax_documents_set_updated_at ON public.tax_documents;
CREATE TRIGGER tax_documents_set_updated_at
  BEFORE UPDATE ON public.tax_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3) Períodos tributarios
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tax_periods (
  periodo                  text PRIMARY KEY CHECK (periodo ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- NULL = usa la de tax_settings.
  tasa_ppm                 numeric(6,3) CHECK (tasa_ppm IS NULL OR (tasa_ppm >= 0 AND tasa_ppm <= 100)),
  -- NULL = se arrastra el del mes anterior cerrado.
  remanente_anterior       bigint CHECK (remanente_anterior IS NULL OR remanente_anterior >= 0),
  -- Impuesto único retenido a trabajadores (sueldos sobre 13,5 UTM).
  retencion_impuesto_unico bigint NOT NULL DEFAULT 0 CHECK (retencion_impuesto_unico >= 0),
  -- Foto del cálculo al cerrar: lo que se declaró.
  resumen                  jsonb,
  cerrado_at               timestamptz,
  cerrado_por              text,
  notas                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tax_periods IS
  'Un mes tributario. Al cerrarlo (ya declarado el F29) sus documentos quedan congelados.';

DROP TRIGGER IF EXISTS tax_periods_set_updated_at ON public.tax_periods;
CREATE TRIGGER tax_periods_set_updated_at
  BEFORE UPDATE ON public.tax_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Un mes ya declarado no se toca: cambiar un monto de un documento de un F29
-- presentado deja el libro diciendo algo distinto de lo que recibió el SII.
-- El estado de PAGO sí se puede actualizar (la factura se paga después).
CREATE OR REPLACE FUNCTION public.tax_documents_periodo_cerrado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_periodo text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.direccion, NEW.tipo, NEW.folio, NEW.fecha, NEW.periodo, NEW.contraparte_rut,
        NEW.neto, NEW.exento, NEW.iva, NEW.otros_impuestos, NEW.retencion, NEW.total, NEW.estado)
       IS NOT DISTINCT FROM
       (OLD.direccion, OLD.tipo, OLD.folio, OLD.fecha, OLD.periodo, OLD.contraparte_rut,
        OLD.neto, OLD.exento, OLD.iva, OLD.otros_impuestos, OLD.retencion, OLD.total, OLD.estado) THEN
      RETURN NEW;
    END IF;
  END IF;

  FOREACH v_periodo IN ARRAY ARRAY[
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.periodo END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.periodo END
  ] LOOP
    IF v_periodo IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tax_periods WHERE periodo = v_periodo AND cerrado_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'El período % está cerrado: reábrelo antes de modificar sus documentos.', v_periodo
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS tax_documents_periodo_cerrado ON public.tax_documents;
CREATE TRIGGER tax_documents_periodo_cerrado
  BEFORE INSERT OR UPDATE OR DELETE ON public.tax_documents
  FOR EACH ROW EXECUTE FUNCTION public.tax_documents_periodo_cerrado();

-- ---------------------------------------------------------------------
-- 4) Obligaciones: lo que se pagó de cada vencimiento
-- ---------------------------------------------------------------------
-- Los vencimientos se calculan en el código (con feriados); aquí sólo queda
-- lo que no se puede calcular: cuánto se pagó, cuándo y el comprobante.

CREATE TABLE IF NOT EXISTS public.tax_obligations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo               text NOT NULL CHECK (tipo IN ('F29', 'PREVIRED', 'PATENTE', 'F22')),
  periodo            text NOT NULL CHECK (periodo ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  vence_el           date NOT NULL,
  monto_estimado     bigint,
  monto_pagado       bigint CHECK (monto_pagado IS NULL OR monto_pagado >= 0),
  pagado_el          date,
  comprobante_path   text,
  comprobante_nombre text,
  notas              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tax_obligations_unica UNIQUE (tipo, periodo)
);

COMMENT ON TABLE public.tax_obligations IS
  'Pagos de F29, Previred, patente y renta. El vencimiento lo calcula src/lib/documentos/vencimientos.ts.';

DROP TRIGGER IF EXISTS tax_obligations_set_updated_at ON public.tax_obligations;
CREATE TRIGGER tax_obligations_set_updated_at
  BEFORE UPDATE ON public.tax_obligations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5) Trabajadores
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.employees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           text NOT NULL CHECK (btrim(nombre) <> ''),
  rut              text,
  cargo            text,
  tipo_contrato    text NOT NULL DEFAULT 'indefinido' CHECK (tipo_contrato IN ('indefinido', 'plazo_fijo')),
  sueldo_imponible bigint NOT NULL DEFAULT 0 CHECK (sueldo_imponible >= 0),
  afp              text,
  comision_afp     numeric(5,2) CHECK (comision_afp IS NULL OR comision_afp >= 0),
  salud            text NOT NULL DEFAULT 'fonasa' CHECK (salud IN ('fonasa', 'isapre')),
  adicional_salud  bigint NOT NULL DEFAULT 0 CHECK (adicional_salud >= 0),
  fecha_ingreso    date,
  activo           boolean NOT NULL DEFAULT true,
  notas            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.employees IS
  'Trabajadores con contrato, para estimar las imposiciones del mes. Sólo lo ve el rol ADMIN.';

CREATE UNIQUE INDEX IF NOT EXISTS employees_rut_unico
  ON public.employees (rut)
  WHERE rut IS NOT NULL AND btrim(rut) <> '';

DROP TRIGGER IF EXISTS employees_set_updated_at ON public.employees;
CREATE TRIGGER employees_set_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6) RLS: sólo service_role
-- ---------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tax_settings', 'tax_documents', 'tax_periods', 'tax_obligations', 'employees'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_all_service'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        t || '_all_service', t
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.tax_documents_periodo_cerrado() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7) Bucket privado para los archivos
-- ---------------------------------------------------------------------
-- Sin políticas para anon/authenticated: sólo el servidor (service_role)
-- sube y firma URLs temporales para ver cada archivo.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos-tributarios',
  'documentos-tributarios',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/xml', 'text/xml']
)
ON CONFLICT (id) DO NOTHING;
