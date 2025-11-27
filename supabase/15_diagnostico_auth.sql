-- =============================================================================
-- DIAGNÓSTICO: Verificar estado de autenticación
-- =============================================================================

-- 1. Verificar que pgcrypto esté habilitada
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 2. Verificar usuarios SELLER
SELECT id, email, name, role, 
       LEFT(password_hash, 30) || '...' AS hash_preview,
       LENGTH(password_hash) AS hash_length
FROM public.users
WHERE role = 'SELLER'
ORDER BY name;

-- 3. Probar generación de hash
SELECT crypt('Venta2025', gen_salt('bf', 10)) AS nuevo_hash;

-- 4. Probar validación directa
SELECT 
  email,
  name,
  crypt('Venta2025', password_hash) AS hash_validacion,
  password_hash AS hash_original,
  (crypt('Venta2025', password_hash) = password_hash) AS password_match
FROM public.users
WHERE email = 'mariana@tienda.local';

-- 5. Verificar sellers vinculados
SELECT s.name, s.user_id, u.email, u.name AS user_name
FROM public.sellers s
JOIN public.users u ON s.user_id::UUID = u.id
WHERE u.email = 'mariana@tienda.local';
