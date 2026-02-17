# Cómo Integrar los Componentes Mejorados en tu Proyecto Next.js

## 📦 Componentes Creados

He creado los siguientes componentes con el nuevo diseño de OLIVOMARKET:

### Componentes UI Base:
- ✅ **OlivoButton** - `/src/app/components/OlivoButton.tsx`
- ✅ **OlivoInput** - `/src/app/components/OlivoInput.tsx`
- ✅ **Badge** - `/src/app/components/Badge.tsx`
- ✅ **ProductCard** - `/src/app/components/ProductCard.tsx`
- ✅ **CategoryCard** - `/src/app/components/CategoryCard.tsx`

### Componentes de Layout:
- ✅ **Navbar** - `/src/app/components/Navbar.tsx`

### Páginas de Ejemplo:
- ✅ **CategoriasPage** - `/src/app/pages/CategoriasPage.tsx`
- ✅ **ContactoPage** - `/src/app/pages/ContactoPage.tsx`
- ✅ **ProductosPage** - `/src/app/pages/ProductosPage.tsx`

---

## 🚀 Paso a Paso para Integrar en tu Proyecto

### 1. **Copiar el Sistema de Diseño**

Copia el contenido actualizado de `/src/styles/theme.css` a tu proyecto. Las variables importantes son:

```css
:root {
  --color-brand-primary: #10B981;
  --primary: #10B981;
  --ring: #10B981;
  --color-success: #10B981;
  /* ... resto de variables */
}
```

### 2. **Actualizar el Navbar**

En tu proyecto Next.js (`/src/components/layout/Navbar.tsx`):

```tsx
import Navbar from "@/app/components/Navbar";

// En tu layout o página:
<Navbar 
  cartItemsCount={totalCartItems}
  user={session?.user}
  onLogout={handleLogout}
/>
```

**Props del Navbar:**
- `cartItemsCount` - Número de items en el carrito
- `user` - Objeto del usuario logueado (opcional)
- `onLogout` - Función para cerrar sesión (opcional)

---

### 3. **Reemplazar Componentes de Productos**

#### ProductCard Mejorado:

**Archivo Original:** `/src/components/ProductCard.tsx`

**Nuevo Archivo:** Copia `/src/app/components/ProductCard.tsx` a tu proyecto

**Uso:**
```tsx
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/contexts/CartContext";

// En tu componente:
const { addToCart } = useCart();

<ProductCard 
  product={product}
  onAddToCart={(product, qty) => addToCart(product, qty)}
/>
```

**Diferencias clave:**
- ✅ Badges de "Destacado" y "Descuento"
- ✅ Badge de stock bajo
- ✅ Animación al añadir (✓ Añadido)
- ✅ Hover effects mejorados
- ✅ Colores Emerald unificados

---

### 4. **Actualizar Página de Categorías**

**Archivo Original:** `/src/app/categorias/page.tsx`

**Referencia:** `/src/app/pages/CategoriasPage.tsx`

**Cambios principales:**

```tsx
import CategoryCard from "@/components/CategoryCard";

// Grid de categorías:
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {categories.map((category) => (
    <CategoryCard
      key={category.id}
      category={category}
      onClick={() => router.push(`/categorias/${category.slug}`)}
    />
  ))}
</div>
```

**Características:**
- Vista de cuadrícula con overlay gradient
- Contador de productos por categoría
- Hover effects con traducción
- Modo lista alternativo (toggle)

---

### 5. **Actualizar Página de Contacto**

**Archivo Original:** `/src/app/contacto/page.tsx`

**Referencia:** `/src/app/pages/ContactoPage.tsx`

**Estructura:**

```tsx
import OlivoButton from "@/components/OlivoButton";
import OlivoInput from "@/components/OlivoInput";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

// Botón WhatsApp destacado:
<button
  onClick={openWhatsApp}
  className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
>
  <MessageCircle className="size-6" />
  Chatea con nosotros por WhatsApp
</button>

// Formulario:
<OlivoInput
  label="Nombre Completo"
  icon={<User className="size-5" />}
  required
/>

<OlivoButton type="submit" size="lg" fullWidth loading={isSubmitting}>
  <Send className="size-5" />
  Enviar Mensaje
</OlivoButton>
```

---

### 6. **Actualizar Página de Productos**

**Archivo Original:** `/src/app/productos/page.tsx`

**Referencia:** `/src/app/pages/ProductosPage.tsx`

**Características:**

