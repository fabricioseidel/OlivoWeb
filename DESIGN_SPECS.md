# Especificaciones de Diseño y Componentes - OLIVOMARKET (v1.0)

Este documento describe la estructura visual, funcional y de componentes actual del proyecto `tienda-web-clean`. Sirve como referencia para el rediseño en Figma y la estandarización del sistema de diseño.

## 1. Sistema de Diseño Actual (Auditado)

Actualmente, los estilos están dispersos. Se identificaron los siguientes valores recurrentes que deben consolidarse en tokens.

### Colores
*   **Primario (Action/Brand):**
    *   `bg-emerald-600` / `text-emerald-600` (Botones de compra, precios oferta, branding principal)
    *   `bg-blue-600` / `text-blue-600` (Botones "Ver más", enlaces, estado activo)
    *   *Nota:* Hay una inconsistencia entre usar Emerald (Verde) y Blue (Azul) como color primario. Se recomienda unificar.
*   **Secundario / Neutros:**
    *   Fondo: `bg-gray-50` (Pantallas generales), `bg-white` (Tarjetas).
    *   Texto: `text-gray-900` (Títulos), `text-gray-500` (Subtítulos/Detalles).
*   **Estados:**
    *   Éxito: `text-green-600` / `bg-green-100` (Stock disponible, Badges activos).
    *   Peligro/Error: `text-red-600` / `bg-red-100` (Sin stock, Eliminar, Badges inactivos).
    *   Advertencia: `text-amber-700` / `bg-amber-100` (Pocas unidades).

### Tipografía
*   **Fuente:** No definida explícitamente (usa sans-serif por defecto de Tailwind/Browser).
*   **Escala:**
    *   H1: `text-3xl font-bold` (Títulos de página)
    *   H2: `text-2xl font-bold` (Secciones)
    *   H3: `text-lg font-medium` (Nombres de productos en cards)
    *   Body: `text-base`
    *   Small: `text-sm` (Meta-info).

### Componentes UI Base (`src/components/ui`)

Estos son los bloques de construcción actuales.

#### `Button`
*   **Variantes:**
    *   `primary`: `bg-blue-600` text-white.
    *   `secondary`: `bg-gray-600` text-white.
    *   `outline`: Borde `blue-600`, texto `blue-600`.
    *   `danger`: `bg-red-600` text-white.
*   **Tamaños:** `sm` (text-sm), `md` (text-base), `lg` (text-lg).
*   **Props:** `fullWidth`, `loading` (no implementado visualmente en base, pero usado).

#### `Card`
*   **Estructura:** Contenedor con `rounded-2xl`, `bg-white`, `ring-1 ring-gray-200`, `shadow-sm`.
*   **Sub-componentes:** `CardMedia` (Imagen cuadrada), `CardBody` (Padding 4), `CardTitle` (Clamp 2 lineas), `CardFooter`.

#### `Input`
*   **Estilo:** `rounded-md`, `border-gray-300`, focus `ring-blue-500`.
*   **Estados:** Soporta mensaje de error (`text-red-600`).

## 2. Mapa del Sitio y Pantallas

### Pública (Cliente)
1.  **Home (`/`)**:
    *   **Hero:** Banner grande con gradiente `from-emerald-800` y título "OLIVOMARKET". Botones "Ver Productos" y "Ofertas".
    *   **Categorías Destacadas:** Grid 4 columnas. Tarjetas con imagen y efecto hover zoom.
    *   **Productos Destacados:** Grid de productos. Muestra precio, botón "Comprar" directo y "Ver más".
    *   **Ventajas:** Sección de 3 columnas (Icono + Texto) sobre fondo `emerald-100/60`.
    *   **Newsletter:** Fondo oscuro `neutral-900`.

2.  **Catálogo de Productos (`/productos`)**:
    *   **Header:** Título simple.
    *   **Grid:** Muestra todos los productos activos.
    *   **Filtros:** (Actualmente básicos o inexistentes en la UI visualizada).

3.  **Detalle de Producto (`/productos/[slug]`)**:
    *   **Layout:** 2 Columnas (Escritorio). Izquierda: Galería de imágenes. Derecha: Info.
    *   **Info:** Precio (con descuento si aplica), Stock (con indicador de urgencia si es bajo), Descripción.
    *   **Acciones:** Selector de cantidad (+/-), "Agregar al Carrito", "Pedir por WhatsApp".
    *   **Relacionados:** Grid de 4 productos al final.

