# Guía de Implementación Rápida - OLIVOMARKET

## 🎯 Cómo Aplicar las Mejoras a tu Proyecto

### 1️⃣ Reemplazo de Colores (Buscar y Reemplazar Global)

En tu editor (VS Code, etc.), usa "Find and Replace in Files":

#### Colores de Fondo
```
bg-blue-600     →  bg-emerald-600
bg-blue-700     →  bg-emerald-700
bg-blue-50      →  bg-emerald-50
bg-blue-100     →  bg-emerald-100
```

#### Colores de Texto
```
text-blue-600   →  text-emerald-600
text-blue-700   →  text-emerald-700
text-blue-500   →  text-emerald-500
```

#### Bordes
```
border-blue-600 →  border-emerald-600
border-blue-500 →  border-emerald-500
```

#### Focus y Ring
```
focus:ring-blue-500      →  focus:ring-emerald-500
focus:border-blue-500    →  focus:border-emerald-500
ring-blue-500           →  ring-emerald-500
```

---

## 2️⃣ Actualización de Componentes UI

### Button.tsx → OlivoButton.tsx

**ANTES:**
```tsx
import Button from "@/components/ui/Button";

<Button variant="primary" size="md">
  Comprar
</Button>
```

**DESPUÉS:**
```tsx
import OlivoButton from "@/components/OlivoButton";

<OlivoButton variant="primary" size="md">
  Comprar
</OlivoButton>
```

**Con loading state:**
```tsx
<OlivoButton variant="primary" loading={isSubmitting}>
  {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
</OlivoButton>
```

---

### Input.tsx → OlivoInput.tsx

**ANTES:**
```tsx
import Input from "@/components/ui/Input";

<Input
  label="Correo"
  error={errors.email?.message}
/>
```

**DESPUÉS:**
```tsx
import OlivoInput from "@/components/OlivoInput";
import { Mail } from "lucide-react";

<OlivoInput
  label="Correo Electrónico"
  error={errors.email?.message}
  icon={<Mail className="size-5" />}
  helperText="Nunca compartimos tu email"
/>
```

---

### ProductCard

**Actualiza tu ProductCard existente:**

```tsx
// /src/components/ProductCard.tsx
import ProductCard from "@/components/ProductCard"; // Importa el nuevo

// En tu página:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {products.map(product => (
    <ProductCard 
      key={product.id}
      product={product}
      onAddToCart={handleAddToCart}
    />
  ))}
</div>
```

---

## 3️⃣ Actualización de Páginas Específicas

### Home Page (`/src/app/page.tsx`)

**Hero Section - ANTES:**
```tsx
<section className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-amber-800">
  <div className="max-w-7xl mx-auto px-4 py-16">
    <h1 className="text-3xl font-bold">OLIVOMARKET</h1>
    <button className="bg-emerald-600 text-white px-4 py-2">
      Ver Productos
    </button>
  </div>
</section>
```

**DESPUÉS:**
```tsx
import OlivoButton from "@/components/OlivoButton";
import { ChevronRight } from "lucide-react";

<section className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-900">
  <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
    <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
      OLIVOMARKET
    </h1>
    <OlivoButton size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl">
      Ver Productos
      <ChevronRight className="size-5" />
    </OlivoButton>
  </div>
</section>
```

---

### Navbar (`/src/components/layout/Navbar.tsx`)

**Agrega animación al carrito:**

```tsx
import { ShoppingBag } from "lucide-react";

<button className="relative p-3 rounded-xl hover:bg-gray-100 transition-colors">
  <ShoppingBag className="size-6 text-gray-700" />
  {cartItemsCount > 0 && (
    <span className="absolute -top-1 -right-1 size-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
      {cartItemsCount}
    </span>
  )}
</button>
```

---

### Detalle de Producto (`/src/app/productos/[slug]/page.tsx`)

**Botón "Agregar al Carrito" mejorado:**

```tsx
import OlivoButton from "@/components/OlivoButton";
import { ShoppingCart, Heart } from "lucide-react";

<div className="flex gap-3">
  <OlivoButton 
    size="lg" 
    fullWidth 
    onClick={handleAddToCart}
    loading={isAdding}
  >
    <ShoppingCart className="size-5" />
    {isAdding ? 'Añadiendo...' : 'Añadir al Carrito'}
  </OlivoButton>
  
  <OlivoButton 
    variant="outline" 
    size="lg"
    onClick={handleToggleFavorite}
  >
    <Heart className={isFavorite ? "fill-emerald-600" : ""} />
  </OlivoButton>
</div>
```

**Badge de stock:**

```tsx
import Badge from "@/components/Badge";

{product.stock < 10 && (
  <Badge variant={product.stock === 0 ? 'error' : 'warning'}>
    {product.stock === 0 ? 'Agotado' : `Solo quedan ${product.stock}`}
  </Badge>
)}
```

---

### Carrito (`/src/app/carrito/page.tsx`)

**Resumen con nuevo estilo:**

