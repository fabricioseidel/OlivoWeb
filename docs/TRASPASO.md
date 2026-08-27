# Traspaso de sesión — OlivoWeb

> Escrito el 2026-08-27 para que una sesión nueva pueda continuar sin volver a
> auditar nada. La sesión anterior se quedó sin el conector de Supabase y no
> había forma de reactivarlo desde adentro; por eso el trabajo sigue en otra.

> **Actualización, 2026-08-27 (misma fecha, sesión posterior): la tarea de
> "Lo que hay que hacer ahora" quedó cerrada.** Las cinco migraciones ya
> estaban aplicadas (la sesión hija había llegado más lejos de lo que su
> propio estado indicaba). Se verificó todo y no hubo que aplicar nada nuevo.
> El detalle está al final de esta sección. **La sección de abajo se deja tal
> cual la escribió la sesión anterior, como registro** — la actualización es
> la que manda.

---

## Estado del repositorio

- `main` en `5f3b5e9`
- **325 tests** en verde (33 archivos), `tsc --noEmit` y `eslint src/` limpios,
  `npm run build` compila
- Sin PRs abiertos

## El proyecto en dos líneas

Olivo Market: minimarket completo en Ñuñoa, Santiago de Chile — abarrotes,
helados, panadería, quesos, embutidos, bebidas, energizantes — que además
funciona como **punto de encomiendas** (Chilexpress, Bluexpress, Correos de
Chile, MercadoLibre). El repo es la tienda web + el punto de venta + el panel de
administración. Next.js 15 App Router, TypeScript, Tailwind v4, Supabase.

---

## Lo que hay que hacer ahora

**Aplicar las migraciones pendientes en Supabase y verificar.** El código ya
está mergeado y las espera.

Proyecto Supabase: `nuuoooqfbuwodagvmmsf` (región sa-east-1, Postgres 17.4).

### Estado parcial: ya se empezó

Una sesión hija (título *"Aplicar migraciones pendientes en Supabase
(OlivoWeb)"*) llegó a hacer parte del trabajo antes de que se perdiera el
contacto con ella. De su propio estado, textual:

```
Step 1: 67 divergent rows of 275 measured
migration applied; verifying sync + security advisors
```

Es decir: **midió la divergencia (67 de 275) y aplicó al menos una migración**,
y estaba verificando cuando se cortó. **No está confirmado** cuántas de las
cinco aplicó ni el resultado de las verificaciones. Empezá por averiguarlo con
`list_migrations` en vez de asumir.

El dato de la medición ya está tomado y no se puede volver a tomar (la
migración corrige justamente lo que medía), así que **no hace falta repetir el
paso de medición**: 67 de 275 productos con proveedor tenían el costo global
desfasado.

### Migraciones a aplicar, en este orden

Las cinco son **idempotentes** y fueron probadas contra un Postgres 16 real
antes de mergearse. Volver a aplicar una ya aplicada no rompe nada:

1. `20260826000000_pricing_foundations.sql`
2. `20260826000100_reorder_engine_iva.sql`
3. `20260826000200_purchase_cycle.sql`
4. `20260826000300_require_reviewed_price.sql`
5. `20260827000000_costo_derivado_del_proveedor.sql`

Aplicá una por vez y verificá que termine sin error antes de la siguiente. Si
una falla, **pará ahí** y reportá el error completo.

### Verificaciones al terminar

```sql
-- (a) debe dar 0
SELECT count(*) AS divergentes_despues
  FROM public.products p
  JOIN (SELECT DISTINCT ON (ps.product_id) ps.product_id, ps.unit_cost AS costo
          FROM public.product_suppliers ps
         WHERE ps.unit_cost IS NOT NULL
         ORDER BY ps.product_id, COALESCE(ps.priority, 2147483647), ps.unit_cost) c
    ON c.product_id = p.barcode
 WHERE p.purchase_price IS DISTINCT FROM c.costo;

-- (b) debe existir
SELECT tgname FROM pg_trigger
 WHERE tgname = 'product_suppliers_sync_purchase_price';
```

Y `get_advisors` con `security` y con `performance`.

### Resultado de la verificación (sesión posterior, mismo 2026-08-27)

`list_migrations` mostró que **las cinco ya estaban aplicadas**, más tres
migraciones de seguridad que la sesión hija alcanzó a aplicar directo contra
el remoto pero no llegó a commitear como archivo:

- `20260827013350_rls_supplier_cost_history_and_category_margins` — activaba
  RLS en las dos tablas de la Fase 1 que habían quedado sin política.
- `20260827013454_revoke_public_execute_on_pricing_functions` — corregía el
  mismo error de la doctrina #7 (revocar de `anon`/`authenticated` sin
  revocar de `PUBLIC` no quita el permiso heredado) en dos funciones nuevas.
- `20260827013538_fix_search_path_on_reorder_functions` — fijaba
  `search_path` en tres funciones del motor de reposición.