4.  **Categorías (`/categorias`) y Detalle (`/categorias/[slug]`)**:
    *   Listado visual de todas las categorías activas.
    *   Página de filtro que muestra productos de una categoría específica.

5.  **Carrito (`/carrito`)**:
    *   **Lista:** Tabla/Lista de items con imagen pequeña, nombre, controles de cantidad y eliminar.
    *   **Resumen:** Tarjeta lateral (sticky) con Subtotal, Envío y Total.
    *   **Acciones:** "Proceder al Pago", "Pedir por WhatsApp", "Vaciar Carrito".

6.  **Checkout (`/checkout`)**:
    *   **Pasos:** Wizard de 2 pasos (1. Envío, 2. Pago).
    *   **Formulario Envío:** Datos personales y dirección (con autocompletado si hay perfil). Selector de método de envío (Uber Flash, Express, etc.).
    *   **Formulario Pago:** Selección de método (Crédito, Débito, MercadoPago, Transferencia).

7.  **Mi Cuenta (`/mi-cuenta`)**:
    *   **Dashboard:** Saludo usuario e imagen.
    *   **Accesos Rápidos:** Info personal, Pedidos, Direcciones.
    *   **Pedidos Recientes:** Tabla simplificada de últimos 3 pedidos.

### Administrativa (Admin) - Requiere Rol ADMIN/SELLER
*   **Layout Admin:** Sidebar lateral fija oscura (`bg-gray-800`).
*   **Dashboard (`/admin`)**:
    *   **KPIs:** Tarjetas de colores con métricas (Ventas, Pedidos, Stock bajo).
    *   **Tablas:** Top productos vistos, intentos de compra.
*   **Productos (`/admin/productos`)**:
    *   **Tabla:** Lista con imagen mini, stock (colores semánticos), precio, estados (Destacado/Activo).
    *   **Acciones:** Editar, Eliminar, Toggle Destacado/Activo.
    *   **Filtros:** Buscador texto y dropdown categoría.
*   **Categorías (`/admin/categorias`)**:
    *   Similar a productos. Tabla con imagen, slug, contador de productos.
    *   Modal para Crear/Editar categoría (con subida de imagen).

## 3. Flujos Críticos (User Journeys)

### Flujo A: Compra Rápida (Invitado)
1.  Ingresa a Home.
2.  Ve "Productos Destacados".
3.  Clic en "Comprar" en una tarjeta -> *Toast*: "Añadido al carrito".
4.  Icono Carrito muestra (1).
5.  Clic en Carrito -> Revisa resumen.
6.  Clic "Proceder al Pago" -> Redirige a `/login` (si no está logueado) o permite checkout invitado (si está configurado, actualmente parece pedir sesión/perfil).

### Flujo B: Exploración y WhatsApp
1.  Ingresa a `/productos`.
2.  Entra a detalle de producto.
3.  Revisa galería y descripción.
4.  Clic en "Pedir por WhatsApp" -> Abre API WhatsApp con mensaje pre-llenado.

## 4. Estructura de Datos (Frontend Models)

### Product (UI)
```typescript
{
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number; // Precio oferta
  image: string;
  stock: number;
  featured: boolean;
  isActive: boolean;
  categories: string[];
}
```

### Category (UI)
```typescript
{
  id: string;
  name: string;
  slug: string;
  image: string;
  productsCount: number;
  isActive: boolean;
}
```

## 5. Recomendaciones para el Diseño en Figma

1.  **Sistema de Color Unificado:** Decidir entre Emerald y Blue como color primario. Actualmente compiten.
2.  **Grid System:** El código usa contenedores `max-w-7xl mx-auto px-4`. Esto equivale a un grid de 1280px con márgenes laterales.
3.  **Cards:** Estandarizar las cards. En Home tienen un estilo, en Admin otro. Usar un componente "Master Component" en Figma para la Product Card.
4.  **Mobile First:** El menú de navegación es complejo (Disclosure/Menu). Diseñar detalladamente el menú móvil (Hamburger menu).
