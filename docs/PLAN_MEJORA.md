# Plan de Limpieza, Corrección y Mejora — OlivoWeb

> Basado en una auditoría exhaustiva del proyecto (junio 2026): seguridad, rendimiento,
> diseño/UX, funcionalidad e higiene de código. Estado verificado: TypeScript compila sin
> errores, ESLint 0 errores / 54 warnings, **5 de 25 tests fallan** (CartContext, Navbar,
> checkout-integration).

---

## Resumen ejecutivo

| Pilar | Estado | Hallazgos clave |
|---|---|---|
| 🔒 Seguridad | **Crítico** | 17 hallazgos (5 críticos): webhook MercadoPago sin firma, `/api/sales` sin auth, email admin hardcodeado |
| ⚡ Velocidad | Alto | ~900KB de bundle recortables, APIs sin paginación ni caché, páginas admin de 2.600 líneas |
| 🎨 Diseño | Medio | Dark mode instalado pero no conectado, colores hardcodeados, accesibilidad incompleta, SEO faltante en páginas clave |
| ⚙️ Funcionalidad | Medio | Suite de tests rota, validación de formularios inconsistente, Uber Eats a medio implementar |
| 🧹 Limpieza (transversal) | Medio | 11+ archivos basura en raíz, scripts incompletos, cliente Supabase duplicado, 389 `console.log` |

---

## FASE 0 — Limpieza inmediata (½ día, sin riesgo)

Prerrequisito de todo lo demás: deja el repo limpio para que los cambios siguientes sean legibles.

1. **Borrar archivos basura de la raíz**: `lint_output.txt`, `ts_errors.txt`, `ts_errors.log`, `tsc.log`, `tsc_output.txt`, `tmp_checkout.html`.
2. **Mover `SQL_UBER_EATS_PRODUCTS_TABLE.sql`** a `supabase/migrations/` (o borrarlo si ya está aplicado).
3. **Borrar** `docs/legacy_sql_attempts/`, `scripts/run-product-migration.js`, `scripts/run-settings-migration.js` (scripts incompletos que solo imprimen SQL).
4. **Eliminar duplicado** `src/lib/supabaseAdmin.ts` → consolidar en `src/lib/supabase-server.ts`.
5. **Desinstalar dependencias sin uso**: `embla-carousel-react`, `vaul`, `cmdk`, `input-otp`, `react-resizable-panels`, `canvg`, `axios` (1 solo uso → migrar a `fetch`). Decidir entre `@headlessui/react` y Radix (quedarse con Radix).
6. **Ignorar o borrar `.vscode/`**; verificar `.gitignore`.
7. **Limpiar 54 warnings de ESLint** (variables sin usar, directivas disable innecesarias).

---

## PILAR 1 — 🔒 Seguridad

### P1.1 Críticos — esta semana

| # | Problema | Archivo | Acción |
|---|---|---|---|
| 1 | Webhook MercadoPago **sin verificación de firma**: cualquiera puede marcar pedidos como pagados | `src/app/api/payments/webhook/route.ts` | Verificar firma HMAC-SHA256 con el secret de MP; rechazar requests sin firma válida |
| 2 | `/api/sales` GET **sin autenticación**: expone todas las ventas y pagos | `src/app/api/sales/route.ts` | Añadir `requireApiAdminOrSeller()` |
| 3 | `/api/sales/[id]` GET/PATCH sin auth: permite **modificar ventas** | `src/app/api/sales/[id]/route.ts` | Añadir auth a ambos métodos |
| 4 | Email admin **hardcodeado** como fallback de OAuth (elevación a ADMIN) | `src/config/auth.config.ts:16` | Eliminar fallback; exigir `GOOGLE_ADMIN_EMAILS` por env |
| 5 | Bootstrap de admin reutilizable y sin rate limit | `src/app/api/admin/bootstrap/route.ts` | Deshabilitar tras crear el primer admin; comparación constant-time |

### P1.2 Altos — este mes

