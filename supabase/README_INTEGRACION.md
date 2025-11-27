# 📋 GUÍA DE INTEGRACIÓN - Scripts SQL

## 🎯 Propósito
Estos scripts corrigen los problemas críticos de integración entre la app móvil (`appcelular`) y la tienda web (`tienda-web-clean`).

---

## ⚠️ ANTES DE COMENZAR

### 1. **IMPORTANTE: Hacer Backup**
```bash
# En Supabase Dashboard:
# Settings > Database > Database Backups > Create Backup
```

### 2. **Verificar Estado Actual**
Ejecuta esta consulta para ver qué tablas ya existen:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 3. **Leer el Análisis Completo**
Lee `AUDITORIA_INTEGRACION.md` para entender todos los problemas identificados.

---

## 📝 ORDEN DE EJECUCIÓN

### ✅ Scripts ya ejecutados (completados anteriormente):

1. ✅ `01_activar_rls_suppliers.sql` - RLS en suppliers
2. ✅ `02_fijar_search_path_funciones.sql` - Seguridad en funciones
3. ✅ `03_consolidar_politicas_rls.sql` - Eliminar políticas duplicadas
4. ✅ `04_optimizar_indices.sql` - Índices de rendimiento
5. ✅ `04b_limpiar_indices_duplicados.sql` - Limpiar duplicados
6. ✅ `05_mover_extensiones.sql` - Organizar extensiones

---

### 🆕 Scripts NUEVOS para integración:

### Script 6: Crear Tabla users ⭐ CRÍTICO
**Archivo:** `06_crear_tabla_users.sql`  
**Propósito:** Crear tabla para autenticación de tienda web  
**Tiempo estimado:** 1 min

**Antes de ejecutar:**
1. Genera un hash de contraseña para el admin:
   ```javascript
   // En Node.js:
   const bcrypt = require('bcryptjs');
   const hash = bcrypt.hashSync('admin123', 10);
   console.log(hash);
   ```
2. Reemplaza `$2a$10$YourHashHere` en el script con el hash generado

**Pasos:**
1. Abre Supabase SQL Editor
2. Copia TODO el contenido de `06_crear_tabla_users.sql`
3. Pega y ejecuta
4. Espera mensaje: "Success. No rows returned"

**Verificación:**
```sql
SELECT email, name, role FROM public.users;
-- Deberías ver: admin@olivomarket.com
```

---

### Script 7: Agregar Columnas a products ⭐ CRÍTICO
**Archivo:** `07_agregar_columnas_productos.sql`  
**Propósito:** Agregar image_url, gallery, featured, etc.  
**Tiempo estimado:** 1 min

**Pasos:**
1. Copia contenido de `07_agregar_columnas_productos.sql`
2. Pega en Supabase SQL Editor
3. Ejecuta
4. Espera "Success"

**Verificación:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'products' 
  AND column_name IN ('image_url', 'gallery', 'featured');
-- Deberías ver las 3 columnas nuevas
```

---

### Script 8: Crear Tabla sale_items ⭐ CRÍTICO
**Archivo:** `08_crear_tabla_sale_items.sql`  
**Propósito:** Almacenar items individuales de ventas  
**Tiempo estimado:** 1 min

**Pasos:**
1. Copia contenido de `08_crear_tabla_sale_items.sql`
2. Pega en Supabase SQL Editor
3. Ejecuta
4. Espera "Success"

**Verificación:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'sale_items';
-- Debería existir

SELECT * FROM public.sales_with_items LIMIT 1;
-- Vista creada correctamente
```

---

### Script 9: Actualizar Función apply_sale ⭐ CRÍTICO
**Archivo:** `09_actualizar_apply_sale.sql`  
**Propósito:** Actualizar función para usar sale_items  
**Tiempo estimado:** 1 min

**⚠️ REQUISITO:** Debe ejecutarse DESPUÉS del Script 8

**Pasos:**
1. Copia contenido de `09_actualizar_apply_sale.sql`
2. Pega en Supabase SQL Editor
3. Ejecuta
4. Espera "Success"

