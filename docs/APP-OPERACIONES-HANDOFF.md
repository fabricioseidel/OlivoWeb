# Traspaso: app dedicada de operaciones — Olivo Market

Documento de contexto para construir, **en un repositorio nuevo**, una aplicación
dedicada a las operaciones del minimarket (venta, recepción, inventario y caja),
reutilizando lo que ya existe en `fabricioseidel/OlivoWeb`.

Está escrito para que una sesión sin historial previo pueda arrancar sin
adivinar nada. Todo lo que aquí se afirma fue verificado contra el código y la
base de datos reales.

---

## 1. Por qué se hace un repo nuevo

Hoy la app Android es un **cascarón Capacitor que apunta a una URL remota**
(`capacitor.config.ts` → `server.url`). Es decir: un navegador sin barra de
direcciones mostrando el sitio en vivo. Eso tiene defectos que no se arreglan
optimizando el sitio:

| Defecto | Consecuencia en el mostrador |
|---|---|
| **Sin conexión no hay app** | Si se cae internet, no se puede vender. Nada está en el dispositivo. |
| **La sesión vive en cookies del WebView** | Android puede limpiarlas; el vendedor queda deslogueado a mitad de turno. |
| **Acoplada al deploy del sitio** | Un despliegue de la tienda (o un error en una landing de SEO) puede tumbar el POS. |
| **Arrastra la app completa** | Aunque se mitigó con carga perezosa, sigue descargando el bundle de un sitio de e-commerce para mostrar una caja. |
| **Cámara vía WebView** | El escaneo usa `getUserMedia` + `html5-qrcode`. Funciona, pero es más lento y frágil que un lector nativo. Ya hubo un bug por falta del permiso `CAMERA` en el manifiesto. |
| **Firma del APK** | Hubo un problema de builds con certificados distintos que impedían actualizar la app; se resolvió fijando un keystore, pero muestra lo frágil de la cadena. |

**Lo importante:** la base de datos **ya está preparada para una app offline**.
La tabla `sales` tiene `client_sale_id` y `device_id`, y la función `apply_sale`
los recibe — o sea, la creación de ventas es **idempotente por diseño**: el
dispositivo puede generar el ID, encolar la venta sin conexión y reintentar sin
duplicar. Eso no se está aprovechando hoy.

---

## 2. Contexto de negocio

**Olivo Market** son dos negocios en una dirección:

1. **Minimarket** de productos venezolanos (venta presencial + online).
2. **Punto de paquetería**: MercadoLibre, Chilexpress, Bluexpress y Correos de Chile.

```
Nombre:     Olivo Market
Razón:      Inversiones El Olivo SpA
Dirección:  Av. José Pedro Alessandri 2010, Local A, Ñuñoa, Región Metropolitana, Chile
Teléfono:   +56 9 2063 9745  (E.164: +56920639745)
Email:      olivomarket1@gmail.com
Horario:    L-V 07:45–20:30 · Sáb y Dom 10:00–18:00
```

> Estos datos viven en `src/lib/seo/business.ts` como fuente única. La app de
> operaciones puede copiar ese archivo tal cual: es un objeto sin dependencias.

---

## 3. Qué hace la app de operaciones

Cinco modos, hoy en pestañas (`src/components/admin/operaciones/OperacionesApp.tsx`):

| Modo | Archivo actual | Qué hace |
|---|---|---|
| **Venta** | `SaleMode.tsx` | POS: buscar/escanear productos, carrito, pago mixto, compra propia |
| **Recepción** | `ReceptionMode.tsx` | Recibir mercadería de proveedores |
| **Inventario** | `InventarioMode.tsx` | Verificar catálogo por escaneo (activa productos) |
| **Caja** | `CajaMode.tsx` | Abrir turno, movimientos de efectivo |
| **Cierre** | `CloseMode.tsx` | Arqueo por método de pago y cierre de turno |

