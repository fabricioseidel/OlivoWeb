-- Verificar tipo de dato de user_id en sellers
SELECT 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sellers' 
  AND table_schema = 'public'
  AND column_name = 'user_id';

-- Si user_id es UUID, necesitamos convertirlo a TEXT o cambiar la comparación
