# Plan de precios, costos y reposición

> Estado: **Fase 1 implementada**; Fases 2–5 pendientes. Revisión hecha sobre
> `main` en el commit `286d2ff`. Versión con tablas y ejemplos numéricos:
> https://claude.ai/code/artifact/41a48acf-3fd9-4cf8-8ab0-ddf545393ed9

Este documento existe para que retomar el trabajo no exija volver a auditar el
módulo. Contiene lo que se encontró, lo que se decidió y en qué orden hacerlo.

---

## El problema en una frase

El costo sube, nadie se entera, y el precio de venta se queda donde estaba. Falta
el circuito: **el costo cambia → se confirma al recibir → el precio de venta
vuelve a revisión.**

---

## Hallazgos de la auditoría

### ✅ El total de los pedidos está 19% por debajo de lo real — CORREGIDO

`product_suppliers.unit_cost` guarda el costo **sin IVA** — se deduce de
`unitCost: ps.priceWithoutVat` en `productos/[id]/page.tsx:293`, no está
documentado en ninguna parte. El motor de reposición calcula
`estimated_cost = cantidad × unit_cost`, así que el total que se ve antes de
comprar es un 19% menor que lo que se paga. En un pedido de $400.000 son $76.000.

**Esto ya está costando dinero hoy.** Es lo primero que corrigió la Fase 1.

Al reproducirlo contra un PostgreSQL real apareció una segunda consecuencia que
no se veía desde el código: `supplier_orders.total` guardaba la suma NETA y
`CHECK (paid_amount <= total)` compara contra ese total. O sea que **registrar
lo que de verdad se le pagó al proveedor era imposible** — la base rechazaba la
fila — y pagar sólo el neto marcaba el pedido como `pagado`. Ahora `total` es lo
que se paga (con IVA) y `total_net` queda al lado para la contabilidad.

Efecto al desplegar: los pedidos marcados `pagado` con el neto pasan a
`parcial`. No es una regresión; es lo que realmente ocurrió apareciendo por
primera vez.

### 🔴 Dos precios de compra distintos para el mismo producto

- `products.purchase_price` — global, un solo valor
- `product_suppliers.unit_cost` — por proveedor

Nada los sincroniza. `pedidos-proveedor/nuevo/page.tsx:86` usa el global; el
motor de reposición usa el del proveedor. Si un producto se compra a dos
proveedores a precios distintos, el costo "global" no significa nada.

### ✅ No existe historial de precios — CORREGIDO (costo)

`supplier_cost_history` lo escribe un **trigger** sobre `product_suppliers`, no
cada pantalla: si dependiera de que alguien se acuerde de registrarlo, no
existiría. Guarda el costo anterior en la misma fila, que es lo que permite
detectar la variación. El historial de precio de VENTA sigue pendiente (Fase 2).

### ✅ La fórmula existe, pero duplicada y solo en el navegador — CORREGIDO

`sugerido = costo con IVA / 0.65` (35% de margen bruto). No eran dos copias sino
**nueve**, repartidas por `productos/[id]`, `productos/nuevo`, `proveedores`,
`AssignmentsTable`, `AssignmentsMobileCards` y `uber-eats/lib`. Todas llaman
ahora a `src/lib/pricing.ts`, que además tiene `margenReal` — la función que
responde qué deja cada producto al precio que ya tiene puesto.

### 🟡 Dos llaves de producto en el mismo módulo

- `product_suppliers.product_id` → `text` → `products.barcode`
- `supplier_order_items.product_id` → `bigint` → `products.id`

Funciona porque el motor traduce, pero una consulta nueva que las una sin
advertirlo falla o devuelve vacío sin avisar.

### 🟡 Un CHECK impide registrar recepción parcial

`CONSTRAINT valid_subtotal CHECK (subtotal = quantity * unit_cost)` en
`supplier_order_items`. Con "pedí 24, llegaron 18, me cobraron más" la base
rechaza la fila.

### 🟡 El estado del pedido mezcla el punto del flujo con el canal

Existe `enviado_por_whatsapp`. Eso obliga a inventar un estado por canal. Son dos
columnas distintas: `status` (dónde va) y `channel` (cómo se compró).

### 🟡 No hay dónde anotar qué tenía el proveedor

El pedido salta de "enviado" a "recibido". Falta el paso de confirmación de
disponibilidad por línea.

---

## Decisiones tomadas