```tsx
<div className="sticky top-20 rounded-2xl bg-white shadow-lg ring-1 ring-gray-200 p-6">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">
    Resumen de Compra
  </h2>
  
  <div className="space-y-3 mb-6">
    <div className="flex justify-between text-gray-600">
      <span>Subtotal</span>
      <span className="font-semibold">{formatCurrency(subtotal)}</span>
    </div>
    <div className="flex justify-between text-gray-600">
      <span>Envío</span>
      <span className="font-semibold">{formatCurrency(shipping)}</span>
    </div>
    <hr className="border-gray-200" />
    <div className="flex justify-between text-xl font-bold text-gray-900">
      <span>Total</span>
      <span className="text-emerald-600">{formatCurrency(total)}</span>
    </div>
  </div>
  
  <OlivoButton size="lg" fullWidth>
    Proceder al Pago
  </OlivoButton>
</div>
```

---

## 4️⃣ Animaciones y Transiciones

### Toast Notifications

```tsx
// Crear contexto de Toast o usar librería como sonner
import { toast } from "sonner"; // Ya está en tu package.json

// Al añadir al carrito:
toast.success('¡Producto añadido!', {
  description: `${product.name} × ${quantity}`,
  duration: 3000,
});

// En caso de error:
toast.error('No hay stock disponible', {
  description: 'Este producto está agotado',
});
```

### Botones con Feedback Táctil

Agrega `active:scale-95` a todos los botones interactivos:

```tsx
<button className="... active:scale-95 transition-transform">
  Click me
</button>
```

---

## 5️⃣ Área Admin

### Mantener el sidebar oscuro pero usar Emerald para elementos activos

**Sidebar Navigation - ANTES:**
```tsx
<button className={`... ${isActive ? 'bg-blue-600' : ''}`}>
  Dashboard
</button>
```

**DESPUÉS:**
```tsx
<button className={`... ${isActive ? 'bg-emerald-600' : ''}`}>
  Dashboard
</button>
```

### Tabla de Productos Admin

**Badge de stock:**
```tsx
import Badge from "@/components/Badge";

<td>
  {product.stock < 10 ? (
    <Badge variant={product.stock === 0 ? 'error' : 'warning'}>
      {product.stock} unidades
    </Badge>
  ) : (
    <Badge variant="success">
      {product.stock} unidades
    </Badge>
  )}
</td>
```

**Toggle Destacado:**
```tsx
<button
  onClick={() => toggleFeatured(product.id)}
  className={`p-2 rounded-lg transition-colors ${
    product.featured 
      ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
  }`}
>
  <Star className={product.featured ? "fill-emerald-600" : ""} />
</button>
```

---

## 6️⃣ Formularios (Checkout, Login, etc.)

### Formulario de Login mejorado

```tsx
import OlivoInput from "@/components/OlivoInput";
import OlivoButton from "@/components/OlivoButton";
import { Mail, Lock } from "lucide-react";

<form onSubmit={handleSubmit} className="space-y-4">
  <OlivoInput
    label="Correo Electrónico"
    type="email"
    icon={<Mail className="size-5" />}
    error={errors.email}
    {...register('email')}
  />
  
  <OlivoInput
    label="Contraseña"
    type="password"
    icon={<Lock className="size-5" />}
    error={errors.password}
    {...register('password')}
  />
  
  <OlivoButton 
    type="submit" 
    size="lg" 
    fullWidth 
    loading={isSubmitting}
  >
    Iniciar Sesión
  </OlivoButton>
</form>
```

---

## 7️⃣ Categorías

### Grid de Categorías en Home

```tsx
import CategoryCard from "@/components/CategoryCard";

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {categories.map(category => (
    <CategoryCard
      key={category.id}
      category={category}
      onClick={() => router.push(`/categorias/${category.slug}`)}
    />
  ))}
</div>
```

---

## ✅ Checklist Final

Después de implementar todo, verifica:

- [ ] Todos los botones son `OlivoButton` con variante `primary` (Emerald)
- [ ] Todos los inputs tienen bordes redondeados (`rounded-xl`)
- [ ] No quedan referencias a `blue-600/700` en botones principales
- [ ] Las cards tienen `hover:shadow-xl` y `transition-all`
- [ ] Los badges de stock usan colores semánticos
- [ ] El carrito muestra un badge con cantidad
- [ ] Los formularios tienen feedback visual (loading, error)
- [ ] Las animaciones son suaves (duration-200/300)
- [ ] Los íconos de Lucide están importados correctamente

---

## 🚀 Deploy

Una vez implementado:

1. **Prueba local**: `npm run dev`
2. **Build**: `npm run build`
3. **Deploy a Vercel**: `vercel --prod`

---

## 📸 Antes y Después

### Antes
- ❌ Mezcla de Emerald y Blue
- ❌ Botones planos sin sombra
- ❌ Inputs con bordes cuadrados
- ❌ Cards sin hover effects
- ❌ Sin animaciones

### Después
- ✅ Color Emerald unificado
- ✅ Botones con sombra y hover
- ✅ Inputs redondeados con íconos
- ✅ Cards interactivas con animaciones
- ✅ Feedback visual en todas las acciones

---

**¿Necesitas ayuda?** Revisa el archivo `/OLIVOMARKET_DESIGN_SYSTEM.md` para más detalles.
