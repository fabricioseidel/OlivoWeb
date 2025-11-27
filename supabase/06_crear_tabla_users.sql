-- =============================================================================
-- SCRIPT 6: CREAR TABLA USERS PARA AUTENTICACIÓN WEB
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Crear tabla users necesaria para NextAuth en tienda web
-- IMPORTANTE: Esta tabla es independiente de auth.users de Supabase Auth
-- =============================================================================

-- =============================================================================
-- PASO 1: CREAR TABLA users
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SELLER')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- PASO 2: CREAR ÍNDICES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- =============================================================================
-- PASO 3: HABILITAR RLS
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PASO 4: CREAR POLÍTICAS RLS
-- =============================================================================

-- Los usuarios pueden ver su propia información
CREATE POLICY users_select_own ON public.users
  FOR SELECT
  USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

-- Los usuarios pueden actualizar su propia información
CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

-- Solo service_role puede insertar (registro lo hace el backend)
CREATE POLICY users_insert_service ON public.users
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Solo service_role puede eliminar
CREATE POLICY users_delete_service ON public.users
  FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================================================
-- PASO 5: CREAR TRIGGER PARA updated_at
-- =============================================================================

-- Reutilizamos la función set_updated_at que ya existe
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- PASO 6: INSERTAR USUARIO ADMIN POR DEFECTO
-- =============================================================================

-- Contraseña: "admin123" (cambiar después del primer login)
-- Hash generado con bcryptjs rounds=10
INSERT INTO public.users (email, password_hash, name, role)
VALUES (
  'admin@olivomarket.com',
  '$2a$10$YourHashHere', -- Reemplazar con hash real
  'Administrador',
  'ADMIN'
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================

-- Verificar que la tabla se creó correctamente
-- SELECT * FROM public.users;

-- Verificar RLS habilitado
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'users';

-- Verificar políticas
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'users';