Esos tres archivos se reconstruyeron a partir del contenido real aplicado
(vía `supabase_migrations.schema_migrations`) y se agregaron al repo en esta
sesión para que quede sincronizado con lo que ya corre en producción.

Verificaciones, todas en verde:

- (a) `divergentes_despues` → **0**.
- (b) el trigger `product_suppliers_sync_purchase_price` → **existe**.
- `get_advisors security` → sin hallazgos nuevos atribuibles a estas
  migraciones. Lo que aparece es deuda previa ya conocida (funciones viejas
  sin `search_path`, Postgres con parches pendientes, `password_reset_tokens`
  con RLS sin política) — nada de `product_suppliers`, `supplier_orders`,
  `supplier_cost_history` ni `category_margins` salvo lo ya corregido por las
  tres migraciones de arriba.
- `get_advisors performance` → sólo `INFO` de índices sin uso todavía en
  tablas nuevas (`supplier_orders`, `supplier_cost_history`), esperable sin
  tráfico real aún. Nada bloqueante.

**No quedó nada pendiente de esta tarea.** El siguiente trabajo es el punto 1
de "Lo que queda por hacer" más abajo.

### Después de eso

- **El panel de Aprendizaje va a verse casi vacío, y está bien.** Cada regla
  declara cuántas observaciones necesita y hoy no hay historial suficiente. Se
  llena solo a medida que se registren pedidos y recepciones. Si mostrara
  conclusiones ahora, las estaría inventando.
- Queda pendiente **depurar el catálogo y recién entonces encender
  `settings.require_reviewed_price`** (ver más abajo).

---

## Lo que se hizo en esta sesión

Cuatro trabajos, todos mergeados a `main`.

### #71 — El pago rechazado no devolvía el stock al inventario

Cuando MercadoPago informaba un pago rechazado, cancelado, reembolsado o en
mediación, el webhook cancelaba la orden pero **no devolvía lo reservado**. El
log decía "y stock restaurado".

Causa: el webhook pedía el embed `order_items → products(barcode)`, que
PostgREST **no puede resolver** porque no existe esa clave foránea. La consulta
devolvía error y un `if (!itemsErr && items)` se lo tragaba en silencio.

Ahora vive en `restoreOrderStock()` (`src/server/inventory.service.ts`): sin
embed, traduciendo la clave explícitamente, devolviendo un resultado en vez de
descartar errores. 7 tests.

### #69 — Reposicionamiento y theming real

El sitio se presentaba como "minimarket venezolano" cuando de 725 productos
activos sólo 13 (**1,7%**) están etiquetados como venezolanos. Se reescribió
para encabezar lo que la tienda es, con lo venezolano como sección propia.

Además, tres controles del panel no hacían nada: los colores movían 2 reglas CSS
mientras 1.326 clases `emerald` fijas en 133 archivos los ignoraban, el pie no
los leía, y el banner se guardaba sin que ningún componente lo mostrara. Los
tres quedaron conectados.

La escala de marca (`src/lib/brand-palette.ts`) se deriva midiendo el perfil
OKLCH real de emerald y reaplicándolo al color elegido. Con el verde por defecto
devuelve la escala emerald **exacta en los once pasos**, y hay un test que lo
fija: si se afloja, migrar 1.354 clases deja de ser invisible.

### #70 — Fase 5: motor de aprendizaje

Seis reglas sobre el historial: ritmo de reposición, fiabilidad del proveedor,
deriva de costo, plazo de entrega, plata dormida, velocidad cambiante.

Lo que define el diseño es que **cada regla declara su mínimo de observaciones y
por debajo no entrega hallazgos** — muestra cuántas faltan y cómo se juntan. Se
decidió midiendo los datos antes de escribir: 0 cambios de costo reales sobre
308 filas, 1 pedido sin recibir, 18 ventas POS.

El cálculo vive en `src/lib/learning-rules.ts`, puro y sin base, para poder
auditarlo sin levantar media aplicación.

### #72 — El costo de compra pasa a derivarse del proveedor preferido

Había dos columnas diciendo "lo que me cuesta": `product_suppliers.unit_cost`
(por proveedor, que la recepción reescribe con la factura) y
`products.purchase_price` (global, que nadie actualizaba). Un **trinquete**:
cada recepción movía una y dejaba la otra.

Ahora `purchase_price` es derivada del proveedor preferido, por trigger. **No**
deriva a `NULL` los productos sin proveedor con costo: para varios del catálogo
esa cifra a mano es el único dato que existe.

Corolario: la API de productos por proveedor sustituía por el global **en
silencio** cuando el proveedor no tenía costo. Calculaba `cost_source` para
distinguirlo y no lo leía nadie. Ahora se marca en la pantalla de pedido manual.

---

## Doctrinas del proyecto (no romper)

Reglas que este código sostiene a propósito. Romperlas reintroduce errores que
ya costaron trabajo encontrar.

1. **`branch_stock` es la fuente de verdad; `products.stock` es DERIVADO.**
   Nadie escribe esa columna directamente: todo movimiento pasa por
   `src/server/inventory.service.ts`, que es la puerta única. Escribirla a mano
   no mueve el stock de la sucursal y el valor se pierde en el siguiente
   recálculo.