| Decisión | Resuelto |
|---|---|
| Precio por sucursal | **Un precio único.** La app es la fuente de verdad; ambas sucursales cobran igual. Excepciones por sucursal se pueden agregar después sin rehacer nada. |
| Regla de margen | **Por categoría.** 35% por defecto, configurable. Las bebidas no aguantan el mismo margen que un producto de nicho. |
| Venta web | **Avisar primero, bloquear después.** El panel reporta qué productos quedarían fuera; un interruptor activa el bloqueo cuando la lista esté depurada. |

---

## Fórmulas (irán a `src/lib/pricing.ts`, con tests)

```
neto  = bruto / (1 + tasa/100)
bruto = neto  × (1 + tasa/100)          // tasa = 19

sugerido    = costo_bruto / (1 − margen)          // margen 0.35 → /0.65
margen_real = (precio_venta − costo_bruto) / precio_venta
```

`margen_real` es la que hoy no existe y la que responde cuánto deja realmente
cada producto al precio que tiene puesto.

Redondeo comercial configurable, **siempre hacia arriba** (redondear hacia abajo
se come margen en silencio): decena / terminación 90 / centena.

---

## Fases

Estrictamente secuenciales — cada una depende del esquema de la anterior. Cada
una es desplegable sola y deja el sistema utilizable.

1. ✅ **Cimientos del precio** — hecha. Dos migraciones
   (`20260826000000_pricing_foundations`, `20260826000100_reorder_engine_iva`),
   `src/lib/pricing.ts` con 36 tests, y las nueve copias de la fórmula
   eliminadas. Probadas contra PostgreSQL 16 real: idempotentes en tres pasadas
   y verificadas sobre datos previos.

   Una decisión que conviene recordar: **no se agregó una segunda columna
   editable con el costo bruto.** `unit_cost` sigue siendo EL costo y es neto;
   el bruto es una columna GENERADA (`unit_cost_gross`), así que la base impide
   escribirla y no puede desincronizarse. Dos costos editables para el mismo
   producto es justo el problema que había que evitar.
2. **Pantalla Precios** — pestaña nueva en `/admin/reabastecimiento`. Tabla por
   producto × proveedor con margen real, sugerido y Δ costo. Cinco filtros: bajo
   margen, costo cambió, sin revisar, sin costo, vendiendo bajo el costo. Es la
   fase que más trabajo manual ahorra.
3. **Ciclo de compra con canales** — la más grande y la de más riesgo (elimina el
   CHECK y migra los pedidos existentes). Panel de revisión previo al envío,
   cuatro salidas por canal (WhatsApp / online / presencial / teléfono),
   confirmación de disponibilidad por línea, detección de variación de costo al
   recibir.
4. **Regla de venta web** — `require_reviewed_price`, apagado por defecto, con
   salvaguarda que muestra el impacto antes de encenderlo.
5. **Aprendizaje** — seis reglas estadísticas sobre el propio historial (no
   modelos), cada una con umbral mínimo de datos y explicando en qué se basa.

---

## Pendiente de definir antes de la Fase 2

1. **Márgenes reales por categoría.** Sin esto la Fase 2 marca como problema
   cosas que no lo son. La tabla `category_margins` ya existe con la fila
   `__default__ = 0.35`; falta decidir el resto y cargarlas.
2. **Umbral de caducidad de la revisión.** Implementado en
   `UMBRAL_REVISION_COSTO = 0.05` (5%), tal como se propuso. Cambiarlo es una
   línea si al usarlo resulta ruidoso.
3. **Confirmar que `unit_cost` es neto en toda la base.** Se confirmó en el
   código —`unitCost: ps.priceWithoutVat`, y `proveedores/page.tsx` trata
   `purchase_price` como neto— pero **no se pudo comprobar contra los datos
   reales**, porque Supabase no es alcanzable desde acá. Si algún costo se
   cargó con IVA incluido, ese producto queda 19% mal. Se detecta comparando
   `unit_cost` de un producto contra la boleta del proveedor.

---

## Lo que el plan deliberadamente no hace

- **No toca promociones.** `offer_price` sigue igual. Las promociones se
  construyen encima de un precio base correcto; hacerlo al revés es poner
  descuentos sobre precios que no se sabe si dejan margen.
- **No cambia el motor de reposición**, salvo el arreglo del IVA. Su lógica de
  velocidad y cobertura es buena; le falta contexto de precio.
- **No modela costos por volumen** ni escalas por cantidad, hasta saber si
  aplican a estos proveedores.