6. **Checkout confía en valores del cliente**: `shippingCost`, `discountApplied`, `loyaltyRedeemed` llegan del navegador (`src/app/api/checkout/create-order/route.ts`). Recalcular TODO el total en servidor (tarifas de envío, cupones, puntos).
7. **Validación Zod en rutas admin** (ej. `bulk-update` acepta cualquier tipo/valor).
8. **`/api/sellers` expone emails y roles** sin auth → añadir auth o devolver solo `{id, name}`.
9. **Eliminar `/api/payments/test`** (filtra prefijo/sufijo del token de MP).
10. **Rate limiting** en `/api/auth/register` y endpoints de login (Upstash Ratelimit o similar).
11. **Cron `auto-close-shifts`**: si `CRON_SECRET` no está definido, el endpoint queda abierto → exigirlo siempre.

### P1.3 Medios

12. Cabeceras de seguridad en `next.config.ts`: CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS.
13. Políticas RLS explícitas de INSERT/UPDATE/DELETE en `orders` y tablas sensibles.
14. Auditoría/logging de eventos sensibles (cambios de pedidos, webhooks, creación de admins).
15. Mensajes de error genéricos al cliente (hoy se filtra `err.cause` de MercadoPago).

---

## PILAR 2 — ⚡ Velocidad

### P2.1 Quick wins (1 día, ~900KB menos de bundle)

1. **Imports dinámicos** para librerías pesadas:
   - `src/lib/exportUtils.ts` (xlsx + jspdf + autotable, ~500KB) → `await import()` dentro de las funciones de exportar.
   - `html5-qrcode` (~200KB) en `useBarcodeStream.ts` → import dinámico al activar el escáner.
   - `recharts` (~300KB) en `AdminAnalytics` → ya hay `next/dynamic` parcial, completarlo.
2. **Desinstalar dependencias muertas** (ver Fase 0).
3. Reemplazar `<img>` por `next/image` en los 9 puntos señalados por ESLint.

### P2.2 Datos y caché (2–3 días)

4. **Paginación** en APIs que devuelven datasets completos: `api/products` (limit 1000 sin range), `api/admin/orders` (sin límite), `api/categories` (lee todos los productos para contar categorías → query agregada).
5. **Estrategia de caché por ruta**: `revalidate` en datos semi-estáticos (productos, categorías, settings) en vez de cero-caché por defecto; quitar `force-dynamic` donde no aplica.
6. **Adoptar `@tanstack/react-query`** (ya instalado, nunca usado) para deduplicación y revalidación en cliente, reemplazando los `useEffect + fetch` manuales.

### P2.3 Arquitectura (1–2 semanas, incremental)

7. **Dividir páginas admin monolíticas**: `admin/uber-eats` (2.605 líneas), `edicion-masiva` (1.459), `proveedores` (1.388), `configuracion` (1.162) → componentes por sección + carga diferida por tab.
8. **Reducir `"use client"`** (hoy 129 archivos, ~68%): mover data-fetching a Server Components en páginas de catálogo/producto; dejar interactividad en islas cliente.
9. **Optimizar contextos**: `ProductContext` carga 1.000 productos al montar y `CartContext` re-renderiza toda la app → dividir contexto (estado/acciones), memoizar, y cargar productos bajo demanda.
10. Añadir `Suspense`/streaming y `loading.tsx` en rutas principales (cruza con Diseño).

**Impacto estimado**: bundle −40/50%, FCP −1–2s, TTI −2–5s, −60% de queries a Supabase.

---

## PILAR 3 — 🎨 Diseño / UX

### P3.1 Sistema de diseño (3–4 días)

1. **Decidir el dark mode**: `next-themes` está instalado pero jamás conectado (no hay ThemeProvider ni clases `dark:`). O se conecta de verdad, o se elimina la dependencia y el campo `theme` de settings. Recomendación: eliminarlo ahora y planificarlo como feature.
2. **Tokens de color**: hoy conviven variables CSS en `globals.css` (no usadas) y clases hardcodeadas (`emerald-600`, `gray-900`...). Consolidar en el theme de Tailwind v4 y migrar componentes gradualmente, empezando por `components/ui/`.
3. **Estados de carga/vacío/error**:
   - Añadir `loading.tsx` (skeletons) en rutas principales — hoy no existe ninguno.
   - Empty states para carrito vacío, sin pedidos, búsqueda sin resultados.
   - Toasts de error en fetches que hoy fallan en silencio (`.catch(console.error)` en `mi-cuenta/pedidos`, `ShippingForm`, etc.).

