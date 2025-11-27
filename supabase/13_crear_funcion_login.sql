-- =============================================================================
-- SCRIPT 13: CREAR FUNCIÓN DE LOGIN PARA APP MÓVIL
-- =============================================================================
-- Fecha: 2025-10-28
-- Propósito: Función RPC para validar credenciales desde la app móvil
-- =============================================================================

-- Crear función de login que valida email y contraseña
CREATE OR REPLACE FUNCTION public.login_user(
  p_email TEXT,
  p_password TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  user_id TEXT,
  email TEXT,
  name TEXT,
  role TEXT,
  seller_name TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_seller_name TEXT;
  v_password_valid BOOLEAN;
BEGIN
  -- Buscar usuario por email
  SELECT u.id, u.email, u.name, u.role, u.password_hash
  INTO v_user
  FROM public.users u
  WHERE LOWER(u.email) = LOWER(TRIM(p_email))
  LIMIT 1;

  -- Si no existe el usuario
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      'Credenciales inválidas'::TEXT;
    RETURN;
  END IF;

  -- Validar contraseña usando pgcrypto (crypt)
  -- Nota: bcrypt hashes comienzan con $2a$, $2b$ o $2y$
  SELECT v_user.password_hash = crypt(p_password, v_user.password_hash)
  INTO v_password_valid;

  -- Si la contraseña no es válida
  IF NOT v_password_valid THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      'Credenciales inválidas'::TEXT;
    RETURN;
  END IF;

  -- Obtener nombre del seller si existe
  SELECT s.name INTO v_seller_name
  FROM public.sellers s
  WHERE s.user_id = v_user.id
  LIMIT 1;

  -- Retornar datos del usuario autenticado
  RETURN QUERY SELECT 
    TRUE,
    v_user.id::TEXT,
    v_user.email,
    COALESCE(v_seller_name, v_user.name),
    v_user.role,
    v_seller_name,
    'Login exitoso'::TEXT;
END;
$$;

-- Probar la función
SELECT * FROM login_user('mariana@tienda.local', 'Venta2025');

-- =============================================================================
-- NOTAS:
-- =============================================================================
-- Esta función usa pgcrypto (extensión de PostgreSQL) para validar bcrypt
-- La app móvil solo envía email y contraseña, la validación ocurre en el servidor
-- No se expone el hash de contraseña al cliente
-- =============================================================================