2. **`product_suppliers.unit_cost` manda sobre `products.purchase_price`.** El
   segundo es derivado desde #72. El costo se carga en `product_suppliers`, que
   tiene historial y lo confirma la recepción.

3. **Toda la aritmética de precio/IVA/margen vive en `src/lib/pricing.ts`.**
   Antes había nueve copias de la fórmula repartidas por el panel. IVA chileno
   19%; `unit_cost` es **neto**.

4. **Ningún control del panel promete lo que no hace.** Ya se removieron o
   conectaron cuatro que mentían (modo prueba, colores, pie, banner). Si un
   ajuste se guarda, algo tiene que leerlo.

5. **Ninguna pantalla informa lo que no puede saber.** Es el principio de la
   Fase 5: sin datos suficientes se dice "faltan N observaciones", no se
   estima.

6. **Las migraciones son idempotentes y se prueban contra un Postgres real
   antes de mergearse.** Hay Postgres 16 disponible en el contenedor
   (`/usr/lib/postgresql/16/bin/`); levantalo en un directorio escribible como
   `/var/tmp/...` (no en el scratchpad: el socket da permission denied) y corré
   la migración como usuario `postgres`.

7. **Permisos de funciones `SECURITY DEFINER`:** revocar de `PUBLIC` (de donde
   `anon` y `authenticated` heredan) y conceder explícito a `service_role`.
   Revocar sólo de `anon`/`authenticated` **no quita el permiso heredado** — es
   un error que ya se cometió y se corrigió dos veces en este repo.

---

## Trampas conocidas

### Las tres llaves de producto

| Tabla | Columna | Apunta a | ¿FK? |
|---|---|---|---|
| `product_suppliers` | `product_id` (text) | `products.barcode` | sí |
| `supplier_order_items` | `product_id` (bigint) | `products.id` | sí |
| `order_items` | `product_id` (text) | `products.id` **por convención** | **NO** |
| `sale_items` | `product_barcode` (text) | `products.barcode` por convención | no |

**Esto ya mordió dos veces en una sola sesión** (el motor de aprendizaje y el
webhook de pago). Medido contra la base: de las líneas de `order_items`, **0 de
19 coinciden con un barcode y 19 de 19 con un `products.id`**.

El POS anota ventas por **código de barras** y la web por **id numérico**.
Sumarlas sin traducir no falla ni avisa: se acumulan bajo una clave que ningún
producto tiene.

**Antes de escribir cualquier consulta que cruce productos, verificá qué llave
usa cada lado.**

### PostgREST sólo resuelve embeds por clave foránea

`order_items` no tiene FK a `products`, así que `select('...products(barcode)')`
desde `order_items` **devuelve error**, no filas vacías. Las cinco FK que
apuntan a `products` vienen de otras tablas: `product_suppliers`,
`supplier_order_items`, `product_batches`, `inventory_movements`,
`branch_stock`.

Los 9 embeds que hay hoy en el código fueron auditados y todos se apoyan en FK
que existen. Si agregás uno nuevo, comprobá la FK primero.

### El entorno no llega a Supabase por red

El proxy del contenedor devuelve **403 CONNECT** para el host de Supabase (y
para casi todo lo demás). El único camino es el conector MCP. No pierdas tiempo
con `curl`.

---

## Lo que queda por hacer, después de las migraciones

Ordenado por lo que cuesta plata.

1. **Depurar el catálogo y encender `settings.require_reviewed_price`.** La
   regla nace apagada a propósito: encenderla sin depurar sacaría del aire casi
   todo el catálogo, porque `price_reviewed_at` arranca en `NULL` para todos.
   El orden es: mirar en la pantalla de Precios cuántos quedarían fuera,
   depurar esa lista, y recién entonces encenderla.

2. **Normalizar `order_items.product_id` y ponerle clave foránea.** Es el
   arreglo de fondo de la trampa de las tres llaves: que la base rechace lo que
   hoy acepta en silencio. Requiere migración de datos (la columna es `text` y
   guarda un `bigint`).

3. **Menor:** `products.purchase_price` ya no debería editarse a mano en ningún
   lado. El editor de producto no la toca (usa la sección "Proveedores y
   Costos"), pero el editor masivo la arrastra al renombrar un código de
   barras. Con el trigger de #72 se recalcula igual, así que no es urgente.

4. **Menor:** el tipo de `settings` declara `paypal` y `crypto` como medios de
   pago; el checkout sólo implementa MercadoPago. `PaymentSection` ya lo
   explica honestamente, así que es esquema muerto, no un control que miente.

---

## Documentos relacionados

- `docs/PLAN_PRECIOS.md` — la auditoría completa del módulo de precios, costos
  y reposición, con los hallazgos y su estado. **Actualizado**: fases 1 a 5
  completas.
- `docs/PLAN_MEJORA.md` — plan anterior, más amplio.
