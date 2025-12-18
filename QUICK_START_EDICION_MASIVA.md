# ⚡ Quick Start: Edición Masiva de Productos

## 🚀 5 MINUTOS PARA EMPEZAR

### 1️⃣ Abre la página
```
URL: http://localhost:3000/admin/productos/edicion-masiva
```

### 2️⃣ Elige tu acción

#### 📥 Si necesitas CARGAR productos nuevos:
```
Haz clic en: [Descargar Plantilla]
→ Completa los datos
→ Carga el archivo
→ ¡Listo!
```

#### 📤 Si necesitas ACTUALIZAR productos existentes:
```
Haz clic en: [Exportar Productos Actuales]
→ Abre en Excel/Sheets
→ Edita los campos
→ Guarda como CSV
→ Carga el archivo
→ ¡Listo!
```

---

## 📝 Formato CSV Súper Rápido

### Cambiar precios de 3 productos:
```csv
barcode,price
"123456",7.99
"789012",5.99
"345678",3.99
```

### Reponer stock:
```csv
barcode,stock
"123456",500
"789012",300
```

### Actualización completa:
```csv
barcode,name,price,stock,description,category,is_active
"123456","Manzana","5.99","100","Fresca","Frutas","true"
"789012","Tomate","3.50","200","Maduro","Verduras","true"
```

---

## ⚡ Keyboard Shortcuts

```
Ctrl+F  → Buscar producto en Excel
Ctrl+H  → Reemplazar múltiples valores
Ctrl+S  → Guardar archivo
```

---

## ✅ Validación Rápida

Antes de actualizar, verifica:
- ✅ Los barcodes existen en tu tienda
- ✅ El archivo está en formato CSV
- ✅ Solo hay datos en los campos que quieres cambiar
- ✅ Los números no tienen comillas (excepto en CSV)

---

## 🎯 Casos de Uso AHORA MISMO

### Cambiar 50 precios en 5 minutos:
1. `[Exportar Productos]` → 5 seg
2. Abre en Excel, edita columna precio → 2 min
3. `[Cargar archivo]` → 5 seg
4. `[Actualizar 50]` → 30 seg

### Reponer stock urgente:
1. Creas CSV con solo barcode y stock
2. Carga el archivo
3. Actualiza

### Describir 100 productos:
1. Exporta
2. Edita columna description en Excel
3. Carga y actualiza

---

## 🆘 Si Algo Falla

| Error | Solución |
|-------|----------|
| "Archivo no válido" | Guarda como **CSV**, no XLSX |
| "Producto no encontrado" | Exporta primero para ver barcodes exactos |
| "Algunos errores" | Revisa el reporte y reintenta esos |

---

## 📚 Más Info

- 📖 Guía completa: `GUIA_EDICION_MASIVA_PRODUCTOS.md`
- 🎬 Tutorial paso a paso: `TUTORIAL_EDICION_MASIVA_PASO_A_PASO.md`
- 📊 Comparativa antes/después: `COMPARATIVA_ANTES_DESPUES.md`
- ℹ️ Información técnica: `README_EDICION_MASIVA.md`

---

## 💪 ¡Listo! Vamos

→ Abre: `http://localhost:3000/admin/productos/edicion-masiva`  
→ Descarga una plantilla  
→ Haz tu primer cambio masivo  
→ ¡Celebra los 10+ minutos que acabas de ahorrar! 🎉

---

**Última actualización**: 17 de Diciembre 2025