**Fuera de alcance para esta app** (queda en el sitio web): catálogo público,
checkout online, marketing, SEO, configuración de la tienda.

---

## 4. Reglas de negocio — leer antes de programar

Estas reglas se implementaron con razones concretas. Romperlas reintroduce
problemas ya resueltos.

### 4.1 Caja obligatoria
- **Ninguna venta se registra sin un turno de caja abierto. Sin excepciones**, tampoco para ADMIN.
- Se valida **en el servidor**, no sólo en la UI: bloquear la pantalla no impide que una venta entre por otra vía.
- Implementación de referencia: `src/actions/sales.ts` (busca `cash_shifts` con `status='OPEN'` y aborta si no hay).

### 4.2 Métodos de pago unificados
- El POS ofrece **sólo tres**: `CASH`, `CARD`, `TRANSFER`.
- **No separar débito / crédito / prepago.** El sistema de pago del local no los distingue: todo pago con tarjeta llega al mismo extracto bancario. Separarlos generaba descuadres imposibles de conciliar.
- Los valores `DEBIT`, `CREDIT` y `WALLET` existen en el enum sólo por registros históricos; ya fueron migrados a `CARD`.
- Referencia: `src/lib/pos/payments.ts` (copiable tal cual, sin dependencias).

### 4.3 Compra de personal
- Botón que aplica **25% de descuento** sobre el precio de venta, asociado al vendedor autenticado.
- El descuento **se recalcula al cambiar el carrito** (sigue siendo 25% del total vigente, no un monto congelado).
- **Se bloquea si ya hay un cupón aplicado**: dos descuentos encimados dan un precio que nadie sabe explicar después.
- Puede pagarse en el momento (método normal) o quedar **por cobrar** → método `STAFF_CREDIT`, que **no suma al arqueo de caja**. Sin esto, el cajero cierra con faltante cada vez que un vendedor se lleva algo.
- Se guarda `staff_discount_rate` en la venta: si el porcentaje cambia, las ventas antiguas conservan el suyo.
- Liquidación mensual: `/admin/compras-personal` — agrupa deuda por vendedor, sólo ADMIN puede marcar como descontado, y filtra por `staff_settled_at IS NULL` para no re-liquidar.
- **Pendiente sugerido, no implementado:** tope mensual por vendedor. Sin él, la deuda puede superar lo descontable del sueldo.

### 4.4 Verificación de inventario
- Regla única: **un producto está activo si fue verificado (escaneado) alguna vez.**
- Por eso no hace falta lógica por sesión: la primera pasada deja activo sólo lo escaneado; las siguientes suman sin apagar lo ya verificado, porque el conjunto verificado es acumulativo.
- `products.verified_at` tiene **`DEFAULT now()`**: un producto creado desde el admin nace verificado, así una purga posterior no lo apaga sin que nadie lo decidiera.
- Flujo del escaneo: código → si no existe, buscar por nombre (incluye inactivos) → si tampoco, crear.
- El **cierre de inventario** (desactivar lo nunca verificado) es una acción aparte, sólo ADMIN, con confirmación. El servidor compara la cuenta esperada contra la real y **aborta con 409** si cambió mientras se confirmaba (evita apagar de más si alguien sigue escaneando desde otro teléfono).

### 4.5 Despacho propio (contexto, vive en el sitio web)
- Tope de **$1.500** para Ñuñoa y Macul; **envío gratis sobre $35.000** en las comunas con cobertura.
- Ventana de entrega 08:00–14:00; corte a las 08:00 para el mismo día.
- Referencia: `src/lib/shipping-policy.ts` (15 tests).

---

## 5. Base de datos (Supabase / PostgreSQL)

Proyecto Supabase: `nuuoooqfbuwodagvmmsf`.
**La app nueva usa la misma base** — no se migra nada.

### 5.1 Tablas centrales

