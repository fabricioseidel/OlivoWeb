-- =============================================================================
-- SCRIPT 14: REGENERAR HASHES DE CONTRASEÑAS CORRECTAMENTE
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Generar hashes bcrypt correctos usando pgcrypto
-- =============================================================================

-- Asegurarse de que pgcrypto esté habilitado
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Actualizar las contraseñas de los vendedores con hash correcto
-- Contraseña: "Venta2025"
UPDATE public.users
SET password_hash = crypt('Venta2025', gen_salt('bf', 10))
WHERE role = 'SELLER'
  AND email IN (
    'mariana@tienda.local',
    'ingrid@tienda.local',
    'alfredo@tienda.local',
    'fabricio@tienda.local',
    'maria@tienda.local',
    'pruebas@tienda.local'
  );

-- Verificar los nuevos hashes
SELECT email, name, role, 
       LEFT(password_hash, 20) || '...' AS hash_preview
FROM public.users
WHERE role = 'SELLER'
ORDER BY name;

-- Probar la función login nuevamente
SELECT * FROM login_user('mariana@tienda.local', 'Venta2025');

-- =============================================================================
-- NOTAS:
-- =============================================================================
-- gen_salt('bf', 10) genera un salt bcrypt con factor de costo 10
-- crypt() crea el hash usando el algoritmo bcrypt
-- Ahora la función login_user debería validar correctamente
-- =============================================================================
