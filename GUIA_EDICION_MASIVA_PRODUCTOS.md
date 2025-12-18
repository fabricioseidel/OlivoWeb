# 📋 Guía: Edición Masiva de Productos

## 🚀 Acceso Rápido

Desde el panel de administración, ve a:
```
Admin → Productos → [Botón "Edición Masiva"]
```

O accede directamente a:
```
https://tu-tienda.com/admin/productos/edicion-masiva
```

---

## 📥 3 Formas de Editar Productos

### ✅ **Opción 1: Exportar → Editar → Importar (Recomendado)**

**Ventajas**: Garantiza que actualizas productos existentes sin errores

**Pasos**:
1. En la página de edición masiva, haz clic en **"Exportar Productos Actuales"**
   - Descargará un CSV con TODOS tus productos actuales
2. Abre el CSV en Excel, Google Sheets o tu editor favorito
3. Edita solo las columnas que desees cambiar:
   - `price` - Nuevo precio
   - `stock` - Nuevo inventario
   - `description` - Nueva descripción
   - `is_active` - true/false para activo/inactivo
4. Guarda el archivo (Ctrl+S)
5. En la página de edición masiva, carga el archivo
6. Revisa la vista previa
7. Haz clic en **"Actualizar X productos"**

---

### ✅ **Opción 2: Usar la Plantilla**

**Ventajas**: Rápido para crear muchos productos nuevos o actualizaciones puntuales

**Pasos**:
1. Descarga la **"Plantilla de Productos"**
2. Completa solo los campos que necesites:
   ```csv
   barcode,name,price,stock,description,category,is_active
   123456,"Producto 1",19.99,100,"Desc...",Frutas,true
   789012,"Producto 2",29.99,50,"Desc...",Verduras,true
   ```
3. Guarda como CSV (importante: formato CSV, no XLSX)
4. Sube el archivo
5. Haz clic en **"Actualizar"**

---

### ✅ **Opción 3: Crear CSV Manualmente**

**Útil si necesitas**: Actualizar precios de proveedores, cambiar stocks, cambiar descripciones en masa

**Estructura del CSV**:
```
barcode,name,price,stock,description,category,is_active
123456,Manzana Roja,5.99,100,Manzanas frescas de calidad premium,Frutas,true
789012,Tomate Maduro,3.50,200,Tomates cultivados localmente,Verduras,true
```

**Campos importantes**:
- `barcode` - Código de barras único del producto
- `name` - Nombre del producto
- `price` - Precio unitario
- `stock` - Cantidad disponible
- `description` - Descripción largo (puede incluir saltos de línea si está entre comillas)
- `category` - Categoría del producto
- `is_active` - `true` o `false`

---

## ⚠️ Reglas Importantes

### ✅ SI puedo actualizar:
- ✅ Precios
- ✅ Stock/Inventario
- ✅ Descripciones
- ✅ Categorías
- ✅ Estado activo/inactivo

### ❌ NO puedo actualizar:
- ❌ Barcode (es el identificador único)
- ❌ Imágenes (carga por separado)
- ❌ ID del producto

### 📌 Importante:
- El **barcode** es lo que identifica cada producto
- Si el barcode no existe en la BD, el producto no se actualizará
- Los campos vacíos se ignoran (no cambian nada)
- Solo llena los campos que quieras cambiar

---

## 📊 Ejemplos de Casos de Uso

### Caso 1: Actualizar Precios de Todos los Productos
```csv
barcode,price
123456,15.99
789012,8.50
345678,22.99
```

### Caso 2: Reponer Stock
```csv
barcode,stock
123456,500
789012,300
345678,150
```

### Caso 3: Cambiar Descripción y Categoría
```csv
barcode,description,category
123456,"Nueva descripción producto 1",Frutas Premium
789012,"Nueva descripción producto 2",Verduras Selectas
```

### Caso 4: Desactivar Productos Antiguos
```csv
barcode,is_active
OLD123,false
OLD456,false
OLD789,false
```

---

## 🔍 Verificación Previa

**Antes de hacer clic en "Actualizar"**:

1. ✅ Revisa la **Vista Previa** - Muestra las primeras 10 filas
2. ✅ Verifica que los **barcodes** existan (si no existe, fallará)
3. ✅ Comprueba que los datos están en el formato correcto
4. ✅ Haz una prueba con 1-2 productos primero

---

## 📈 Resultados

Después de actualizar verás:

```
✅ Actualización completa: 95 exitosos, 5 fallidos

Errores encontrados:
• Producto no encontrado: 999999
• Producto no encontrado: 888888
```

---

## 🆘 Solución de Problemas

### Problema: "Producto no encontrado"
**Causa**: El barcode no existe en la BD
**Solución**: 
1. Exporta los productos actuales
2. Copia el barcode exacto del CSV exportado
3. Reintenta

### Problema: Archivo no se carga
**Causa**: Formato incorrecto (probablemente XLSX en lugar de CSV)
**Solución**:
1. Abre el archivo en Excel/Sheets
2. Guarda como → Formato CSV (separado por comas)
3. Intenta de nuevo

### Problema: Algunos productos no se actualizaron
**Causa**: 
- Barcode incorrecto
- Datos inválidos (precio texto en lugar de número)
- Problemas de conexión
**Solución**: Revisa el reporte de errores y reintenta solo esos

### Problema: Ver qué cambió
**Solución**: Antes de actualizar, exporta para ver el estado anterior

---

## 💡 Tips & Tricks

### 🔄 Actualización Periódica de Precios
1. Cada mes, exporta productos
2. Edita solo la columna `price`
3. Sube y actualiza

### 📦 Importación Desde Proveedor
Si tu proveedor te da un CSV con precios:
1. Copia la columna de barcode
2. Pega en tu plantilla
3. Añade precios y stock
4. Importa

### 🏷️ Cambios de Temporada
1. Exporta todos los productos
2. Busca y reemplaza categorías
3. Ajusta precios
4. Importa

### ✅ Auditoria
Todos los cambios quedan registrados en Supabase:
- Quién hizo el cambio
- Cuándo
- Qué se cambió

---

## 📞 Soporte

Si tienes dudas:
- Revisa los ejemplos anteriores
- Prueba con un producto primero
- Contacta al soporte

**Última actualización**: 17 de Diciembre 2025