**`products`** (PK `id bigint`, pero el **identificador de negocio es `barcode text`**)
```
barcode, name, category, purchase_price, sale_price, offer_price, suggested_price,
stock numeric, min_stock, optimum_stock, reorder_threshold,
is_active bool, featured bool, by_weight bool, promo_1000 bool,
image_url, gallery jsonb, description, features jsonb,
measurement_unit, measurement_value, expiry_date,
verified_at timestamptz DEFAULT now(), verified_by text,
created_at, updated_at
```
> Ojo: las relaciones apuntan a `barcode`, no a `id`. Existe un RPC
> `rename_product_barcode(p_old_barcode, p_new_barcode)` que renombra en todas
> las tablas dependientes de forma atómica.

**`sales`**
```
id bigint, ts, total, payment_method text (legacy), cash_received, change_given,
discount, tax, notes, voided bool, device_id, client_sale_id,
seller_id uuid, seller_name, items jsonb, shift_id uuid, branch_id uuid,
transfer_receipt_uri, transfer_receipt_name, transfer_status,
is_staff_purchase bool DEFAULT false, staff_settled_at timestamptz,
staff_discount_rate numeric
```

**`sale_items`**: `sale_id`, `product_barcode`, `product_name`, `quantity`, `unit_price`, `subtotal`, `discount`

**`sale_payments`**: `sale_id`, `method payment_method`, `amount`, `reference` — permite **pago mixto** (varias filas por venta).

**`cash_shifts`**
```
id uuid, seller_id, user_id, started_at, ended_at,
starting_cash, expected_cash, actual_cash, difference,
status shift_status, notes, branch_id, auto_close_at, closed_by_method jsonb
```

**`cash_movements`**: `shift_id`, `type` (IN/OUT), `amount`, `reason`, `created_at`

**`settings`**: fila única (`id = true`) con toda la configuración de la tienda
(tarifas de despacho, datos de contacto, bloques de la portada, etc.).

### 5.2 Enums
```sql
payment_method: CASH | CARD | TRANSFER | STAFF_CREDIT | DEBIT | CREDIT | WALLET | OTHER
                (los últimos cuatro sólo por histórico)
shift_status:   OPEN | CLOSED
```

### 5.3 RPC `apply_sale` — el corazón del POS

```sql
apply_sale(
  p_total numeric, p_payment_method text, p_cash_received numeric,
  p_change_given numeric, p_discount numeric, p_tax numeric,
  p_notes text, p_device_id text, p_client_sale_id text,
  p_items jsonb, p_timestamp timestamptz, p_seller_name text,
  p_transfer_receipt_uri text, p_transfer_receipt_name text,
  p_branch_id uuid, p_payments jsonb, p_shift_id uuid
) RETURNS bigint  -- id de la venta
```

Registra la venta, sus ítems, sus pagos **y descuenta el stock**, todo en una
transacción. Usar **siempre** esta función, nunca INSERT sueltos.

> `p_client_sale_id` + `p_device_id` son la base para una cola offline
> idempotente. Hay tres sobrecargas de `apply_sale` por evolución histórica;
> usar la de **17 argumentos** (la que incluye `p_payments` y `p_shift_id`).

`seller_id`, `is_staff_purchase` y `staff_discount_rate` se marcan con un UPDATE
posterior sobre `sales` (ver `src/server/sales.service.ts`), para no tocar la RPC
que comparte el POS.

---

## 6. Autenticación

- **NextAuth v4**, provider **Credentials** (email + contraseña), `bcryptjs`, estrategia **JWT**.
- Usuarios en la tabla `users` de Supabase, con campo `role`.
- Roles: `USER` (cliente), `SELLER` (vendedor), `ADMIN`.
- La app de operaciones exige **ADMIN o SELLER**.
- Protección de rutas: `src/middleware.ts` (matcher cubre `/admin/*`, `/operaciones/*`, `/api/admin/*`).
- Helper de APIs: `src/lib/api-auth.ts` → `requireApiAdminOrSeller()` devuelve `{ ok, session, userId, role }`.