### P3.2 Accesibilidad (2 días)

4. `aria-label` en todos los botones de solo ícono (ProductCard +/-/basura, acciones de admin).
5. `aria-invalid` y mensajes asociados en `ui/Input.tsx`; labels en inputs crudos de `admin/caja`.
6. Touch targets ≥44px en móvil (botones `size-8` de ProductCard).

### P3.3 Responsive y SEO (2 días)

7. Corregir divs decorativos de 700px en `src/app/page.tsx` que causan overflow horizontal en móvil.
8. **`generateMetadata` en `/productos/[slug]`** (hoy las páginas de producto no tienen metadata) + Open Graph por producto.
9. **Sitemap dinámico**: incluir productos, categorías y páginas estáticas (hoy solo tiene 3 URLs).
10. JSON-LD (Product, Organization, BreadcrumbList) para rich snippets.

---

## PILAR 4 — ⚙️ Funcionalidad

### P4.1 Corregir lo roto (2–3 días)

1. **Arreglar los 5 tests que fallan** (`CartContext`, `Navbar`, `checkout-integration`) — la suite es la red de seguridad del resto del plan; debe estar verde antes de refactorizar.
2. **Unificar validación de formularios**: login, registro y **checkout** usan estado manual sin validación estructurada, mientras productos/ventas usan react-hook-form + Zod. Migrar checkout primero (es el flujo de dinero), luego login/registro. Crear schemas en `src/schemas/`.
3. Resolver TODOs funcionales: dropdown de categorías en `EditProductForm`, métricas reales en `dashboard/pedidos`, llave primaria en `products.service.ts`.

### P4.2 Decidir y completar features a medias (1 semana)

4. **Uber Eats**: la UI existe (clasificación, mapeo, imágenes) pero no hay integración real con la API de Uber Eats. Decidir: completar la integración o congelar la feature. En cualquier caso, refactorizar el componente de 2.605 líneas (cruza con P2.3).
5. **i18n**: el setting `language` se guarda pero nunca se usa. Eliminar el campo o implementar i18n de verdad. Recomendación: eliminar por ahora (la app es 100% español).
6. **Logger consistente**: migrar los 389 `console.log` a `src/utils/logger.ts` (ya existe), empezando por `server/` y `services/`.
7. Reducir `any` (304 usos): tipar sesión de NextAuth con module augmentation y generar tipos de Supabase (`supabase gen types`).

### P4.3 Robustez (continuo)

8. Subir cobertura de tests del ~7% actual: priorizar checkout end-to-end, webhook de pagos y servicios de ventas.
9. Manejo de errores consistente en API routes (helper `api-response` ya existe — usarlo en todas).

---

## Orden de ejecución recomendado

| Sprint | Contenido | Resultado |
|---|---|---|
| **0** (½ día) | Fase 0 completa (limpieza) | Repo limpio, −150KB bundle |
| **1** (1 semana) | P1.1 + P1.2 (seguridad crítica/alta) + P4.1.1 (tests verdes) | Sin agujeros de pago/datos; CI verde |
| **2** (1 semana) | P2.1 + P2.2 (bundle, paginación, caché) + P3.3 (SEO) | App notablemente más rápida e indexable |
| **3** (1–2 semanas) | P3.1 + P3.2 (design system, estados, a11y) + P4.1.2 (validación checkout) | UX consistente y accesible |
| **4** (continuo) | P2.3 (arquitectura), P4.2/P4.3 (features, tipos, tests) | Mantenibilidad a largo plazo |

**Criterio transversal**: ningún refactor grande (sprints 2–4) se mezcla con los fixes de seguridad del sprint 1; commits pequeños y atómicos por hallazgo.
