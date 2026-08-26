# Plan de precios, costos y reposición

> Estado: **Fases 1 y 2 completas; Fase 3 en curso** (esquema, servicio y
> arreglo de la recepción hechos; falta el panel de revisión). Fases 4–5 pendientes. Revisión hecha sobre
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

### ✅ Un CHECK impide registrar recepción parcial — CORREGIDO, y era peor

`CONSTRAINT valid_subtotal CHECK (subtotal = quantity * unit_cost)`.

Al probarlo contra PostgreSQL real, el hallazgo original resultó **impreciso**:
"pedí 24, llegaron 18, me cobraron más" sí pasaba el CHECK, siempre que se
actualizaran las tres columnas a la vez. Lo que el CHECK rechazaba de verdad era
cualquier importe que no fuera la multiplicación exacta — un descuento por
volumen, un redondeo del proveedor, una factura que no cuadra.

Pero al mirarlo apareció algo mucho peor, que el plan no había visto:
**sobrescribir `quantity` con lo recibido destruye lo que se había pedido**, y
con eso la única forma de saber que el proveedor entregó de menos. Y sobre todo:

> **Al marcar un pedido como recibido, el stock entraba con la cantidad PEDIDA.**

Pedir 24 y recibir 18 metía 24 unidades al inventario. Como `products.stock` se
recalcula desde `branch_stock`, ese error llegaba hasta la venta web. Es el
mismo tipo de daño silencioso que el choque de inventario que se arregló antes.

Ahora son tres columnas separadas: `quantity` (pedido), `qty_confirmed` (lo que
dijo el proveedor) y `qty_received` (lo que llegó). El stock se mueve con la
tercera, y revertir usa también la tercera — revertir con lo pedido descontaría
unidades que nunca entraron.

### ✅ El estado del pedido mezcla el punto del flujo con el canal — CORREGIDO

`enviado_por_whatsapp` respondía dos preguntas a la vez. Ahora `status` dice
dónde va el pedido y `channel` cómo se compró. Las filas existentes se migraron,
y el estado viejo se retiró del CHECK: dejarlo aceptado invita a seguir usándolo.

### ✅ No hay dónde anotar qué tenía el proveedor — CORREGIDO

`availability` y `qty_confirmed` por línea. Saber antes de que llegue el camión
que el proveedor no tiene todo permite pedirle el resto a otro.

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
2. ✅ **Pantalla Precios** — hecha. Pestaña «Precios» en
   `/admin/reabastecimiento`, con `src/server/pricing.service.ts` (36 tests) y
   dos rutas de API. Los cinco filtros están, con el contador de cada uno.

   Tres decisiones que se tomaron al construirla:

   - **El cálculo vive en el servidor**, no en el navegador. Traerse el catálogo
     entero al cliente obliga a mandarle costos de proveedor a quien sólo
     necesita el resultado, y deja la lógica donde no se puede reutilizar desde
     una API ni desde un cron.
   - **El proveedor que manda es el de prioridad más baja *que tenga costo*.**
     Un proveedor marcado como principal pero sin precio cargado no puede
     decidir a cuánto se vende.
   - **«Está bien así»** marca revisado sin cambiar el precio. Sin eso, un
     producto que se vende bajo margen a propósito —para atraer gente— quedaría
     marcado como pendiente para siempre y el filtro dejaría de mirarse.

   El precio propuesto es editable antes de aplicarlo: la fórmula sugiere, no
   ordena. Y los márgenes por categoría se editan ahí mismo, mostrando al lado
   cuánto deja hoy cada categoría — fijar la regla a ciegas es exactamente cómo
   se llegó al 35% que nunca se contrastó.
3. 🔄 **Ciclo de compra con canales** — en curso. Hechos: la migración
   (`20260826000200_purchase_cycle`), `src/server/purchase-cycle.service.ts` con
   25 tests, el arreglo de la recepción y la separación estado/canal en toda la
   UI. **Falta el panel de revisión previo al envío** con las cuatro salidas.

   El circuito de precio ya queda cerrado: al recibir con un costo distinto, el
   costo de la factura vuelve a `product_suppliers` con `cost_source='recepcion'`,
   el trigger de la Fase 1 lo deja en el historial, y la pantalla de la Fase 2
   marca ese producto como «el costo cambió». Costo se mueve → se confirma al
   recibir → el precio de venta vuelve a revisión.
4. **Regla de venta web** — `require_reviewed_price`, apagado por defecto, con
   salvaguarda que muestra el impacto antes de encenderlo.
5. **Aprendizaje** — seis reglas estadísticas sobre el propio historial (no
   modelos), cada una con umbral mínimo de datos y explicando en qué se basa.

---

## Pendiente de definir

1. **Márgenes reales por categoría.** Se editan desde la propia pantalla de
   Precios, que muestra al lado el margen que cada categoría deja hoy. Ya no
   hace falta decidirlos de antemano: se ajustan mirando la evidencia.
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