**Decisión clave para el repo nuevo:** si la app va a hablar **directo con
Supabase** (recomendable para offline), conviene migrar a **Supabase Auth** y
apoyarse en **RLS**. Hoy el servidor usa la *service role key*, que **bypassea
RLS por completo** — eso no puede viajar dentro de un APK.

---

## 7. Código reutilizable

### 7.1 Copiar tal cual (sin dependencias problemáticas)
| Archivo | Qué es |
|---|---|
| `src/lib/pos/payments.ts` | Métodos de pago, normalización, descuento de personal. Tiene tests. |
| `src/lib/seo/business.ts` | Datos del negocio (NAP, horarios, couriers). |
| `src/lib/shipping-policy.ts` | Reglas de despacho, si la app las necesita. |
| `src/utils/string-utils.ts` | `slugify` y utilidades. |
| `src/utils/currency.ts` | Formato CLP. |
| `src/types/scanner.ts` | Tipos del escáner. |

### 7.2 Adaptar (lógica sólida, UI acoplada a web)
| Archivo | Nota |
|---|---|
| `src/server/sales.service.ts` | Llamada a `apply_sale` + validación de suma de pagos. La lógica sirve entera. |
| `src/server/shifts.service.ts` | Apertura/cierre de turno y arqueo. |
| `src/server/reception.service.ts` | Recepción de mercadería. |
| `src/actions/sales.ts` | Guard de caja obligatoria + compra propia. **Portar la validación, no el "use server".** |
| `src/components/admin/operaciones/*.tsx` | Las 5 pantallas. React con Tailwind: reutilizables casi al 100% si el destino es web; requieren reescritura de primitivas si es React Native. |
| `src/components/admin/scanner/*` | `UnifiedScanner` (cámara + lector láser HID + entrada manual). En una app nativa conviene **reemplazarlo** por el escáner del sistema. |

### 7.3 APIs de referencia
```
GET  /api/admin/caja/estado            → { open, shiftId, startedAt }
GET  /api/admin/caja?shiftId=          → ventas + movimientos del turno
POST /api/admin/inventario/verificar   → marca producto verificado+activo
GET  /api/admin/inventario/buscar?q=   → búsqueda por nombre (incluye inactivos)
GET  /api/admin/inventario/resumen     → { verificados, seDesactivarian, total }
POST /api/admin/inventario/resumen     → purga (sólo ADMIN, con guard 409)
GET  /api/admin/compras-personal       → deuda de personal por vendedor
POST /api/admin/compras-personal       → liquidar (sólo ADMIN)
```

### 7.4 No reutilizar
Todo lo de tienda pública: `ProductContext`, `CategoryContext`, `CartContext`,
`ShopShell`, `Navbar`, `Footer`, checkout, landings de SEO, constructor visual.
La app de operaciones no los necesita y son la causa del peso actual.

---

## 8. Arquitectura recomendada para el repo nuevo

Hay una tensión real entre **máxima reutilización** y **app robusta offline**.
Las dos opciones honestas:

### Opción A — Next.js dedicado + Capacitor (máxima reutilización)
- Repo nuevo con **sólo** las 5 pantallas, su propio deploy en Vercel.
- Capacitor apuntando a **ese** dominio (no al de la tienda).
- **Reutiliza ~90% del código React actual.**
- Arregla: acoplamiento al deploy de la tienda, peso del bundle, navegación al resto del panel.
- **No arregla: sigue sin funcionar sin conexión.**
- Esfuerzo: bajo (días).

### Opción B — App offline-first (lo que un POS realmente necesita)
- Expo / React Native, o Next.js con `output: 'export'` empaquetado **localmente** en Capacitor (sin `server.url`).
- Datos vía **Supabase directo** con **Supabase Auth + RLS** (nunca la service role key en el dispositivo).
- Cola local de ventas usando `client_sale_id` + `device_id`, que ya existen y hacen `apply_sale` idempotente.
- **Arregla todos los defectos de la tabla del §1.**
- Reutilización: alta en lógica (`lib/`, `server/`), baja en UI si se va a React Native.
- Esfuerzo: medio-alto (semanas), y exige **escribir políticas RLS**, que hoy no existen para este flujo.

