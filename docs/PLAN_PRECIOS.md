# Plan de precios, costos y reposición

> Estado: **plan aprobado, sin implementar**. Revisión hecha sobre `main` en el
> commit `286d2ff`. Versión con tablas y ejemplos numéricos:
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

### 🔴 El total de los pedidos está 19% por debajo de lo real

`product_suppliers.unit_cost` guarda el costo **sin IVA** — se deduce de
`unitCost: ps.priceWithoutVat` en `productos/[id]/page.tsx:293`, no está
documentado en ninguna parte. El motor de reposición calcula
`estimated_cost = cantidad × unit_cost`, así que el total que se ve antes de
comprar es un 19% menor que lo que se paga. En un pedido de $400.000 son $76.000.

**Esto ya está costando dinero hoy.** Es lo primero que corrige la Fase 1.

### 🔴 Dos precios de compra distintos para el mismo producto

- `products.purchase_price` — global, un solo valor
- `product_suppliers.unit_cost` — por proveedor

Nada los sincroniza. `pedidos-proveedor/nuevo/page.tsx:86` usa el global; el
motor de reposición usa el del proveedor. Si un producto se compra a dos
proveedores a precios distintos, el costo "global" no significa nada.

### 🔴 No existe historial de precios

Ni de costo ni de venta. Cuando un proveedor sube un precio, el anterior se
pierde. Detectar variaciones es imposible.

### 🟡 La fórmula existe, pero duplicada y solo en el navegador

`sugerido = costo con IVA / 0.65` (35% de margen bruto), copiada en
`productos/[id]/page.tsx:162` y `productos/nuevo/page.tsx:163,176`. El servidor
nunca la calcula, así que no se puede preguntar "qué productos están bajo margen".

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

1. **Cimientos del precio** — migración (costo con IVA explícito, historial,
   márgenes por categoría, campos de revisión) + `pricing.ts` con tests. Corrige
   el total subestimado del motor. Sin cambios visibles.
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

## Pendiente de definir antes de la Fase 1

1. **Márgenes reales por categoría.** Sin esto la Fase 2 marca como problema
   cosas que no lo son.
2. **Umbral de caducidad de la revisión.** ¿Cuánto debe subir un costo para que
   el precio vuelva a revisión? Propuesta: 5%.
3. **Confirmar que `unit_cost` es neto en toda la base.** Se dedujo del código.
   Si algún costo se cargó con IVA incluido, ese producto queda 19% mal y hay que
   detectarlo antes de migrar.

---

## Lo que el plan deliberadamente no hace

- **No toca promociones.** `offer_price` sigue igual. Las promociones se
  construyen encima de un precio base correcto; hacerlo al revés es poner
  descuentos sobre precios que no se sabe si dejan margen.
- **No cambia el motor de reposición**, salvo el arreglo del IVA. Su lógica de
  velocidad y cobertura es buena; le falta contexto de precio.
- **No modela costos por volumen** ni escalas por cantidad, hasta saber si
  aplican a estos proveedores.
