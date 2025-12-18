# 🎯 Tutorial Paso a Paso: Edición Masiva de Productos

## Video Tutorial (Instrucciones Detalladas)

### 📍 Paso 1: Acceder a la Página
```
URL: http://localhost:3000/admin/productos/edicion-masiva

O desde el panel:
Admin → Productos → [Botón "📋 Edición Masiva"]
```

---

## 🟢 Escenario A: Exportar → Editar → Importar

### Paso 1️⃣: Descargar Productos Existentes
1. En la página de edición masiva
2. Haz clic en **"Exportar Productos Actuales"** (botón verde)
3. Se descargará: `productos_2025-12-17.csv`

**Archivo descargado será algo como:**
```csv
barcode,name,price,stock,description,category,is_active
"123456","Manzana Roja","5.99","100","Manzanas frescas","Frutas","true"
"789012","Tomate Maduro","3.50","200","Tomates jugosos","Verduras","true"
"345678","Lechuga Verde","2.99","150","Lechuga crisp","Verduras","true"
```

### Paso 2️⃣: Editar en Excel/Sheets
1. Abre el archivo con Excel o Google Sheets
2. Ejemplo: Quiero cambiar precios y agregar stock

**Antes:**
| barcode | name | price | stock | category | is_active |
|---------|------|-------|-------|----------|-----------|
| 123456 | Manzana Roja | 5.99 | 100 | Frutas | true |
| 789012 | Tomate Maduro | 3.50 | 200 | Verduras | true |

**Después:**
| barcode | name | price | stock | category | is_active |
|---------|------|-------|-------|----------|-----------|
| 123456 | Manzana Roja | **6.99** | **150** | Frutas | true |
| 789012 | Tomate Maduro | **4.50** | **300** | Verduras | true |

### Paso 3️⃣: Guardar como CSV
1. En Excel: **Archivo → Guardar Como**
2. Formato: **CSV (separado por comas)** (*.csv)
3. Nombre: `productos_actualizados.csv`
4. Haz clic en **Guardar**

⚠️ Si pide: "¿Guardar en formato Excel?"  
👉 Responde: **"No, usa formato CSV"**

### Paso 4️⃣: Cargar el Archivo
1. De vuelta en la página de edición masiva
2. Haz clic en el área de **"Sube tu archivo CSV"**
3. Selecciona `productos_actualizados.csv`

**Verás:**
```
Archivo: productos_actualizados.csv
Filas: 2
```

### Paso 5️⃣: Revisar Vista Previa
La página muestra las primeras 10 filas:

```
┌─────────┬──────────────┬────────┬────────┬───────────────┐
│ Barcode │ Nombre       │ Precio │ Stock  │ Categoría     │
├─────────┼──────────────┼────────┼────────┼───────────────┤
│ 123456  │ Manzana Roja │ 6.99   │ 150    │ Frutas        │
│ 789012  │ Tomate Maduro│ 4.50   │ 300    │ Verduras      │
└─────────┴──────────────┴────────┴────────┴───────────────┘
```

✅ ¿Looks correcto? Continúa

### Paso 6️⃣: Actualizar
1. Haz clic en **"Actualizar 2 productos"**
2. Espera... (procesando)

**Resultado:**
```
✅ Actualización completa: 2 exitosos, 0 fallidos

Actualización completada correctamente
```

---

## 🟠 Escenario B: Usar Plantilla para Cambios Puntuales

### Caso: Cambiar solo precios de 3 productos

### Paso 1️⃣: Descargar Plantilla
1. Haz clic en **"Descargar Plantilla"**
2. Se descarga: `plantilla_productos.csv`

**Contenido:**
```csv
barcode,name,price,stock,description,category,is_active
"123456","Producto Ejemplo","19.99","100","Descripción","Frutas","true"
"","","","","","",""
```

### Paso 2️⃣: Editar - Solo llenar lo necesario
```csv
barcode,name,price,stock,description,category,is_active
"123456","Manzana Roja","7.99","","","",""
"789012","Tomate Maduro","5.50","","","",""
"345678","Lechuga Verde","3.49","","","",""
```

⚠️ **Importante**: 
- Solo completé `barcode`, `name` y `price`
- Los campos vacíos NO se modificarán
- Así no afecto stock, descripción, etc.

### Paso 3️⃣: Guardar como CSV
Igual que antes (Archivo → Guardar como CSV)

### Paso 4️⃣: Cargar y Actualizar
Repite los pasos 4-6 del escenario anterior

---

## 🟡 Escenario C: Reponer Stock Masivo

### Caso: Tu proveedor te trae 100 unidades de cada producto

### Paso 1️⃣: Preparar CSV
```csv
barcode,stock
"123456","200"
"789012","300"
"345678","250"
```

### Nota:
- Solo `barcode` y `stock`
- Los otros campos se ignoran
- Resultado: Solo se actualiza el stock

---

## 🔴 Escenario D: Resolver Errores

### Error: "Producto no encontrado: 123456"

**Causa**: El barcode no existe o está incorrecto

**Solución**:
1. Exporta todos los productos
2. Busca (Ctrl+F) el producto por nombre
3. Copia el barcode EXACTO
4. Reemplaza en tu CSV
5. Intenta de nuevo

**Ejemplo:**
- ❌ Intentaste: `"12345"` (falta un 6)
- ✅ Correcto: `"123456"`

---

## 📊 Tabla Resumen de Operaciones

| Operación | Comando CSV | Resultado |
|-----------|-------------|-----------|
| Cambiar precio | `barcode,price` | Solo cambia precio |
| Reponer stock | `barcode,stock` | Solo cambia stock |
| Nueva descripción | `barcode,description` | Solo cambia descripción |
| Cambiar categoría | `barcode,category` | Solo cambia categoría |
| Desactivar | `barcode,is_active` | Puedes marcar como `false` |
| Todo lo anterior | `barcode,price,stock,description,category,is_active` | Actualiza todo |

---

## ✅ Validación Rápida

**Después de actualizar**, verifica en tu tienda:

1. Ve a **Productos** en el admin
2. Busca un producto que actualizaste
3. Haz clic para editar
4. Comprueba que los datos cambios

**Ejemplo:**
```
Producto: Manzana Roja
Precio: 6.99 ✅ (fue 5.99)
Stock: 150 ✅ (fue 100)
```

---

## 🆘 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Archivo no cargado" | Guarda como CSV (no XLSX) |
| "Barcode no encontrado" | Exporta y copia el barcode exacto |
| "Error de formato" | Verifica separadores (deben ser comas) |
| "Algunos fallaron" | Revisa el reporte y reintenta solo esos |

---

## 📝 Plantilla para Copiar/Pegar

**Cambiar 3 precios:**
```csv
barcode,price
"123456",7.99
"789012",5.99
"345678",3.99
```

**Reponer stock:**
```csv
barcode,stock
"123456",500
"789012",300
"345678",200
```

**Actualización completa:**
```csv
barcode,name,price,stock,description,category,is_active
"123456","Manzana Premium",7.99,500,"La mejor manzana",Frutas,true
"789012","Tomate Selecta",5.99,300,"Tomate jugoso",Verduras,true
```

---

## ⏱️ Tiempos Aproximados

- ⚡ Exportar: 5 segundos
- ⚡ Editar en Excel: 2-5 minutos (depende de cantidad)
- ⚡ Guardar CSV: 10 segundos
- ⚡ Cargar y actualizar: 10-30 segundos

**Total: 3-10 minutos para actualizar 100+ productos** 🚀

---

**Última actualización**: 17 de Diciembre 2025