**Verificación:**
```sql
-- Ver definición de la función
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'apply_sale';
-- Debe mostrar la nueva versión con p_items JSONB
```

---

### Script 10: Crear Tabla sellers ⭐ RECOMENDADO
**Archivo:** `10_crear_tabla_sellers.sql`  
**Propósito:** Integrar usuarios móviles con web  
**Tiempo estimado:** 1 min

**Pasos:**
1. Copia contenido de `10_crear_tabla_sellers.sql`
2. Pega en Supabase SQL Editor
3. Ejecuta
4. Espera "Success"

**Verificación:**
```sql
SELECT * FROM public.sellers ORDER BY name;
-- Deberías ver: MARIANA, INGRID, ALFREDO, FABRICIO, MARIA, PRUEBAS

SELECT * FROM public.sales_by_seller;
-- Vista creada (puede estar vacía si no hay ventas aún)
```

---

## 🧪 TESTING COMPLETO

### Después de ejecutar TODOS los scripts:

```sql
-- =============================================================================
-- PRUEBA 1: Verificar estructura completa
-- =============================================================================

SELECT 
  'users' as tabla,
  COUNT(*) as registros
FROM public.users
UNION ALL
SELECT 'products', COUNT(*) FROM public.products
UNION ALL
SELECT 'categories', COUNT(*) FROM public.categories
UNION ALL
SELECT 'sales', COUNT(*) FROM public.sales
UNION ALL
SELECT 'sale_items', COUNT(*) FROM public.sale_items
UNION ALL
SELECT 'sellers', COUNT(*) FROM public.sellers
UNION ALL
SELECT 'suppliers', COUNT(*) FROM public.suppliers
UNION ALL
SELECT 'product_suppliers', COUNT(*) FROM public.product_suppliers;

-- =============================================================================
-- PRUEBA 2: Verificar RLS en todas las tablas
-- =============================================================================

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ Habilitado' ELSE '❌ Deshabilitado' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- PRUEBA 3: Verificar índices
-- =============================================================================

SELECT 
  tablename,
  COUNT(*) as total_indices
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =============================================================================
-- PRUEBA 4: Test de función apply_sale
-- =============================================================================

-- Crear venta de prueba
SELECT public.apply_sale(
  p_total := 150.00,
  p_payment_method := 'cash',
  p_cash_received := 200.00,
  p_change_given := 50.00,
  p_discount := 0,
  p_tax := 0,
  p_notes := 'Venta de prueba - integración',
  p_device_id := 'test-device-001',
  p_client_sale_id := 'test-integracion-' || gen_random_uuid()::text,
  p_items := '[
    {
      "barcode": "prueba001",
      "name": "Producto de Prueba",
      "quantity": 3,
      "price": 50.00,
      "subtotal": 150.00
    }
  ]'::jsonb,
  p_timestamp := now(),
  p_seller_name := 'PRUEBAS'
);

-- Ver la venta creada
SELECT s.*, se.name as vendedor
FROM public.sales s
LEFT JOIN public.sellers se ON s.seller_id = se.id
WHERE s.notes LIKE '%Venta de prueba%'
ORDER BY s.ts DESC
LIMIT 1;

-- Ver los items de la venta
SELECT si.*
FROM public.sale_items si
JOIN public.sales s ON si.sale_id = s.id
WHERE s.notes LIKE '%Venta de prueba%'
ORDER BY si.id DESC;

-- =============================================================================
-- PRUEBA 5: Verificar extensiones
-- =============================================================================

SELECT 
  e.extname AS extension_name,
  n.nspname AS schema_name,
  e.extversion AS version
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname IN ('pg_trgm', 'citext')
ORDER BY e.extname;
-- Ambas deben estar en schema 'extensions'

```

---

## 🚀 SIGUIENTES PASOS

### 1. **Actualizar App Móvil** (appcelular)

Modificar `src/sync.js` para enviar seller_name:

```javascript
// En pushSales()
const payload = {
  // ... otros campos
  p_items: s.items_json,
  p_timestamp: originalTimestamp,
  p_seller_name: currentUserName  // 🆕 Agregar esto
};
```

