# Documentación de Integración: Tienda Web -> Inventario

Este documento detalla la estructura de datos, lógica de negocio y flujos de trabajo de la Tienda Web para facilitar la integración con el sistema de Inventario.

## 1. Estructura del Producto (Formulario de Creación)

Para mantener la compatibilidad entre ambos sistemas, el formulario de creación de productos en el inventario debe respetar los siguientes campos y tipos de datos.

> **Nota:** Se han omitido los detalles de implementación de imágenes (`image_url`, `gallery`) según lo solicitado, pero los campos existen en la base de datos.

### Campos Principales

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | String | Sí | Nombre comercial del producto. |
| `description` | Text | No | Descripción detallada (HTML o Texto plano). |
| `price` | Number | Sí | Precio de venta al público (PVP). |
| `sale_price` | Number | No | Precio de oferta (si aplica). |
| `stock` | Integer | Sí | Cantidad disponible en inventario. |
| `category_id` | UUID | No | ID de la categoría principal. |
| `slug` | String | Sí | Identificador único para URL (generado automáticamente del nombre). |
| `barcode` | String | No | Código de barras (EAN/UPC). |
| `is_active` | Boolean | Sí | Define si el producto es visible en la tienda. |
| `featured` | Boolean | No | Define si aparece en la sección "Destacados". |

### Campos de Especificaciones (JSONB)

El sistema web maneja características adicionales en un campo JSON o array de strings.

*   **`features`**: Array de strings (ej. `["Sin Gluten", "Orgánico"]`).
*   **`measurement_unit`**: String (ej. "ml", "g", "kg", "l").
*   **`measurement_value`**: Number (ej. 500).

### Lógica de Precios y Ofertas

El sistema web determina si un producto está en oferta comparando dos campos:

1.  **`price`**: Es el precio base.
2.  **`offer_price`** (o `sale_price` en DB): Es el precio promocional.

**Regla de Negocio:**
*   Si `offer_price` > 0 y `offer_price` < `price`:
    *   El producto se muestra con etiqueta de "OFERTA".
    *   El precio tachado es `price`.
    *   El precio actual es `offer_price`.

## 2. Editabilidad del Producto

En el panel de administración actual (`src/app/admin/productos/[id]/page.tsx`), se permite editar la siguiente información en tiempo real:

*   **Información Básica:** Nombre, Descripción, Slug.
*   **Precios:** Precio Regular, Precio de Oferta, Precio Sugerido.
*   **Inventario:** Stock actual.
*   **Estado:** Activo/Inactivo (switch inmediato), Destacado.
*   **Categorización:** Categorías asignadas.
*   **Proveedores:** Asignación de proveedores y costos (Precio con/sin IVA).

## 3. Flujo de Transferencias y Comprobantes

El manejo de pagos por transferencia bancaria sigue un flujo específico que involucra al cliente y al administrador.

### A. Creación del Pedido (Web)
1.  El cliente selecciona "Transferencia Bancaria" en el checkout.
2.  Se crea una orden en la tabla `orders` con:
    *   `payment_method`: `'transfer'` (o similar).
    *   `payment_status`: `'pending'`.
    *   `status`: `'pending'`.
3.  Al cliente se le muestran los datos bancarios y un botón para "Subir Comprobante".

### B. Carga del Comprobante (Cliente)
El cliente puede subir el comprobante inmediatamente o hacerlo después desde "Mis Pedidos".

*   **Endpoint:** `/api/sales/[id]/upload-receipt`
*   **Formatos aceptados:** JPG, PNG, WEBP, HEIC.
*   **Almacenamiento:**
    *   Bucket de Supabase Storage: `uploads`.
    *   Nombre de archivo: `comprobante-{saleId}-{timestamp}-{random}.{ext}`.
*   **Actualización en Base de Datos:**
    *   Tabla: `sales` (o `orders` dependiendo de la versión de migración).
    *   Campos actualizados:
        *   `transfer_receipt_uri`: URL pública del archivo.
        *   `transfer_receipt_name`: Nombre del archivo físico.

### C. Validación (Administrador/Inventario)
El sistema de inventario debe ser capaz de:
1.  Leer las órdenes con `payment_method = 'transfer'` y `payment_status = 'pending'`.
2.  Verificar si existe `transfer_receipt_uri`.
3.  Mostrar el comprobante (imagen) al operador.
4.  Permitir al operador aprobar o rechazar el pago.
    *   **Aprobar:** Cambiar `payment_status` a `'paid'` y `status` a `'processing'`.
    *   **Rechazar:** Notificar al cliente (opcional) o cancelar la orden.

## 4. Esquema de Base de Datos Relevante (Supabase/PostgreSQL)

```sql
-- Tabla de Productos (Simplificada)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2), -- Precio de oferta
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true,
  features JSONB, -- Array de características
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Órdenes/Ventas
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  total NUMERIC(15,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, cancelled
  payment_method TEXT, -- transfer, card, cash
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
  transfer_receipt_uri TEXT, -- URL del comprobante
  created_at TIMESTAMPTZ DEFAULT now()
);
```