```tsx
// Barra de búsqueda y filtros:
<OlivoInput
  placeholder="Buscar productos..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  icon={<Search className="size-5" />}
/>

// Filtros de categoría (chips):
<button
  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
    selectedCategory === category
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  {category}
</button>

// Grid de productos:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {products.map(product => (
    <ProductCard key={product.id} product={product} onAddToCart={handleAdd} />
  ))}
</div>
```

---

## 🔧 Integración con tu Contexto Existente

### CartContext:

```tsx
// Tu código existente:
import { useCart } from "@/contexts/CartContext";

const { addToCart, cartItems } = useCart();

// Pasar a ProductCard:
<ProductCard 
  product={product}
  onAddToCart={(product, qty) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.sale_price || product.price,
      image: product.image,
      slug: product.slug,
    }, qty);
    showToast(`¡${product.name} añadido!`, 'success');
  }}
/>
```

### ToastContext (o Sonner):

```tsx
// Opción 1: Con tu ToastContext
import { useToast } from "@/contexts/ToastContext";
const { showToast } = useToast();

// Opción 2: Con Sonner (ya está en tu package.json)
import { toast } from "sonner";

// Al añadir al carrito:
toast.success('¡Producto añadido!', {
  description: `${product.name} × ${quantity}`,
  duration: 3000,
});
```

---

## 📱 Responsive Design

Todos los componentes están optimizados para mobile-first:

### Breakpoints usados:
- **sm:** 640px - 2 columnas
- **md:** 768px - 3 columnas
- **lg:** 1024px - 4 columnas
- **xl:** 1280px - 4-6 columnas

### Navbar Móvil:
- Hamburger menu en mobile
- Menú desplegable con animación
- Usuario y carrito siempre visibles

---

## 🎨 Personalización de Colores

Si quieres cambiar el color primario de Emerald a otro:

```css
/* En /src/styles/theme.css */
:root {
  /* Cambia estos valores: */
  --color-brand-primary: #10B981; /* Tu color */
  --primary: #10B981;
  --ring: #10B981;
}
```

Luego busca y reemplaza en los componentes:
- `bg-emerald-600` → `bg-[tu-color]-600`
- `text-emerald-600` → `text-[tu-color]-600`
- etc.

---

## ✅ Checklist de Integración

### Componentes UI:
- [ ] Copiar `OlivoButton.tsx` a `/src/components/`
- [ ] Copiar `OlivoInput.tsx` a `/src/components/`
- [ ] Copiar `Badge.tsx` a `/src/components/`
- [ ] Copiar `ProductCard.tsx` (reemplazar existente)
- [ ] Copiar `CategoryCard.tsx` a `/src/components/`

### Layout:
- [ ] Copiar `Navbar.tsx` (reemplazar existente en `/src/components/layout/`)
- [ ] Actualizar imports en `/src/app/layout.tsx`

### Páginas:
- [ ] Actualizar `/src/app/categorias/page.tsx` con nueva estructura
- [ ] Actualizar `/src/app/contacto/page.tsx` con formulario mejorado
- [ ] Actualizar `/src/app/productos/page.tsx` con filtros mejorados

### Estilos:
- [ ] Actualizar `/src/styles/theme.css` con nuevas variables
- [ ] Verificar que Tailwind CSS v4 esté configurado
- [ ] Probar responsive en diferentes dispositivos

### Funcionalidad:
- [ ] Conectar ProductCard con CartContext
- [ ] Conectar formulario de contacto con API
- [ ] Probar navegación entre páginas
- [ ] Verificar que el carrito muestre cantidad correcta

---

## 🐛 Solución de Problemas Comunes

### 1. "Cannot find module '@/components/...'"

**Solución:** Verifica tu `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 2. Los colores Emerald no se aplican

**Solución:** 
1. Verifica que `/src/styles/theme.css` esté importado en tu layout
2. Ejecuta `npm run dev` para regenerar el build de Tailwind

### 3. El Navbar no muestra el usuario

**Solución:** Pasa el objeto `user` desde tu sesión de NextAuth:
```tsx
import { useSession } from "next-auth/react";

const { data: session } = useSession();

<Navbar user={session?.user} />
```

### 4. Las imágenes de productos no cargan

**Solución:** Verifica que `ImageWithFallback` esté importado correctamente:
```tsx
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
```

---

## 📞 Soporte

Si encuentras algún problema durante la integración:

1. Revisa los ejemplos en `/src/app/App.tsx`
2. Consulta el sistema de diseño en `/OLIVOMARKET_DESIGN_SYSTEM.md`
3. Verifica la guía de implementación en `/GUIA_IMPLEMENTACION.md`

**Recuerda:** Todos los componentes están diseñados para ser modulares y fáciles de integrar con tu código existente.

---

**¡Éxito con la implementación!** 🎉🛒