### 2. **Actualizar Tienda Web** (tienda-web-clean)

Ya está lista para usar las nuevas tablas. Solo necesitas:

```bash
# En tienda-web-clean
npm run dev

# Probar login en:
# http://localhost:3000/login

# Usuario: admin@olivomarket.com
# Contraseña: admin123 (o la que generaste)
```

### 3. **Configurar Supabase Storage**

Para las imágenes de productos:

1. Ve a Supabase Dashboard > Storage
2. Crear bucket "products"
3. Configurar políticas:
   ```sql
   -- Permitir lectura pública
   CREATE POLICY "Public read" ON storage.objects
   FOR SELECT USING (bucket_id = 'products');
   
   -- Permitir escritura a authenticated
   CREATE POLICY "Authenticated upload" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'products' AND 
     auth.role() = 'authenticated'
   );
   ```

### 4. **Generar Hash de Contraseña**

Si necesitas crear más usuarios admin:

```javascript
// En Node.js o navegador (consola dev de tienda web)
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('tu_contraseña', 10));
```

Luego:
```sql
INSERT INTO public.users (email, password_hash, name, role)
VALUES (
  'nuevo@email.com',
  '$2a$10$hash_generado_aqui',
  'Nombre Usuario',
  'ADMIN'
);
```

---

## ❓ FAQ / Troubleshooting

### Error: "relation users does not exist"
**Solución:** Ejecuta Script 6 primero

### Error: "column image_url does not exist"
**Solución:** Ejecuta Script 7

### Error: "relation sale_items does not exist"
**Solución:** Ejecuta Script 8 antes del Script 9

### Error: "function apply_sale does not match"
**Solución:** 
1. Verifica que Script 8 se ejecutó
2. Re-ejecuta Script 9 completo

### Las ventas no se sincronizan desde la app móvil
**Solución:**
1. Verifica que Scripts 8, 9 y 10 se ejecutaron
2. Actualiza `sync.js` para incluir `p_seller_name`
3. Revisa logs de Supabase

### No puedo hacer login en la tienda web
**Solución:**
1. Verifica que Script 6 se ejecutó
2. Genera nuevo hash de contraseña
3. Actualiza el script 6 con el hash correcto
4. Re-ejecuta solo la parte de INSERT

---

## 📊 MONITOREO

### Dashboard de Estado
```sql
-- Ejecutar periódicamente para monitorear
SELECT 
  (SELECT COUNT(*) FROM public.users) as total_users,
  (SELECT COUNT(*) FROM public.sellers WHERE active = true) as sellers_activos,
  (SELECT COUNT(*) FROM public.products) as total_productos,
  (SELECT COUNT(*) FROM public.products WHERE stock <= reorder_threshold) as stock_bajo,
  (SELECT COUNT(*) FROM public.sales WHERE ts >= CURRENT_DATE) as ventas_hoy,
  (SELECT COALESCE(SUM(total), 0) FROM public.sales WHERE ts >= CURRENT_DATE) as total_ventas_hoy;
```

---

## 📞 SOPORTE

Si encuentras problemas:
1. Revisa `AUDITORIA_INTEGRACION.md`
2. Verifica que ejecutaste los scripts en orden
3. Revisa logs de Supabase
4. Asegúrate de tener permisos de service_role

---

## ✅ CHECKLIST DE INTEGRACIÓN

- [ ] Script 6: Tabla users creada
- [ ] Script 7: Columnas agregadas a products
- [ ] Script 8: Tabla sale_items creada
- [ ] Script 9: Función apply_sale actualizada
- [ ] Script 10: Tabla sellers creada
- [ ] Pruebas ejecutadas exitosamente
- [ ] Login en tienda web funciona
- [ ] Supabase Storage configurado
- [ ] App móvil actualizada para enviar seller_name
- [ ] Primera venta sincronizada exitosamente
- [ ] Imágenes de productos funcionando

---

**¡Éxito con la integración!** 🚀