**Recomendación:** si el objetivo es dejar de vender a ciegas cuando cae
internet, **Opción B**. Si el objetivo inmediato es una app liviana y separada
del sitio, **Opción A** y migrar después. Un camino intermedio razonable es
empezar por A y añadir la cola offline cuando la arquitectura ya esté separada.

---

## 9. Variables de entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # SOLO servidor. Jamás dentro del APK.

# NextAuth (si se mantiene)
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Opcionales según alcance
CLOUDINARY_CLOUD_NAME= / CLOUDINARY_API_KEY= / CLOUDINARY_API_SECRET=
RESEND_API_KEY= / RESEND_FROM_EMAIL= / RESEND_WEBHOOK_SECRET=
```

⚠️ **`SUPABASE_SERVICE_ROLE_KEY` bypassea RLS.** Si la app consulta Supabase
directo desde el dispositivo, debe usar la **anon key** con políticas RLS
correctas. Meter la service role key en un APK equivale a publicar la base entera.

---

## 10. Plan sugerido para la sesión nueva

1. **Crear el repo** con Next.js + TypeScript + Tailwind (mismo stack, para poder copiar componentes).
2. **Copiar la capa sin dependencias**: `lib/pos/payments.ts`, `lib/seo/business.ts`, utils. Traer sus tests.
3. **Conectar Supabase** y verificar lectura de `products` y `cash_shifts`.
4. **Autenticación** primero: sin login no se prueba nada. Definir aquí si es NextAuth o Supabase Auth (ver §6).
5. **Portar Caja** (abrir/cerrar turno). Es la base: sin turno no hay venta.
6. **Portar Venta**, respetando el guard de caja y usando `apply_sale` con los 17 argumentos.
7. **Portar Inventario y Recepción.**
8. **Empaquetar**: Capacitor apuntando al deploy propio (Opción A) o build local (Opción B).
9. **Cola offline**, si se eligió B.

---

## 11. Trampas conocidas

- **El identificador de producto es `barcode`, no `id`.** Casi todas las tablas relacionan por `barcode text`.
- **`apply_sale` tiene tres sobrecargas.** Usar la de 17 argumentos o PostgreSQL elegirá otra silenciosamente.
- **La suma de `p_payments` debe coincidir con `p_total`** o la función falla. Con sobrepago en efectivo hay que ajustar la fila `CASH` y pasar el resto como `change_given`.
- **El arqueo excluye `STAFF_CREDIT`.** Cualquier método nuevo que no represente dinero recibido debe excluirse igual.
- **`verified_at` tiene default `now()`.** Un producto nuevo nace verificado; es intencional.
- **Permiso `CAMERA` en el manifiesto Android.** Sin él, el WebView deniega `getUserMedia` sin preguntar.
- **Firma del APK.** Builds con certificados distintos no se pueden instalar como actualización. Fijar un keystore.
- **RLS no está configurado** para el flujo de operaciones: hoy todo pasa por la service role key en el servidor.
- **Zona horaria**: `America/Santiago`. Los turnos se cierran automáticamente por un cron (`/api/cron/auto-close-shifts`).

---

## 12. Estado actual del repo original

Todo mergeado en `main`. 78 tests, `typecheck` y `build` en verde.

- `/operaciones` — app dedicada, sin panel admin alrededor (protegida por middleware).
- `/admin/operaciones` — la misma pantalla dentro del panel, para escritorio.
- Ambas montan `OperacionesApp`, así que no hay dos versiones que mantener.

Queda pendiente, documentado en `TODO-HUMANO.md`: coordenadas del local, CID de
Google Business Profile y foto de fachada (los tres son datos, no código).
