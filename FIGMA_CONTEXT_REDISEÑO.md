# Contexto para Rediseño en Figma (OLIVOMARKET)

## 1. Sistema de Diseño Actual (Emerald)
El proyecto ha migrado a un diseño basado en el color **Emerald** (`#10B981`) como primario, abandonando el azul.

**Variables CSS Globales:**
```css
:root {
  --color-primary: #10B981;    /* emerald-600 */
  --color-secondary: #047857;  /* emerald-800 */
  --color-accent: #059669;     /* emerald-700 */
  --color-background: #ffffff;
  --color-text: #111827;       /* gray-900 */
}
```

## 2. Páginas que Requieren Rediseño
El usuario indica que estas páginas no cumplen con la calidad visual del Home o el Catálogo de Productos.

### A. Categorías (`/categorias`)
**Estado Actual:** Grid simple de imágenes con overlay oscuro.
**Feedback Usuario:** "No me gusta".
**Código Actual:**
```tsx
// src/app/categorias/page.tsx
"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCategories } from "@/hooks/useCategories";

export default function CategoriesPage() {
  const { categories } = useCategories();
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Categorías</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link href={`/categorias/${category.slug}`} className="group overflow-hidden rounded-lg shadow-md relative h-64">
             <Image src={category.image} alt={category.name} fill className="object-cover group-hover:scale-110 transition-transform" />
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <h3 className="text-white text-2xl font-bold">{category.name}</h3>
             </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### B. Contacto (`/contacto`)
**Estado Actual:** Formulario funcional pero estéticamente plano. Cards de información genericas.
**Feedback Usuario:** "No me gusta".
**Código Actual:**
```tsx
// src/app/contacto/page.tsx
"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";

export default function ContactoPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacto</h1>
      
      {/* Botón WhatsApp */}
      <div className="mb-10 text-center">
        <button className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold flex items-center justify-center mx-auto shadow-lg">
          <MessageCircle className="w-6 h-6 mr-2" /> Chat WhatsApp
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold">Email</h3>
            <p className="text-gray-600">contacto@olivomarket.cl</p>
        </div>
        {/* ... más cards ... */}
      </div>

      {/* Formulario */}
      <form className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input className="w-full p-2 border rounded-md" />
        </div>
        {/* ... más inputs ... */}
        <button className="bg-blue-600 text-white px-5 py-2 rounded-md">Enviar</button>
      </form>
    </div>
  );
}
```
*Nota: El botón de enviar aún usa `bg-blue-600` en el código original.*

### C. Ofertas (`/ofertas`)
**Estado Actual:** Filtros básicos y cards de producto implementadas inline (duplicadas).
**Feedback Usuario:** "Se ve regular".
**Código Actual:**
```tsx
// src/app/ofertas/page.tsx
"use client";
import { useProducts } from "@/contexts/ProductContext";
// ... imports

export default function OfertasPage() {
  // ... lógica de filtros
  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Ofertas</h1>
      
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-8 grid grid-cols-3 gap-4">
        <select className="border p-2 rounded"><option>Categoría</option></select>
        <input className="border p-2 rounded col-span-2" placeholder="Buscar..." />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-6">
        {products.map(p => (
           <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* ... card inline ... */}
              <div className="p-4">
                  <h3 className="font-medium">{p.name}</h3>
                  <div className="text-blue-600 font-semibold">${p.price}</div>
                  <button className="w-full bg-emerald-600 text-white py-2 rounded">Agregar</button>
              </div>
           </div>
        ))}
      </div>
    </div>
  );
}
```

## 3. Requerimientos para Figma
*   **Categorías**: Necesitamos cards más atractivas, quizás con gradientes más sutiles o layouts asimétricos.
*   **Contacto**: El formulario debe sentirse integrado, quizás con un layout de lado a lado (info a la izquierda, form a la derecha) y inputs estilizados (`OlivoInput`).
*   **Ofertas**: 
    *   Mejorar la barra de filtros (que no parezca un formulario administrativo).
    *   Usar la `ProductCard` estándar pero quizás con un identificador visual extra de "Oferta".
