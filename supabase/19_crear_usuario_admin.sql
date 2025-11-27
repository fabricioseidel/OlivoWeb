-- =============================================================================
-- SCRIPT 19: CREAR USUARIO ADMINISTRADOR
-- =============================================================================
-- Fecha: 2025-10-29
-- Propósito: Crear usuario con rol ADMIN para acceso completo al panel web
-- =============================================================================

-- Crear usuario administrador
-- Email: admin@tienda.local
-- Contraseña: Admin2025
-- Rol: ADMIN

INSERT INTO public.users (email, name, role, password_hash)
VALUES (
  'admin@tienda.local',
  'Administrador',
  'ADMIN',
  crypt('Admin2025', gen_salt('bf', 10))
)
ON CONFLICT (email) DO UPDATE
SET 
  role = 'ADMIN',
  password_hash = crypt('Admin2025', gen_salt('bf', 10));

-- Verificar usuario creado
SELECT id, email, name, role, 
       LEFT(password_hash, 20) || '...' AS hash_preview
FROM public.users
WHERE email = 'admin@tienda.local';

-- Probar login
SELECT * FROM login_user('admin@tienda.local', 'Admin2025');

-- =============================================================================
-- CREDENCIALES DEL ADMINISTRADOR:
-- =============================================================================
-- Email: admin@tienda.local
-- Contraseña: Admin2025
-- Rol: ADMIN
-- 
-- Acceso:
-- ✅ Panel web completo (http://localhost:3000/admin)
-- ✅ Crear/editar productos, categorías, usuarios
-- ✅ Ver todas las ventas y reportes
-- ✅ Configuración del sistema
-- =============================================================================
