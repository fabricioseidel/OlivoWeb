# OLIVOMARKET - Sistema de Diseño Mejorado 🛒✨

## Resumen de Mejoras

Este rediseño unifica el sistema visual de OLIVOMARKET, resolviendo las inconsistencias entre Emerald (verde) y Blue (azul), estableciendo **Emerald como color primario** de marca.

---

## 🎨 Sistema de Colores Unificado

### Colores Primarios (Brand)
- **Primary**: `#10B981` (Emerald-600) - Botones principales, CTAs
- **Primary Hover**: `#059669` (Emerald-700) 
- **Secondary**: `#047857` (Emerald-800) - Acentos
- **Light**: `#D1FAE5` (Emerald-100) - Fondos suaves
- **Dark**: `#065F46` (Emerald-900) - Textos sobre fondos claros

### Estados
- **Success**: Verde `#10B981` + fondo `#D1FAE5`
- **Warning**: Ámbar `#F59E0B` + fondo `#FEF3C7`
- **Error**: Rojo `#EF4444` + fondo `#FEE2E2`

### Neutros
- **Fondo Principal**: `#ffffff` (Blanco)
- **Fondo Secundario**: `#F9FAFB` (Gray-50)
- **Texto Principal**: `#111827` (Gray-900)
- **Texto Secundario**: `#6B7280` (Gray-500)

---

## 🧩 Componentes Mejorados

### 1. **OlivoButton** (`/src/app/components/OlivoButton.tsx`)

**Variantes:**
- `primary` - Emerald sólido (default)
- `secondary` - Gris sólido
- `outline` - Borde Emerald
- `danger` - Rojo sólido
- `ghost` - Transparente con hover

**Tamaños:**
- `sm` - Compacto
- `md` - Estándar (default)
- `lg` - Grande

**Props:**
- `loading` - Muestra spinner animado
- `fullWidth` - Ocupa todo el ancho
- `disabled` - Estado deshabilitado

**Ejemplo:**
```tsx
<OlivoButton variant="primary" size="lg" loading={isLoading}>
  Comprar Ahora
</OlivoButton>
```

---

### 2. **OlivoInput** (`/src/app/components/OlivoInput.tsx`)

**Features:**
- Bordes redondeados (rounded-xl)
- Soporte para íconos a la izquierda
- Estados de error con mensaje
- Helper text opcional
- Focus ring en Emerald

**Props:**
- `label` - Etiqueta superior
- `error` - Mensaje de error (cambia a rojo)
- `helperText` - Texto de ayuda
- `icon` - Componente de ícono (izquierda)

**Ejemplo:**
```tsx
<OlivoInput
  label="Correo Electrónico"
  icon={<Mail className="size-5" />}
  error={errors.email}
  helperText="Nunca compartimos tu correo"
/>
```

---

### 3. **ProductCard** (`/src/app/components/ProductCard.tsx`)

**Mejoras Visuales:**
- Sombra sutil con hover elevado
- Ring en Emerald al hover
- Badges de "Destacado" y "Descuento"
- Badge de stock bajo (< 10 unidades)
- Imagen con zoom suave al hover
- Botón "Añadir" con animación de confirmación (✓)
- Selector de cantidad integrado (+/-)

**Animaciones:**
- Escala del botón al hacer clic
- Transición de "Añadir" → "✓ Añadido" con rebote
- Zoom de imagen (scale-105) al hover
- Sombra y ring animados

**Estados:**
- **Destacado**: Badge verde con estrella
- **Oferta**: Badge rojo con porcentaje de descuento
- **Stock Bajo**: Badge ámbar "Solo X"
- **Agotado**: Badge rojo + botón deshabilitado

**Ejemplo:**
```tsx
<ProductCard
  product={product}
  onAddToCart={(prod, qty) => addToCart(prod, qty)}
/>
```

---

## 🎭 Animaciones

