# 🔧 FIX: Agregar Columnas Faltantes a la Tabla `categories`

## 📋 Problema
Error: `"Could not find the 'description' column of 'categories' in the schema cache"`

Esto ocurre porque la tabla `categories` falta las siguientes columnas:
- `description` - Descripción de la categoría
- `slug` - URL-friendly identifier
- `image_url` - URL de la imagen
- `is_active` - Estado activo/inactivo
- `created_at` - Timestamp de creación
- `updated_at` - Timestamp de última actualización

## ✅ Solución

### Paso 1: Ejecutar el Script SQL
1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia el contenido completo de `30_add_categories_columns.sql`
3. Pega en el editor
4. Haz clic en **RUN**
5. Espera el mensaje: "Success. No rows returned"

### Paso 2: Verificar las Columnas
Ejecuta esta consulta para confirmar:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;
```

Deberías ver estas columnas:
```
id                  | bigint    | NO
name                | text      | YES
description         | text      | YES  ✅ (NEW)
slug                | varchar   | YES  ✅ (NEW)
image_url           | varchar   | YES  ✅ (NEW)
is_active           | boolean   | NO   ✅ (NEW)
created_at          | timestamptz| NO  ✅ (NEW)
updated_at          | timestamptz| NO  ✅ (NEW)
```

### Paso 3: Reinicia el Servidor
```bash
# En la terminal del proyecto
npm run dev
```

## 📊 Estado de la Integración BD

### Estamos usando: **Supabase (PostgreSQL)**

#### Columnas de `categories`:
- ✅ `id` - PK
- ✅ `name` - Nombre de la categoría
- ✅ `description` - NUEVO ✨
- ✅ `slug` - NUEVO ✨
- ✅ `image_url` - NUEVO ✨
- ✅ `is_active` - NUEVO ✨
- ✅ `created_at` - NUEVO ✨
- ✅ `updated_at` - NUEVO ✨ (con trigger automático)

#### Características:
- **RLS (Row Level Security)**: Activado para seguridad
- **Triggers**: `trg_categories_updated_at` mantiene `updated_at` actualizado automáticamente
- **Índices**: Creados en `slug`, `is_active`, `name` para mejor performance

## 🚀 Próximos Pasos

1. Después de ejecutar el script, prueba el endpoint:
   ```bash
   # PATCH /api/categories/[id]
   curl -X PATCH http://localhost:3000/api/categories/1 \
     -H "Content-Type: application/json" \
     -d '{"name": "Test", "description": "Test category"}'
   ```

2. Verifica los logs para confirmar que no hay más errores de schema cache

## 🔍 Debugging

Si aún tienes problemas después de ejecutar el script:

### 1. Verifica el esquema actual
```sql
\d public.categories
```

### 2. Verifica la cache de PostgREST
La cache se refresca automáticamente después de cambios DDL. Si no:
- Espera 30 segundos
- Recarga tu navegador (Ctrl+Shift+R)
- Reinicia tu servidor (npm run dev)

### 3. Revisa los logs del servidor
```bash
# Los errores de Supabase aparecerán aquí
npm run dev
```

---

**Actualizado**: 17 de Diciembre 2025
**Estado**: Script listo para aplicar