### Transiciones Suaves
- Todos los botones: `transition-all duration-200`
- Cards: `transition-shadow duration-300`
- Imágenes: `transition-transform duration-500`

### Active States
- Botones: `active:scale-95` (feedback táctil)
- Cards: `hover:shadow-xl`

### Keyframes Personalizados
- `slideIn` - Entrada desde arriba
- `slideInFromRight` - Entrada desde derecha (Toast)
- `bounce` - Rebote (íconos de confirmación)

---

## 📐 Espaciado y Tipografía

### Radios de Bordes
- Componentes pequeños: `rounded-xl` (12px)
- Cards: `rounded-2xl` (16px)
- Badges: `rounded-full`

### Tamaños de Texto
- **Títulos Hero**: `text-4xl` → `text-6xl`
- **Títulos Sección**: `text-3xl`
- **Nombres Producto**: `text-base`
- **Precios**: `text-2xl` (bold)
- **Metadatos**: `text-xs` → `text-sm`

### Font Weights
- **Bold**: Títulos y precios
- **Semibold**: Botones y labels
- **Medium**: Subtítulos
- **Normal**: Texto body

---

## 🚀 Implementación en tu Proyecto Next.js

### Paso 1: Copiar Componentes
Copia estos archivos a tu proyecto:
- `/src/app/components/OlivoButton.tsx`
- `/src/app/components/OlivoInput.tsx`
- `/src/app/components/ProductCard.tsx`

### Paso 2: Actualizar theme.css
Reemplaza las variables CSS en tu `:root` con las del archivo `/src/styles/theme.css`:
```css
--color-brand-primary: #10B981;
--primary: #10B981;
--ring: #10B981;
```

### Paso 3: Reemplazar Componentes Antiguos
- Busca todos los `Button` → Reemplaza por `OlivoButton`
- Busca todos los `Input` → Reemplaza por `OlivoInput`
- Actualiza tus `ProductCard` existentes

### Paso 4: Actualizar Colores en Código
**Buscar y Reemplazar:**
- `bg-blue-600` → `bg-emerald-600`
- `text-blue-600` → `text-emerald-600`
- `border-blue-600` → `border-emerald-600`
- `ring-blue-500` → `ring-emerald-500`
- `focus:border-blue-500` → `focus:border-emerald-500`

---

## ✅ Checklist de Migración

### Componentes UI
- [ ] Migrar Button → OlivoButton
- [ ] Migrar Input → OlivoInput
- [ ] Actualizar ProductCard con nuevo diseño

### Colores
- [ ] Actualizar variables CSS en theme.css
- [ ] Reemplazar todos los `blue` por `emerald`
- [ ] Verificar hover states
- [ ] Verificar focus rings

### Animaciones
- [ ] Agregar `active:scale-95` a botones interactivos
- [ ] Implementar toast notifications con slideInFromRight
- [ ] Agregar transiciones suaves (duration-200/300)

### Páginas
- [ ] Home: Hero, Features, Products grid
- [ ] Catálogo: Filtros + grid de productos
- [ ] Detalle de Producto: Galería + info + relacionados
- [ ] Carrito: Lista + resumen sticky
- [ ] Admin: Mantener sidebar oscuro, actualizar tablas

---

## 🎯 Beneficios del Nuevo Diseño

1. **Identidad Visual Consistente**: Color Emerald en toda la app
2. **Mejor UX**: Animaciones fluidas y feedback inmediato
3. **Más Profesional**: Sombras, espaciados y tipografía mejorados
4. **Accesibilidad**: Focus rings visibles, contraste adecuado
5. **Moderno**: Rounded-xl/2xl, gradientes sutiles, microinteracciones

---

## 📞 Soporte

Si tienes dudas sobre la implementación:
1. Revisa los componentes de ejemplo en `/src/app/App.tsx`
2. Inspecciona los estilos en `/src/styles/theme.css`
3. Prueba cada componente en modo aislado

**Creado para OLIVOMARKET** 🇻🇪🇨🇱
