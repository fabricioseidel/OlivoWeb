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

### Carga de costos desde facturas (2026-08-27)

El dueño pasó cinco documentos: dos facturas de Dulce Pan (N° 31056 del 25/08
y N° 30845 del 20/08), una de Tequeñitos Chile SPA (N° 135), una de Nestlé
(N° 40440063) y una nota simple sin RUT ni IVA.

**Lo que se cargó** — sólo lo respaldado por factura tributaria con match
inequívoco de SKU o nombre:

| Producto | Costo neto | Origen |
|---|---:|---|
| Pan de Mantequilla Dulcepan (`745853642327`) | $1.344,54 | N° 30845, ítem "Mantequilla" (SKU PM-842327) |
| Pan Salado 7 u dulce pan (`799192124778`) | $1.218,49 | N° 30845, ítem "Salado bol" (SKU PS-124778) |
| Pan Clineja DulcePan (`799192124792`) | $1.680,67 | N° 31056 y N° 30845, ítem "Pan Clineja" |

El trigger de #72 sincronizó `purchase_price` solo, y los brutos salen
redondos ($1.600, $1.450, $2.000): confirma que los netos son correctos.

**El SKU de Dulce Pan mapea al barcode.** `CJ-642365` → `745853642365`,
`PS-124778` → `799192124778`: el SKU lleva los últimos 6 dígitos del código de
barras. Sirve para casar el resto de sus facturas sin adivinar. Los SKU
quedaron guardados en `product_suppliers.supplier_sku`, que estaba vacío en
las 310 filas.

**Proveedor nuevo: "El Oasis"** (`8ee293cc-eb60-489e-a361-245cde5ed768`). No
existía. Se le ligaron los dos productos que lo llevan en el nombre —
`Pan Andino el oasis` y `Pan francés 6 unidades el oasis`— **sin costo**,
porque la nota que entregó no lista ninguno de los dos.

**Siete productos nuevos, creados con el dueño en la línea.** Los ítems que no
casaban con nada del catálogo resultaron ser productos que efectivamente no
existían. Se crearon con costo cargado y **precio de venta en 0**, a la espera
de que el dueño lo defina:

| Código | Producto | Costo | IVA | Pack | Sugerido 35% |
|---|---|---:|---:|---:|---:|
| `900000000105` | Quesadilla El Oasis | $2.000 | 0% | — | $3.080 |
| `900000000106` | Catalinas El Oasis (5 un.) | $1.500 | 0% | 5 | $2.310 |
| `900000000107` | Pan de Queso El Oasis | $2.100 | 0% | — | $3.240 |
| `900000000108` | Pan Azucarado El Oasis | $1.900 | 0% | — | $2.930 |
| `900000000109` | Helado Savory Sandía 53 Gr | $463 | 19% | 16 | $850 |
| `900000000110` | Helado Danky Pistacho Chocolate 125 Ml | $1.450 | 19% | 18 | $2.660 |
| `900000000111` | Helado Mega Chocolate Naranja 90 Ml | $1.582 | 19% | 16 | $2.900 |
| `900000000112` | Pan de Queso Dulce Pan | $2.184,87 | 19% | — | $4.000 |
| `900000000113` | Torta de Pan Dulce Pan | $1.344,54 | 19% | — | $2.470 |

Quedan **activos con precio 0 a propósito**, y es seguro: la tienda no los
muestra (`isProductVisible` descarta precio ≤ 0) y el checkout los rechaza
(el arreglo de más abajo). Activos aparecen en la pantalla de Precios con su
costo y el precio sugerido; inactivos no aparecerían y nadie se acordaría de
ellos. Para Mega Chocolate Naranja hay un comparable directo: los otros dos
MEGA del catálogo tienen el mismo costo ($1.582) y se venden a $2.500.

Los tres helados llevan `pack_size` (16, 18, 16) y el código Nestlé en
`supplier_sku` — es la primera vez que el pack de compra queda declarado en
vez de resuelto a mano.

**Lo que NO se cargó, y por qué.** Adivinar un costo es peor que dejarlo
vacío: queda indistinguible de un dato real.

- *Dulce Pan* factura "Queso" (Q-941475, $2.184,87) y "Torta de Pan"
  (`752590810566644`, $1.344,54). **Ninguno de los dos existe en el
  catálogo.** Hay que crearlos antes de poder ligarlos.
- Los dos panes **`Pan Andino el oasis` y `Pan francés 6 unidades el oasis`**
  quedaron ligados a El Oasis **sin costo**: la nota que entregó el proveedor
  no lista ninguno de los dos. Es lo único de estas cinco facturas que sigue
  pendiente de un dato.

Todo lo demás se resolvió preguntando en vez de adivinando. El dato que lo
destrabó: "Negras" son catalinas (o cucas), vienen de a 5; "Queso" de Dulce
Pan es un pan de queso; y El Oasis es otra marca que hace la misma línea de
panes venezolanos y andinos que Dulce Pan — por eso los nombres se parecían
tanto sin ser los mismos productos.

**Ojo con el IVA de El Oasis.** La nota no es documento tributario: sin
factura no hay crédito fiscal, así que sus costos van con `tax_rate = 0` y
`unit_cost` igual a lo que se paga. Cargarlos con 19% inflaría el costo un
19% contra un crédito que no existe. Queda anotado en las notas del proveedor.

**Duplicados detectados de paso.** `Pan de Mantequilla Dulce Pan`
(`667186941520`, inactivo, con costo) y `Pan de Mantequilla Dulcepan`
(`745853642327`, activo, sin costo hasta ahora) son el mismo pan cargado dos
veces. Conviene revisar si hay más pares así antes de depurar el catálogo.

**`suppliers` no tiene columna RUT.** Las cuatro facturas lo traen y no hay
dónde guardarlo, así que no se puede casar una factura con su proveedor de
forma automática. Se nota en que el proveedor está como "Jean Tequeños" y la
factura dice "Tequeñitos Chile SPA": el costo idéntico ($3.530) dice que son
el mismo, pero el sistema no lo puede confirmar.

---

### El navbar desbordaba la página entre 640 y 1280 px (2026-08-27)

Encontrado levantando la app y midiéndola con Playwright en once anchos, no
leyendo código. **En todas las páginas**, a cualquier ancho entre 640 y ~1280
px, `document.scrollWidth` superaba a `clientWidth`: la web entera se podía
arrastrar en horizontal.

| Ancho | Desbordamiento |
|---:|---:|
| 640 px | +312 px |
| 768 px (iPad) | +184 px |
| 850 px | +102 px |
| 1024 px | +160 px |

La causa: la barra de escritorio aparecía en `sm:` (640 px) pero su contenido
—logo, **seis** enlaces, buscador, carrito, Entrar y Registrarse— no entra
hasta ~1280. El menú hamburguesa, en cambio, se ocultaba a partir de 640. O
sea que entre 640 y 1280 se mostraba una barra que no cabía y no había
alternativa compacta.

Arreglo: la barra de escritorio y el menú móvil cambian de mano en `lg:`
(1024 px) en vez de `sm:`, el buscador —que solo suma 208 px— entra en `xl:`,
y los contenedores llevan `min-w-0` para que un enlace nuevo se recorte en
lugar de empujar la página. Verificado después: **0 desbordamientos en 11
anchos × 6 páginas** (360, 375, 414, 640, 700, 768, 850, 1024, 1180, 1280,
1440).

### Botones de icono sin nombre accesible (2026-08-27)

Del mismo barrido salieron tres controles que un lector de pantalla anunciaba
sólo como "botón" o "enlace", porque su contenido es un `<svg>` y nada más:
el botón de búsqueda y el de menú del navbar móvil, y el enlace al carrito.
Los tres llevan ahora `aria-label`, y los dos que abren y cierran algo llevan
también `aria-expanded` para que se anuncie el estado. El del carrito dice
cuántos productos hay, que es la información que el número sobre el icono da
a quien puede verlo.

El `<select>` de orden en el catálogo tenía `title` pero no `aria-label`:
`title` sale como tooltip en escritorio, varios lectores lo ignoran y en móvil
no se ve nunca. Se le agregó `aria-label` sin quitar el `title`.

### Encabezados y títulos de pestaña (2026-08-27)

Segunda pasada del barrido, ahora sobre estructura del documento:

- **`/login` y `/registro` no tenían `<h1>`.** Usaban `<h2 className="o-h1">`:
  el estilo del encabezado principal con el tag equivocado. Para quien navega
  con lector de pantalla, la página no tenía encabezado principal al que
  saltar.
- **`/contacto` saltaba de `h1` a `h3`.** Email, Teléfono y Dirección son
  secciones hermanas de "Envíanos un mensaje" (que es `h2`), no subsecciones
  suyas. El estilo va en las clases, así que corregir el tag no cambió nada
  de lo que se ve.
- **`/login`, `/registro` y `/carrito` compartían el título "Olivo Market".**
  Son `noindex` a propósito —zona privada, no aportan en buscadores— pero el
  título es lo que se lee en la pestaña: con varias abiertas no se distinguían.
  Ahora dicen "Entrar", "Crear cuenta" y "Tu carrito".

**Estado tras el barrido:** 13 páginas × 3 anchos sin desbordamiento, sin
imágenes sin `alt`, sin campos sin etiqueta, sin botones mudos y sin errores
de JavaScript; y en las 10 páginas públicas, un `<h1>` por página, sin saltos
de jerarquía, con `lang="es-CL"` y descripción propia.

*Nota para quien repita la medición:* estas páginas piden datos a Supabase, y
en el contenedor de desarrollo el proxy no llega a Supabase. Con esperas
cortas (menos de ~2 s) la página todavía muestra el error de carga y el
detector lo reporta como fallo. No es un error real: con `networkidle` o
~2,5 s de espera, todas cargan limpias.

### Tres tablas del panel recortaban columnas sin dejar llegar a ellas (2026-08-28)

El panel de administración no se pudo revisar en el navegador —requiere login
y desde el contenedor el proxy no llega a Supabase para autenticar—, así que
se revisó por análisis estático: buscar `<table>` sin un contenedor con scroll
horizontal por encima.

Aparecieron tres, y el problema no era que faltara el scroll sino que estaba
**`overflow-hidden`**, que es peor: recorta lo que no entra y además impide
desplazarse hasta ello. Las columnas de la derecha quedaban inaccesibles.

- `edicion-masiva/components/ProductTable.tsx` — siete columnas con ancho fijo
  (`w-48`, dos `w-28`, `w-24`, dos `w-20`) más el padding suman unos **1.040
  px**, y la tabla se muestra desde `lg:` (1.024 px). En un laptop, "Mín." y
  "Ópt." caían fuera.
- `productos/[id]/page.tsx` y `productos/nuevo/page.tsx` — la tabla de
  proveedores del producto, mismo patrón.

El `overflow-hidden` no se quitó: es lo que recorta las esquinas redondeadas
del contenedor. El scroll pasó a un `div` propio adentro, y la tabla grande
lleva `min-w-[1040px]` para que el scroll tenga de qué agarrarse.

**Cómo repetir la comprobación** (busca tablas sin contenedor de scroll en los
600 caracteres anteriores):

```
python3 - <<'EOF'
import re, pathlib
for f in pathlib.Path('src/app/admin').rglob('*.tsx'):
    s = f.read_text(encoding='utf-8')
    for m in re.finditer(r'<table\b', s):
        antes = s[max(0, m.start()-600):m.start()]
        if not any(k in antes for k in ('overflow-x-auto','overflow-auto','overflow-x-scroll')):
            print(f"{f}:{s[:m.start()].count(chr(10))+1}")
EOF
```

### El verde de marca no se leía encima de sí mismo (2026-08-28)

Auditoría de contraste sobre 10 rutas públicas, en escritorio (1280) y móvil
(390). **26 casos únicos bajo el mínimo WCAG AA. Quedan 3**, y los tres son
decisiones de color que no me corresponden (más abajo).

**Dos textos directamente invisibles.** "Nuestro Catálogo" iba con
`text-neutral-900` sobre `bg-brand-950`: **1,18:1**, negro sobre verde muy
oscuro. El título del newsletter igual, 1,84:1. En los dos casos el `<p>`
hermano ya usaba color claro — fue un encabezado que quedó atrás cuando se
oscureció la sección.

**El resto era sistémico.** El verde de la marca es demasiado claro para llevar
texto blanco encima: `#059669` con blanco da **3,77:1** y el mínimo para texto
normal es 4,5. Todo botón primario del sitio estaba por debajo, y el de más
tráfico —"Comprar ahora"— en 2,54:1.

Ya existía `textoLegibleSobre()`, que elige el mejor de blanco y negro. Pero
elegir el mejor no es lo mismo que alcanzar el mínimo: para el verde de marca
ninguno de los dos llega desde el color base. Y además **nadie consumía
`--color-brand-contraste`**: se calculaba en `SettingsInjector`, con un
comentario explicando que servía para que un primario claro no dejara el botón
ilegible, y todos los botones llevaban `text-white` fijo.

En `src/lib/brand-palette.ts` va `ajustarHastaContraste()`: mueve **sólo la
luminosidad en OKLCH** hasta alcanzar el mínimo, conservando tono y croma. El
botón sigue siendo del color elegido en el panel, apenas más profundo. Busca el
punto más cercano que cumple —el objetivo es que se lea, no repintar la marca—
y un color que ya cumple vuelve intacto. De ahí salen dos tokens:

| token | qué es | por defecto |
|---|---|---|
| `--color-brand-boton` | superficie del botón, con su texto a ≥4,5:1 | `#00875e` |
| `--color-brand-texto` | el mismo verde como **texto** sobre fondo claro | `#00875e` |
| `--color-brand-contraste` | el texto que va encima del botón | `#ffffff` |

`brand-texto` existe porque es el fallo espejo: enlaces y botones de contorno
pintan el verde sobre blanco, y ahí el que se mueve es el texto, porque el
fondo blanco no es negociable.

Con el verde por defecto `#059669 → #00875e`; con el que hay configurado hoy en
el panel `#10b981 → #00875d`. Con un amarillo el texto sale negro y el fondo no
se toca. Con un rojo o un azul que ya cumplen, no cambia nada.

Los defaults están escritos a mano en `globals.css` para que el primer render
—antes de que `SettingsInjector` corra— ya salga legible, y **hay un test que
verifica que coincidan** con lo que calcula el módulo: si alguien cambia el
perfil y no toca el CSS, el sitio arrancaría con un tono y saltaría a otro al
hidratar.

**Lo que no se tocó:** los `bg-brand-600` decorativos sin texto encima; los
estados sólo-`hover:` sobre iconos sin texto (umbral no textual, 3:1); y el
logo de la factura impresa, que no es un botón.

#### Contraste no textual de los campos de formulario (medido, sin tocar)

WCAG 1.4.11 pide **3:1** para lo que hace falta para *identificar* un control.
Para un campo de formulario eso es su borde contra el fondo de la página, salvo
que el relleno del campo ya se distinga solo — se miden las dos vías y basta
con que una cumpla.

**16 campos en 5 páginas quedan por debajo**, todos por la misma causa:
`border-gray-200` (`#e5e7eb`) da **1,24:1** sobre blanco, y el relleno tampoco
salva (blanco sobre blanco es 1,00; `bg-gray-50` sobre blanco, 1,05). Afecta
los formularios de contacto, login, registro y los buscadores del catálogo.

No lo toqué porque cambia el peso visual de **todos** los formularios del
sitio, y eso es una decisión de aspecto. Si se decide arreglarlo, el reemplazo
es `border-gray-500` (`#6b7280`, **4,83:1**).

**Ojo con `border-gray-400`**, que es lo que uno pondría por instinto: da
**2,54:1** y sigue fallando. El salto tiene que ser hasta el 500.

Se mide con `docs/auditoria-contraste-no-textual.mjs`, igual que el otro.

#### Decisión pendiente del dueño: dos colores reconocibles

Los tres casos que quedan cambian un color que la gente reconoce, así que no
los toqué:

| dónde | ahora | propuesta | queda en |
|---|---|---|---|
| Banner de ofertas de la portada — "Descuentos hasta 40% OFF" (2,13:1) y su bajada (1,69:1) | `from-amber-500 to-orange-500` | `from-amber-700 to-orange-700` | 5,02:1 |
| Botón "Chat directo por WhatsApp" en /contacto (1,98:1) | `#25D366`, el verde oficial de WhatsApp | `#075E54`, el verde oscuro **también oficial** de WhatsApp | 7,67:1 |

En los dos casos el texto blanco se queda; lo que baja es el fondo. El banner
pasaría de ámbar brillante a ámbar quemado, y el botón de WhatsApp de verde
claro a verde azulado oscuro. Si preferís que se vean como están, se quedan
como están: es un banner promocional y un botón que la gente encuentra igual
por el logo.

#### Foco de teclado (2026-08-28)

Dos cosas más, del mismo barrido:

- **El botón de menú móvil no mostraba foco.** Tenía `focus:outline-none` sin
  nada que lo reemplazara: quien navega con teclado no veía dónde estaba
  parado, y es el control que abre todo el menú en teléfono. Ahora usa
  `o-focus`. Fue el único control del sitio público con el foco anulado sin
  reemplazo — los `Input` que aparecían en el grep tienen `focus:ring-2` en
  otra línea del mismo `className`, así que eran falsos positivos.
- **El anillo de foco se pintaba con `--color-primary`**, el color crudo
  elegido en el panel: sobre blanco da 2,54:1 y el mínimo para contraste no
  textual es 3. Ahora usa `--color-brand-texto` — 4,54:1 sobre blanco y 3,34:1
  sobre el verde oscuro del pie, así que sirve en los dos fondos donde hay
  controles.

- **No había enlace para saltar al contenido.** Quien navega con teclado tenía
  que pasar por los ~12 controles del navbar —logo, seis enlaces, buscador,
  carrito, Entrar y Registrarse— antes de llegar al contenido, y otra vez en
  cada página. Es **WCAG 2.4.1, nivel A**, o sea más severo que todo lo de
  contraste. Va en `ShopShell`, invisible hasta que recibe el foco, y `<main>`
  lleva `id="contenido"` y `tabIndex={-1}` — sin eso varios navegadores mueven
  el scroll pero dejan el foco en el enlace, y el siguiente Tab vuelve al
  navbar. Comprobado en el navegador: primera parada del tabulador, el foco
  cae en `<main>` al activarlo, y el Tab siguiente ya está dentro del
  contenido.

**Blancos táctiles**: medidos a 390 px de ancho, **0 fallos** de WCAG 2.5.8.

**Cómo medir el foco sin equivocarse.** Me costó tres intentos y los tres
errores eran míos, no del sitio:

1. `outline: auto 1px` **es** el anillo por defecto del navegador y se ve
   perfectamente. Contarlo como "sin foco" reprueba medio sitio sin motivo.
2. `transition-colors` de Tailwind v4 **incluye `outline-color`**. Leer el
   color justo después de enfocar devuelve el valor a mitad de la transición
   —o sea `currentColor`— y parece que la regla no se aplicara. Hay que
   esperar ~350 ms.
3. Si se enfocan todos los elementos en un bucle y se mide al final, sólo el
   último tiene el foco. Hay que enfocar, esperar y medir de a uno.

Lo mismo pasó con los blancos táctiles: la exención por separación de WCAG
2.5.8 se mide **centro a centro** (círculos de 24 px de diámetro), no borde a
borde. Medido por los bordes daban 17 fallos en el pie; medido bien, ninguno —
enlaces de 17 px separados 17 px tienen 34 px entre centros y cumplen.

#### El auditor, y la trampa que me costó dos vueltas

Queda en `docs/auditoria-contraste.mjs`. Se corre con el sitio compilado:

```
npm run build && npx next start -p 3000 &
node docs/auditoria-contraste.mjs
```

Dos cosas que hacen mentir a un auditor ingenuo, y por las que este no sirve de
copiar y pegar desde otro proyecto:

1. **Tailwind v4 emite los colores en `oklch()`.** Un parser que sólo entienda
   `rgb()` los descarta **en silencio** — y descarta justo los que importan. La
   primera pasada me dio "todo limpio" en el título del catálogo que estaba a
   1,18:1. Acá los colores se resuelven pintándolos en un canvas de 1×1 y
   leyendo el píxel, que acepta cualquier sintaxis que el navegador entienda.
2. **El fondo casi nunca está en el elemento del texto.** Hay que subir por el
   árbol hasta el primer ancestro opaco, y si ese fondo es un gradiente, medir
   contra **todas** sus paradas de color y quedarse con la peor. Sin esto, el
   banner ámbar salía como "blanco sobre blanco", 1,00:1, que es falso.

Y una tercera que ya estaba documentada más abajo: las páginas que piden datos
a Supabase tardan, y desde este contenedor la petición **falla**. Con menos de
~2.600 ms de espera se mide la pantalla de error en vez de la página.

### Los textos de la portada no se encontraban (2026-08-27)

El dueño mandó una captura del móvil marcando el encabezado: *"no veo lugar
para editar nada de esto"*. Resultó ser tres cosas distintas:

1. **El subtítulo, el título y la descripción sí se editaban** — están en el
   bloque `hero` del constructor. El problema era encontrarlo: se llamaba
   *"Constructor Visual"* y vivía en el grupo **Sistema**, entre Usuarios y
   Configuración. Nadie que quiera corregir el título de la portada busca ahí.
   Pasó a llamarse **"Textos de la portada"**.
2. **"También somos punto de envíos en Ñuñoa" no se editaba**: estaba escrito
   a mano en `HomeClient.tsx`. Se registró como `home.shipping.title` en
   `site-copy.ts`, con un grupo "Portada" en Configuración → Textos del sitio.
3. **La dirección, el horario, el teléfono y los nombres de los couriers no se
   editan, y debe seguir así.** Salen de `src/lib/seo/business.ts`, que es la
   fuente única del NAP y alimenta el schema.org. Su comentario de cabecera lo
   dice con todas las letras: cualquier divergencia entre el NAP del sitio,
   Google Business Profile y los directorios degrada el posicionamiento local.
   Hacerlos editables desde el panel sería exactamente la forma de que
   diverjan. Queda explicado en la descripción del grupo, para que la próxima
   vez que alguien busque ese campo encuentre el motivo en vez del hueco.

### `search_path` en las 23 funciones que faltaban (2026-08-27)

`20260828000300_search_path_en_funciones_restantes.sql`. El linter de Supabase
reportaba 23 funciones con `search_path` mutable — la deuda que
`20260827013538` había empezado a pagar con tres. **Siete son SECURITY
DEFINER**, o sea que corren con los privilegios del dueño de la función:
`apply_sale_v2`, `decrement_product_stock`, `decrement_stock_atomic`,
`get_seller_name_from_user`, `increment_product_stock`,
`list_sales_missing_items` y **`login_user`**, que es la que valida
contraseñas.

**El detalle que había que ver antes de aplicar.** `login_user` llama a
`crypt(...)` sin calificar, y `crypt` no vive en `public` sino en
`extensions` (es de pgcrypto). Fijarle `search_path = public, pg_temp` —lo que
lleva el resto— la habría dejado sin poder resolver `crypt`: **nadie podría
iniciar sesión**. Se comprobó replicando el caso en Postgres 16, y el enfoque
ingenuo falla con `ERROR: function crypt(text, text) does not exist`. Por eso
esa función lleva `extensions` en su path; `extensions` es un esquema del
propio Supabase, no uno donde un tercero pueda crear objetos, así que
incluirlo no debilita la protección.

Verificado después en producción: **0 funciones sin `search_path`**, las 14
SECURITY DEFINER protegidas, y `login_user` responde "Credenciales inválidas"
—resuelve `crypt()` y rechaza bien— en vez de dar error.

---

### Cierre de los pendientes menores (2026-08-27, misma sesión)

**El aviso al cargar un costo.** La pantalla de Precios sabía listar lo que se
vende bajo costo, pero es un informe: hay que acordarse de abrirlo. Los seis
productos que se vendían a pérdida llevaban meses así y aparecieron midiendo
el catálogo para otra cosa, no desde el panel. Ahora `avisoPorCosto()`
(`src/lib/pricing.ts`) comprueba, en el momento de guardar un costo de
proveedor, si el producto queda bajo costo o bajo su margen, y el aviso llega
como toast en el editor de producto — con la cifra de cuánto se pierde por
unidad, que es el número accionable.

**No bloquea.** Vender bajo costo puede ser deliberado (una liquidación, un
producto gancho) y quien carga la factura no siempre es quien fija el precio.
Avisar y dejar pasar es lo correcto; impedirlo obligaría a inventar un rodeo.
Tampoco avisa cuando el precio de venta es 0: eso es "falta definirlo", no "se
vende regalado", y con 68 productos así sería puro ruido. Sale de
`diagnosticarPrecio`, la misma cuenta que la pantalla de Precios, para que las
dos no puedan discrepar. 10 tests.

**`suppliers.rut`** (`20260828000200_suppliers_rut.sql`). No había dónde
guardar el RUT, que es lo que identifica sin ambigüedad a quien emite una
factura — por eso el proveedor está como "Jean Tequeños" y su factura dice
"TEQUEÑITOS CHILE SPA" sin que el sistema pueda confirmar que son el mismo.
Se cargaron los tres RUT de las facturas procesadas. El índice único es
**parcial**: dos proveedores informales sin RUT conviven, pero no puede haber
dos con el mismo. Sin validación de formato a propósito: un CHECK estricto
rechazaría un RUT extranjero o una factura mal impresa justo cuando hay que
registrarla. El campo está en la pantalla de proveedores.

**Los duplicados que quedaban.** Al revisarlos resultaron ser tres grupos
distintos:

- **Dos pares con las dos fichas activas y stock repartido**, que sí había que
  unificar: *Agua Benedictino 1.5 sin gas* (`7802820441512` ← `900000000032`,
  queda con 12) y *Agua Cachantún con gas 1.5* (`7801620852955` ←
  `7801620615895`, queda con 4). Mismo criterio que antes: sobrevive el código
  escaneable, y en Cachantún además el que se escaneó el 23/08.
- **Ocho fichas ya resueltas de facto** — inactivas y con stock 0, así que no
  había nada que mover. Se marcaron con el sufijo `[duplicado, unificado…]`
  para que nadie las reactive creyendo que son productos distintos.
- **Un falso positivo**: *Coca-Cola Zero 2 Lt* y *2.5 Lt* se parecen de nombre
  pero son formatos distintos. No se tocaron.

---

### Auditoría de duplicados y datos alterados (2026-08-27)

Pedida por el dueño después de encontrar el par de "Pan de Mantequilla". Se
buscó con `pg_trgm` sobre el nombre normalizado (minúsculas, sin acentos).

**Lo que está sano.** Vale decirlo porque acota dónde buscar: **0** productos
con stock negativo, precio negativo o costo negativo; **0** sin nombre o sin
categoría; **0** filas de `product_suppliers` apuntando a un producto que no
existe; y **0** productos con `purchase_price` desalineado de su proveedor
preferido — el trigger de #72 está haciendo su trabajo.

#### Duplicados: unos 20 pares, cuatro urgentes

Los urgentes son aquellos donde **las dos fichas están activas y la que tiene
el stock es la que no tiene precio**:

| Producto | Ficha con stock (sin precio) | Ficha con precio (sin stock) |
|---|---|---|
| Coca-Cola Zero 250 ml | `7801610000335` — stock 4, $0 | `640002090335` — stock 0, $500 |
| Pepsi Zero 600 ml | `7801620009342` — stock 4, $0 | `2848620009342` — stock 0, $1.200 |
| Papelón con limón 500 ml | `798190235813` "Pepelon" — stock 4, $0 | `736372665485` — stock 0, $1.500 |
| Gatorade frutos tropicales | `7801620011840` — stock 2, $0 | `7700740011740` — stock 0, $1.100 |

**Cómo se generan, que es lo que importa.** En los cuatro casos la ficha *con
stock* tiene el **código de barras real del fabricante** (`7801610000335` es
el EAN de Coca-Cola) y la ficha *con precio* tiene un **código inventado**
(`640002090335`, `2848620009342`). La lectura es que alguien escaneó el
producto real, el sistema no lo encontró —porque estaba cargado con un código
a mano— y creó una ficha nueva sin precio. El stock se fue a la ficha nueva y
el precio quedó en la vieja.

Eso explica **5 de los 63** productos con precio 0. No es la causa de todos,
pero es la única que tiene un arreglo sistemático: al unificar, el producto
recupera precio y stock a la vez. `798190235813` está además cargado como
"**Pepelon** con limón" — un error de tipeo que impide encontrarlo buscando
"papelón".

Hay ~16 pares más con una de las dos fichas ya inactiva (Alfajor Bon o Bon,
Halls negro, Malta polar, Mantequilla Soprole 250g, Pan de Mantequilla Dulce
Pan, Yogurt Oikos Frutilla, Queso Parmesano Colun, Chocolate Jet, Jugo Watts
Naranja, Pepsi Original 3 Lt, Pepsi Zero 1.5, Galleta Soda Costa, Atún
Desmenuzado Esmeralda, Agua Saborizada Pera, Coca-Cola Zero 3L, Coca-Cola
Lata Original). Esos son menos urgentes: la inactiva no se vende. **Powerade
Naranja 850 Ml tiene tres fichas** (`7802820651003`, `7802820678062`,
`7802820678161`), dos inactivas.

**Los cuatro se unificaron el 27/08/2026.** Antes de tocar nada se verificó
que ninguna de las ocho fichas tuviera ventas POS, pedidos web, lotes ni
ítems de pedido a proveedor — estaban todas en cero, así que no había
historial de ventas en juego.

*Cuál sobrevive:* la ficha **cuyo código se escaneó en el inventario del
23/08**, que es el impreso en el envase. En tres de los cuatro casos ese
código es un GS1 Chile válido (`780161…`, `780162…`) y el descartado es
inventado o de rango interno (`2848…` es un prefijo de uso in-store). Si
sobreviviera el código a mano, el próximo inventario volvería a crear el
duplicado — que es exactamente cómo se generaron.

| Sobrevive | Se descartó | Precio | Stock Principal |
|---|---|---:|---:|
| `7801610000335` Coca-Cola Zero 250 ml | `640002090335` | $500 | 5 (2+3) |
| `7801620011840` Gatorade frutos tropicales | `7700740011740` | $1.100 | 3 (1+2) |
| `798190235813` Papelón con Limón 500 ml | `736372665485` | $1.500 | 14 (2+12) |
| `7801620009342` Pepsi Zero 600 ml | `2848620009342` | $1.200 | 25 (2+23) |

Se migró al sobreviviente todo lo que estaba en la ficha descartada: precio,
`branch_stock` sumado por sucursal, proveedor, historial de costo y la
publicación de Uber Eats. En Pepsi ambas fichas tenían proveedor con el mismo
costo ($689,08) y ambas tenían publicación en Uber Eats: se borró la del
descartado para no dejar el producto publicado dos veces. El nombre
"**Pepelon**" quedó corregido a "Papelón".

Las fichas descartadas **no se borraron**: quedaron inactivas, con stock 0 y
renombradas con el sufijo `[duplicado, unificado 27/08/2026]`, conservando sus
movimientos de inventario como historial. Borrarlas habría arrastrado ese
rastro por el `ON DELETE CASCADE`.

*Por qué `products.stock` es el de Principal y no la suma.* El checkout
resuelve la sucursal `is_default` —que es Principal— y descuenta de ahí. Poner
la suma con Sucursal 2 haría que la web ofrezca unidades que no están en la
tienda que despacha. Pepsi, por ejemplo, tiene 45 entre las dos sucursales
pero 25 disponibles de verdad.

Quedan los ~16 pares con una ficha ya inactiva y el trío de Powerade, sin
unificar: son menos urgentes porque la inactiva no se vende.

#### El stock descuadra entre `products` y `branch_stock`

**719 de 722** productos activos tienen `products.stock` distinto de la suma
de sus sucursales. En total: `products` suma **7.155** unidades y
`branch_stock` suma **13.507**.

Casi toda la diferencia tiene un nombre: **"Sucursal 2" carga 5.965 unidades
de stock y no registró jamás una venta** (0 en `sales`, contra 18 de
Principal; sus 56 movimientos de inventario son de la resincronización del
30/07). Su `branch_stock` no se toca desde el 10/08. Todo indica que es una
sucursal que nunca llegó a operar y que quedó con una copia del inventario
de aquella migración.

Esto **contradice la doctrina #1** (`branch_stock` es la fuente de verdad,
`products.stock` es derivado): si se recalculara `products.stock` desde
`branch_stock` hoy, el catálogo entero duplicaría su inventario contra
existencias que no están en ninguna góndola. La tienda web lee
`products.stock` (vía `fetchAllProducts`), así que hoy muestra el número
menos malo de los dos, pero por accidente, no por diseño.

**Arreglado el 27/08/2026.** La causa estaba escrita en la propia migración
`20260729000000_resync_branch_stock_from_products.sql`:

> *"Confirmado por Fabri (30-jul-2026): products.stock es hoy el número
> correcto, y por el momento ambas sucursales manejan un solo stock combinado,
> sin distinción real entre ellas. Por eso esta reconciliación se aplica a
> todas las sucursales activas, no solo a la default."*

Es decir: ese resync copió `products.stock` a **las dos** sucursales. Sucursal
2 —un seed de la migración inicial de `branches`, sin dirección, sin teléfono,
sin vendedores asignados y sin una sola venta desde el 16/05— quedó con una
**copia** del inventario de Principal, no con existencias propias. Sus únicos
56 movimientos son 28 IN y 28 OUT de una deduplicación de agosto, que se
cancelan entre sí.

Se hicieron dos cosas:

1. **Su stock a cero y la sucursal desactivada.** Desactivarla es lo que
   impide que el problema vuelva: el resync de julio filtraba por
   `is_active = true`, que es exactamente cómo se llenó la primera vez.
   Ninguna RPC filtra sucursales por `is_active` (todas resuelven por
   `is_default` o reciben el `branch_id`), y `getBranches()` sí lo hace, así
   que el selector del panel ahora muestra sólo Principal.

2. **`products.stock` resincronizado desde Principal.** Acá estaba el bug
   activo: `products.stock` reflejaba la **suma** de las dos sucursales, que
   eran copias la una de la otra. De 340 productos con stock en ambos lados,
   **255 mostraban cerca del doble** del stock real y 113 exactamente el
   doble; **ninguno mostraba menos**. Y otros **373 figuraban en cero teniendo
   stock real** en Principal.

   La consecuencia para el cliente era concreta y es la misma que la migración
   de julio decía haber arreglado: la web ofrecía 80 Trencitos, el checkout
   descuenta de `branch_stock` de Principal —donde hay 42— y el pedido moría
   con "stock insuficiente". Al mismo tiempo escondía 373 productos que sí
   estaban en góndola.

**Resultado: 730 de 730 productos activos alineados, 0 descuadrados.** El
inventario pasa de 13.507 unidades declaradas a **7.552** reales. 713
productos con stock, de los cuales 657 son vendibles por la web (tienen stock
y precio).

Los 12 productos activos sin fila en Principal ya estaban en cero, así que la
resincronización no los tocó; nueve son los que se crearon ese mismo día.

**La cura, no el parche (mismo día, después).** La resincronización de arriba
dejaba el dato bien pero no impedía que volviera a torcerse. Se arreglaron las
dos causas de raíz:

*En la base* — `20260828000000_products_stock_derivado_por_trigger.sql`. La
fórmula del stock derivado estaba **copiada en siete funciones**
(`apply_reception`, `apply_reception_reverse`, las dos sobrecargas de
`apply_sale`, `apply_transfer`, `decrement_stock_atomic`,
`increment_product_stock`), y ninguna filtraba por sucursal activa. Reescribir
las siete deja la misma fórmula duplicada siete veces, que es exactamente cómo
se rompió; en su lugar la derivación pasó a vivir en un solo lugar
(`stock_derivado(text)`) con dos triggers que la aplican:
`products_stock_derivado` reemplaza cualquier valor escrito a mano por el
derivado, y `branch_stock_sync_products` propaga los movimientos. Las siete
funciones quedaron intactas: su `UPDATE` ahora es redundante, no incorrecto.

*En el código* — `setStockLevel` y `setStockLevels` calculaban el delta contra
`products.stock` (el total de todas las sucursales) y lo aplicaban a **una**
sucursal. Con 42 en Principal, 42 en otra y un total de 84, pedir "dejá 50"
restaba 34 y Principal terminaba en 8. Ahora miden contra el stock de la
sucursal donde van a aplicar el ajuste. Es un error que da resultados
plausibles —el total queda cerca, el detalle queda inventado— y por eso podía
pasar mucho tiempo sin que nadie lo notara.

Probado contra un Postgres 16 real antes de aplicar (doctrina #6), con diez
casos: la sucursal inactiva deja de contar, el valor escrito a mano se
reemplaza, mover `branch_stock` propaga, reactivar una sucursal la vuelve a
sumar, los decimales de los productos por peso se preservan, y la migración es
idempotente. Verificado después en producción: escribir `stock = 9999` en un
producto sin existencias lo deja en 0, y los 730 activos siguen alineados.

Quedan **10 tests nuevos** en `inventory-service.test.ts`, con el mock
separando `products` de `branch_stock` — uno que devolviera lo mismo para las
dos dejaría pasar justo este error.

#### Cinco códigos de barras que no son códigos de barras

`INT-MT6BEV1H`, `INT-MT6BFTQZ`, `INT-MT6BGZ4R`, `INT-MT6BHMWD` (los cuatro de
Don Julio, todos con precio 0 y stock) y `PONYMALTA`. No rompen nada hoy
—`barcode` es `text`— pero no se pueden escanear, así que en el POS hay que
buscarlos a mano.

---

### El checkout cobraba $0 por 64 productos (arreglado el 2026-08-27)

Apareció midiendo el catálogo para el punto 1, no buscándolo. **64 productos
activos tienen `sale_price = 0`**, casi todos con stock.

La ruta de checkout validaba que el producto existiera, que estuviera activo y
que la cantidad fuera razonable — pero nunca que el precio fuera mayor que
cero. Después armaba el subtotal con `sale_price * cantidad`. Cada uno de esos
64 entraba en un pedido a $0.

La vitrina ya los escondía (`isProductVisible` descarta precio ≤ 0) y por eso
no se veía. Pero es exactamente lo que el comentario del propio checkout ya
advertía sobre la regla de venta web: **esconder un producto del catálogo no
impide que alguien llame la ruta con su código.**

Ahora vive en `sinPrecioCobrable()` (`src/server/sellable.service.ts`), al lado
de la regla de venta pero **independiente de ella**: `require_reviewed_price`
protege el margen y por eso se puede apagar; esto protege de cobrar cero y no
se apaga. Con la regla apagada —el estado real hoy— igual frena. 10 tests.

Queda pendiente, para el dueño: **ponerles precio o desactivarlos**. Hoy son 64
productos con stock que no se pueden vender por la web ni se ven en la tienda.

---

## Uber Direct: la cotización real (2026-08-28)

La evaluación de Uber Direct estaba bloqueada por un solo número: cuánto cobra
Uber por una entrega en Ñuñoa. Ya se puede responder. Se midió con
`scripts/uber-direct-cotizar.mjs` contra la API real, con las credenciales de
la app de **prueba**.

**El número, en una línea: Uber cobra entre $2.953 y $4.726 en Ñuñoa y Macul.
El checkout cobra hoy un tope de $1.500. Uber sale entre 2,0 y 3,2 veces eso.**

### La unidad del `fee`: hay que dividir por 100

Era la duda abierta: el `fee` viene en la unidad mínima de la moneda y el peso
chileno no tiene centavos, así que no se sabía si Uber divide por 100.
**Divide.** Uber usa exponente 2 fijo (cents) aunque el CLP no tenga subunidad.

Dos evidencias independientes:

- **Por magnitud.** El crudo para 2 km es `338400`. Leído sin dividir son
  $338.400 —unos 350 USD por llevar un paquete dos kilómetros—, absurdo por un
  factor de 100. Leído `/100` son $3.384, que es exactamente lo que vale un
  delivery en Santiago.
- **Por documentación.** La referencia de Uber describe el `fee` de
  `delivery_quotes` en cents, con el ejemplo `"fee": 558` / `"currency_type":
  "USD"`.

Que ninguna de las dos lecturas dé un número redondo en pesos es esperable: el
precio no lo fija una tarifa en CLP, lo fija el motor de Uber.

### Las cotizaciones

Diez direcciones de Ñuñoa y Macul, viernes 2026-08-28 ~16:05 hora de Chile, sin
lluvia, fuera de hora punta. `km` es Haversine en línea recta desde el local.

| Destino | km | `fee` crudo | Costo real | ETA |
|---|---:|---:|---:|---:|
| Los Plátanos 1200, Macul | 1,37 | 338400 | $3.384 | 53 min |
| Duble Almeyda 2900, Ñuñoa | 1,44 | 338400 | $3.384 | 53 min |
| Av. Macul 3200, Macul | 1,69 | 295300 | **$2.953** | 53 min |
| Av. Irarrázaval 3400, Ñuñoa | 2,03 | 338400 | $3.384 | 57 min |
| Av. Grecia 1570, Ñuñoa | 2,17 | 338400 | $3.384 | 54 min |
| Av. Quilín 3250, Macul | 3,14 | 338400 | $3.384 | 53 min |
| Av. Departamental 1400, Macul | 3,25 | 427500 | $4.275 | 64 min |
| Av. Vicuña Mackenna 4860, Macul | 3,28 | 472600 | $4.726 | 64 min |
| Av. Irarrázaval 5400, Ñuñoa | 3,40 | 427500 | $4.275 | 64 min |
| Av. Ossa 100, Ñuñoa | 4,08 | 472600 | **$4.726** | 69 min |

Mínimo $2.953, promedio $3.788, máximo $4.726. Fuera de las dos comunas se
midió hasta $5.675 (Santa Rosa 4200, San Joaquín).

**El precio va por escalones, no por kilómetro.** Sólo aparecen cinco valores
—295300, 338400, 427500, 472600, 567500— y no ordenan por distancia en línea
recta: Quilín a 3,14 km cuesta lo mismo que Irarrázaval a 2,03 km, y menos que
Departamental a 3,25 km. Ordenan bien por `duration`, que es lo que Uber
factura: ruta y tiempo, no radio. **No se puede predecir el precio de Uber con
Haversine.** Hay que cotizar.

### La cobertura tiene huecos, y no son un radio

Con las credenciales de prueba, `address_undeliverable` en Las Condes (4,4 km)
y San Miguel (6,4 km), pero sí hay cobertura en La Reina (5,1 km) y Peñalolén
(5,0 km). Es un polígono, no un círculo, así que **el radio de reparto propio
(`RADIO_DESPACHO_KM_DEFAULT`, 8 km) no sirve para predecir si Uber acepta**. La
única forma de saberlo es pedir la cotización y manejar el error.

Ojo: esto se midió con la app de prueba y podría ser una restricción del
sandbox. Reverificar con las credenciales de producción antes de fijar
cobertura en el checkout.

### Qué umbral de envío gratis deja margen

Con margen promedio de catálogo de **27,5%**, un carro de $U deja $U × 0,275 de
margen bruto, y de ahí sale el envío.

| Umbral | Margen bruto | Neto con Uber promedio ($3.788) | Neto en el peor caso ($4.726) |
|---:|---:|---:|---:|
| $15.000 | $4.125 | +$337 | **−$601** |
| $20.000 | $5.500 | +$1.712 | +$774 |
| $25.000 | $6.875 | +$3.087 | +$2.149 |
| **$30.000** | **$8.250** | **+$4.462** | **+$3.524** |
| $35.000 | $9.625 | +$5.837 | +$4.899 |

El punto de equilibrio —donde se gana exactamente cero— es **$17.185** en el
peor caso medido. Cualquier umbral de envío gratis por debajo de eso hace que
el pedido pierda plata.

**Recomendación: `freeShippingMinimum` en $30.000.** Deja el 43% del margen
bruto vivo incluso en la dirección más cara medida, y es un carro alcanzable en
un minimarket. $25.000 también cierra, pero deja sólo el 31%.

**Falta descontar la comisión de MercadoPago** (~3,49% + IVA), que el 27,5% no
incluye: a $30.000 son unos $1.245, y bajan el neto del peor caso de $3.524 a
~$2.279 — sigue positivo. A $25.000 lo dejan en ~$1.111, que ya es apretado.
Es la razón principal para preferir $30.000 sobre $25.000. Confirmar la
comisión real antes de fijarlo.

### Lo que falta medir antes de integrar

- **Hora punta y lluvia.** Todo esto es un viernes a las 16:05 con buen tiempo.
  El tope sobre el cual no se ofrece Uber (regla 2 de la integración) no se
  puede fijar sin ver cuánto sube un martes a las 21:00 o con lluvia. Provisorio
  sugerido: $6.500, apenas por encima del máximo absoluto medido ($5.675).
- **Si el `fee` depende del valor del carro.** No se probó; todas las
  cotizaciones fueron sin `manifest_total_value`.
- **Precios y cobertura de producción.** Estos son de la app de prueba.

### Credenciales

Las de la app de prueba quedaron expuestas en un chat el 2026-08-28 y **hay que
rotarlas antes de producción**. Van en `.env.local` (que está en `.gitignore`)
para correr el script, y las de producción sólo en las variables de entorno de
Vercel. Nunca en un archivo rastreado.

---

## Las tres opciones de entrega (2026-08-28)

El esquema que definió el dueño, después de ver lo que cobra Uber. **Uber no
reemplaza el despacho propio: lo complementa.** El reparto propio es la opción
programada y barata; Uber queda para quien quiera rapidez y la pague.

| | Opción 1 | Opción 2 | Opción 3 |
|---|---|---|---|
| **Qué es** | Retiro en tienda | Envío a domicilio agendado | Envío flash |
| **Quién** | El cliente | El dueño, en su ronda | Uber Direct |
| **Precio** | Gratis | $1.500 hasta 2 km; por distancia hasta 6 km | Lo que cotice Uber |
| **Gratis desde** | — | $30.000 | $40.000 |
| **Estado** | Andando | **Andando** | **Andando** |

### Los dos tramos de precio de la opción 2

Dentro de **2 km** la ronda no se alarga de forma apreciable, así que cobrar por
kilómetro no recauda más y sólo complica el precio: rige la tarifa plana de
$1.500. Pasado ese radio la ronda sí se estira y vuelve el cálculo por
distancia, hasta el tope de **6 km**. Más lejos la modalidad no se ofrece.

Antes esto eran dos opciones separadas compitiendo en la misma pantalla. Ahora
es un método con dos tramos, que es como funciona en la realidad.

**Los radios están en distancia de recorrido, no en línea recta.** Se comparan
contra el Haversine multiplicado por `FACTOR_CALLES` (1,3), así que 6 km de
radio son unos 4,6 en línea recta. Ese factor estaba copiado en dos rutas de
API sin que se viera que tenía que ser el mismo número; ahora vive en
`shipping-policy`.

### Las rondas cubren los siete días

| Días | Ronda |
|---|---|
| Lunes a viernes | 08:00–12:00 |
| Sábado y domingo | 10:00–12:00 y 14:00–18:00 |

Entre semana sale una vez, antes del turno del dueño en el local (13:30–22:30).
El fin de semana el local abre recién a las 10:00 y los pedidos salen de ahí,
así que la ronda de la mañana empieza con la persiana y se agrega una de tarde.

**Corte: 22:30**, el cierre del turno. Los pedidos se preparan durante el turno
y salen en la ronda siguiente, así que **el agendado nunca se ofrece para hoy**.
Uno que entra después de las 22:30 se corre un día, porque lo prepara el turno
siguiente.

### Por qué el envío gratis tiene dos mínimos

Porque la misma regla vale plata muy distinta según quién reparta. Con margen de
catálogo 27,5% y comisión de MercadoPago ~4,15%:

| Modalidad | Mínimo | Costo del envío | Neto por pedido |
|---|---:|---:|---:|
| Agendado | $30.000 | bencina (~$500) | **$6.504** |
| Flash (Uber) | $40.000 | $2.953 – $4.726 | **$4.613 – $6.386** |

El número que importa para el flash: a $40.000, **Uber tendría que cobrar más de
$9.339 para que el pedido pierda plata**. El máximo medido en Ñuñoa y Macul fue
$4.726, así que hay el doble de colchón. Igual hace falta el tope de la regla 2
de la integración —lluvia y hora punta siguen sin medirse.

### Las landings dejaron de publicar el tope por comuna

`TOPE_POR_COMUNA` y `quoteShipping` se **eliminaron**: quedaron sin uso al
reemplazarlos `quoteAgendado`, e implementaban la regla vieja. Además prometían
la tarifa plana en todo Ñuñoa, cuando ahora rige dentro del radio — quien vivía
en el mismo Ñuñoa pero más lejos veía un precio que el checkout no respetaba.
Los términos y `DespachoInfo` ahora hablan de radios.

### El mapa de cobertura

`src/components/MapaCobertura.tsx` reemplaza al iframe de Google Maps que había
en `/contacto` y `/tienda-nunoa`. Dibuja los dos radios sobre OpenStreetMap:
gratis, sin API key, con atribución visible como exige la licencia, y montado
sólo cuando entra en pantalla.

**Los círculos se dibujan deshaciendo el factor de calles**
(`radioDibujableMetros`, testeado). Pintar 6 km redondos habría prometido
cobertura a casi 8 km de calle, que es justo lo que el checkout rechaza.

Ojo para probarlo desde el contenedor del agente: **la política de egreso
bloquea `tile.openstreetmap.org` con 403**, así que el mapa sale gris. No es un
bug — en producción los tiles los pide el navegador del visitante.

### El envío flash (Uber Direct)

Construido el 2026-08-28. Las cuatro reglas acordadas, y dónde vive cada una:

| Regla | Dónde | Cómo |
|---|---|---|
| 1. Cotizar dos veces | `create-order` | Recotiza antes de cobrar y compara con lo que el cliente vio (`revalidarFlash`). Dentro del 10% se respeta el precio mostrado y la tienda absorbe la diferencia; por encima no se cobra, se le avisa. |
| 2. Tope sobre el cual no se ofrece | `flash-policy` | `TOPE_FLASH_CLP` = $6.500. Sobre eso la opción desaparece y queda el agendado. |
| 3. No llamar con la tienda cerrada | `/api/shipping/flash` y `create-order` | `tiendaAbierta()`, derivada de `BUSINESS.openingHours`. Se comprueba **antes** de llamar: preguntar y descartar gastaría cuota igual. |
| 4. Crear la entrega con el pago confirmado | webhook de MercadoPago | `crearEntregaDePedidoPagado`. En ningún otro lado. |

**Por qué el tope es $6.500 y no otro.** Las cotizaciones que lo justifican son
de un viernes a las 16:05 con buen tiempo. **Falta medir en hora punta y con
lluvia**, así que el número hay que revisarlo con datos, no dejarlo envejecer.
Con el mínimo del flash en $40.000 un pedido regalado aguanta hasta unos $9.300
de envío, así que cortar en $6.500 lo deja cómodamente en azul.

**El token se cachea en memoria del proceso.** El endpoint admite 100 pedidos
por hora y el token dura 30 días, así que pedir uno por cotización dejaría la
tienda sin cotizar a las cien visitas. Es caché por instancia: con más tráfico
del que hoy tiene la tienda convendría moverlo a un almacén compartido.

**El checkout cotiza una vez por dirección, no por cambio de carrito.** El costo
de Uber no depende del subtotal —sólo el envío gratis—, así que la llamada manda
`subtotal: 0` y el mínimo se aplica del lado del cliente. Agregar un producto no
gasta otra cotización.

**Si Uber no contesta, la opción desaparece y el checkout sigue.** Sin
credenciales, con la tienda cerrada, sin cobertura o con Uber caído, el cliente
ve las otras dos opciones y ni se entera. Nunca se lo bloquea por esto.

**Si la entrega falla después del pago**, el webhook igual responde 200 y deja
`UBER_DELIVERY_FAILED` en la auditoría. Devolver error haría que MercadoPago
reintente, y cada reintento crearía otra entrega: un pedido pagado sin
repartidor se resuelve a mano, tres repartidores cobrados por el mismo pedido no.
La creación es idempotente por `uberDeliveryId`.

**Hay un test de integración contra la API real**
(`src/__tests__/uber-direct.integracion.test.ts`), que se salta solo sin
credenciales. Existe porque los demás tests del flash son puros: verifican las
reglas, pero no que el cuerpo que se le manda a Uber sea el que Uber acepta —y
eso ya rompió una vez, con las direcciones como objeto en vez de string.
Corre en entorno `node` y no en el jsdom del proyecto: el `URLSearchParams` de
jsdom no es el que espera el `fetch` de undici y el pedido del token falla con
un error que en producción no ocurre.

### Los dos mínimos de envío gratis

`free_shipping_minimum` (agendado, $30.000) y `free_shipping_minimum_flash`
(flash, $40.000), los dos editables desde el panel. Son dos y no uno porque el
mismo regalo cuesta plata muy distinta según quién reparta. La migración
`20260828000500` agrega la columna; es idempotente y está probada contra un
Postgres 16 real.

### Lo que falta

1. **Aplicar la migración `20260828000500`** y **encender el envío gratis desde
   el panel**. El código funciona sin la columna —se cae al valor de fábrica—,
   pero hasta encenderlo ningún envío es gratis.
2. **Rotar las credenciales de Uber.** Las que hay son de la app de prueba y
   quedaron expuestas en un chat. Las de producción van sólo en las variables
   de entorno de Vercel.
3. **Medir a Uber en hora punta y con lluvia**, para fijar `TOPE_FLASH_CLP` con
   datos en vez de con un viernes de buen tiempo.
4. **Verificar cobertura y precios con credenciales de producción.** La app de
   prueba rechazó Las Condes a 4,4 km pero aceptó La Reina a 5,1; puede ser una
   restricción del sandbox.
5. **Calibrar la capacidad por ronda**, hoy en `MAX_ORDERS_PER_SLOT` (5).

---

## Taller de precios y costos (2026-08-30)

`/admin/precios`. Nació de medir el catálogo y ver que **el cuello de botella no
es técnico sino de digitación**: 736 productos activos, 458 sin proveedor, 64
con stock y precio $0, y **cero** con precio revisado. Cargar eso por la ficha
de cada producto son cientos de navegaciones, y por eso llevaba semanas sin
moverse.

Es una grilla tipo planilla: se escriben costo, unidades por bulto y precio de
varios productos seguidos, el margen se recalcula mientras se teclea y se
guardan todos juntos.

### Los números al 2026-08-30

| | Cantidad |
|---|---:|
| Productos activos | 736 |
| Sin proveedor | 458 (62%) |
| Con costo cargado | 274 |
| Con precio revisado | **0** |
| Con stock y precio $0 | 64 |
| Vendiéndose a pérdida | 9 |

**Margen promedio 27,0%, mediana 35,7%.** La brecha importa: la mayoría del
catálogo tiene buen margen y unos pocos con costo mal cargado arrastran el
promedio. Los umbrales de envío gratis se calcularon con el promedio, así que
quedaron del lado conservador.

### El error que motivó la columna "unidades por bulto"

De los 9 productos a pérdida, **6 son el costo del bulto cargado como
unitario**: una marraqueta de $300 con "costo" $1.690 —que es el precio del
kilo—, un queso de 75 g con el precio de la caja, un sachet con el precio del
pack de 24. En todos `pack_size` estaba en NULL y `cost_source` era `manual`.
Los otros 3 son leches con el costo exactamente igual al precio de venta, que
parece el precio cargado en el campo equivocado.

Por eso la grilla pide **el costo tal como viene de la factura** más las
unidades por bulto, y guarda el unitario ya dividido (`costoUnitarioDesdeBulto`
en `pricing.ts`, testeado). Dividir en el servidor y no en la pantalla evita
que el día que alguien cargue desde otro lado se vuelva a guardar el bulto.

### Decisiones que no se ven en el diff

- **Poner el precio marca el producto como revisado.** Exigir un segundo clic
  para `price_reviewed_at` era pedir un gesto que nadie iba a dar, y esa marca
  es la que traba encender `require_reviewed_price`. Un precio en $0 no cuenta:
  dejar un producto sin precio no es una decisión revisada.
- **Una fila mala no tumba el lote.** Quien cargó treinta productos no debería
  perder veintinueve por un error en uno; las que fallan se quedan escritas en
  pantalla para corregirlas.
- **Un costo sin proveedor no se guarda a medias**, y el aviso está arriba de
  la grilla: enterarse al apretar guardar, después de cargar treinta filas, es
  la peor forma de saberlo.
- **El precio sugerido es un botón, no un texto.** Verlo sin poder aplicarlo
  obliga a copiarlo a mano.
- El lote se corta en 200 filas: uno más grande deja a medias un guardado que
  el navegador ya dio por perdido.

### Un bug que encontró el test de la grilla

Si el costo ya estaba cargado y sólo se declaraban las unidades por bulto, la
grilla **ignoraba el cambio** — y ese es justamente el flujo para arreglar los 6
productos a pérdida. Se exigía reescribir el costo para poder corregir el
bulto. Ahora las unidades se aplican también sobre el costo ya guardado.

---

## Doctrinas del proyecto (no romper)

Reglas que este código sostiene a propósito. Romperlas reintroduce errores que
ya costaron trabajo encontrar.

1. **`branch_stock` es la fuente de verdad; `products.stock` es DERIVADO** — la
   suma de las sucursales **activas**. Todo movimiento pasa por
   `src/server/inventory.service.ts`, que es la puerta única: es la que además
   deja el rastro en `inventory_movements`.

   **Desde el 2026-08-27 lo hace cumplir la base, no la disciplina.** Un
   trigger recalcula `products.stock` en cada escritura y otro lo propaga
   cuando se mueve `branch_stock`
   (`20260828000000_products_stock_derivado_por_trigger.sql`). Escribir esa
   columna a mano ya no rompe nada: el valor se reemplaza por el derivado.
   Se hizo así porque la convención sola falló dos veces — la fórmula estaba
   copiada en siete funciones y bastó que ninguna filtrara por sucursal activa
   para que el catálogo mostrara el doble del stock real.

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

8. **El contraste se calcula, no se elige a ojo.** Toda la aritmética de color
   vive en `src/lib/brand-palette.ts`, igual que la de precios vive en
   `pricing.ts`. Un botón primario nuevo usa `bg-brand-boton
   text-brand-contraste`; el color de marca como texto sobre fondo claro usa
   `text-brand-texto`. **No** `bg-brand-600 text-white`: ese par da 3,77:1 y el
   mínimo es 4,5. Los tokens salen de `ajustarHastaContraste()`, que garantiza
   el mínimo sea cual sea el color que el dueño elija en el panel, y hay tests
   que lo verifican para nueve colores distintos.

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

### Uber sí sale por red; Supabase no

A diferencia de Supabase, `auth.uber.com` y `api.uber.com` **están en el
allowlist del entorno** desde el 2026-08-28 y responden. Si vuelven a dar 403,
es configuración del entorno y aplica sólo a sesiones nuevas: no se rodea, se
pide que lo agreguen (y que dejen marcada la casilla de los gestores de
paquetes, porque sin ella se rompe npm).

### El `fee` de Uber viene en centavos aunque el CLP no tenga centavos

`fee: 338400` con `currency_type: "CLP"` son **$3.384, no $338.400**. Uber usa
exponente 2 fijo. Toda lectura del `fee` divide por 100. Ver "Uber Direct: la
cotización real" más arriba.

### `pickup_address` y `dropoff_address` van como string, no como objeto

Son un `JSON.stringify(...)` metido en un campo de texto. Mandarlos como objeto
devuelve **400 sin explicar por qué**. El endpoint de token, además, está
limitado a 100 pedidos por hora: la integración tiene que cachear el token, no
pedir uno por cotización. El token que devolvió dura 30 días.

---

## Lo que queda por hacer, después de las migraciones

Ordenado por lo que cuesta plata.

1. **Depurar el catálogo y encender `settings.require_reviewed_price`.** La
   regla nace apagada a propósito: encenderla sin depurar sacaría del aire casi
   todo el catálogo, porque `price_reviewed_at` arranca en `NULL` para todos.
   El orden es: mirar en la pantalla de Precios cuántos quedarían fuera,
   depurar esa lista, y recién entonces encenderla.

   **Medido el 2026-08-27 (paso "mirar" ya hecho).** Encenderla hoy dejaría
   fuera **725 de 725** productos activos: vendibles, cero. El desglose importa
   más que el total, porque separa dos trabajos muy distintos:

   | Situación | Productos | Qué hace falta |
   |---|---:|---|
   | Sin ningún proveedor asignado | **459** | Cargar proveedor y costo. Necesita las facturas. |
   | Con proveedor pero sin costo | 2 | Cargar el costo. |
   | Con costo y precio sano, sólo sin revisar | **247** | Mirar y confirmar. Es un clic por producto. |
   | Con costo pero el precio hay que decidirlo | 17 | Ver abajo. |

   **Avance del 2026-08-27 con cinco facturas del dueño:** sin costo bajó de
   461 a **458**. Ver "Carga de costos desde facturas" más abajo.

   O sea: el cuello de botella no es revisar precios, es que **el 63% del
   catálogo no tiene proveedor cargado**. Y de lo que sí tiene costo, el margen
   promedio es **27,5%** — 162 productos con margen sano (≥35%), 85 medio.

   Ese paso no lo puede hacer una sesión: cargar 459 costos requiere las
   facturas reales de los proveedores. Inventarlos sería exactamente lo que la
   migración evitó al no rellenar `price_reviewed_at` con una fecha falsa.

   **Los 17 con costo y precio a decidir, que es lo accionable ya.** Cinco
   tienen el costo cargado en la unidad en que se **compra** y el precio en la
   unidad en que se **vende**, así que el margen que muestran es ficticio:

   - Queso Cheddar Loreley 75 Gr — precio $1.000, costo $8.200
   - Marraqueta unidad y Hallulla unidad — precio $300, costo $1.690 (es el
     costo del **kilo** de pan, no de la unidad)
   - Pila AAA 2 unidades — precio $1.000, costo $4.900
   - Pomarola Sachet — precio $800, costo $1.860; el nombre del producto ya
     dice "(pack 24 un.)", o sea que alguien notó la discrepancia y la anotó
     en el nombre porque no hay campo donde ponerla

   Los otros: tres leches Surlat a margen exactamente 0% (precio $1.500 =
   costo $1.500), y el resto entre 2,8% y 11,7%. Esos sí son decisiones de
   precio reales, no errores de unidad.

   **Corolario — corregido el 2026-08-27 al revisar facturas reales.** La
   primera versión de esta nota decía que no había forma de declarar que se
   compra por caja y se vende por unidad. **Es falso:**
   `product_suppliers.pack_size` existe, tiene UI en el panel (Proveedores →
   Asignar) y lo usa el motor de reposición; 43 de 310 filas lo tienen cargado.

   El problema real es más simple y más fácil de arreglar: en esos cinco
   productos alguien cargó **el costo del pack como `unit_cost`**, cuando
   `unit_cost` tiene que ser el costo de **una unidad de venta**. Que se hace
   bien en otros lados lo prueba la factura de Nestlé del 24/08: viene a
   $25.312 la caja de 16 y en la base está cargado $1.582 — la división
   exacta. Alguien la hace a mano en cada recepción.

   Lo que sí falta es una **red de contención**: nada avisa cuando un
   `unit_cost` deja un margen absurdo. Un producto que se vende a $300 con
   costo $1.420 debería saltar solo, y hoy hay que ir a buscarlo. La pantalla
   de Precios ya calcula `bajo-costo`; lo que falta es que eso llegue a la
   cara del que carga el costo, no sólo a un informe que nadie abre.

2. ~~**Normalizar `order_items.product_id` y ponerle clave foránea.**~~
   **Hecho el 2026-08-27** (`20260828000100_order_items_fk_a_products.sql`).
   La columna pasó de `text` a `bigint` con FK a `products(id)` y
   `ON DELETE RESTRICT`. Las 19 líneas existentes casaban todas, así que la
   conversión no perdió nada — y salió barato justamente porque se hizo con
   pocos datos.

   `RESTRICT` y no `CASCADE`: una línea de pedido es el registro de que
   alguien compró algo. Que borrar un producto se lleve puesta esa venta es
   peor que no poder borrarlo; para sacarlo de circulación está `is_active`.
   La ruta `DELETE /api/products` traduce el error de Postgres a una frase
   que dice qué hacer en vez del código `23503`.

   La migración lleva un guard que la aborta si alguna fila no apunta a un
   `products.id` válido, con el conteo en el mensaje. Probado contra un
   Postgres 16 real: rechaza un producto inexistente, rechaza un barcode
   puesto donde va un id, frena el borrado de un producto con ventas y deja
   borrar uno sin ellas.

3. ~~**Menor:** `products.purchase_price` ya no debería editarse a mano.~~
   **Hecho el 2026-08-27** (`20260828000400_purchase_price_derivado_por_trigger.sql`).

   Al revisarlo resultó **no ser tan menor como decía esta nota**. La versión
   anterior afirmaba que "con el trigger de #72 se recalcula igual, así que no
   es urgente" — y eso es inexacto. El trigger de #72 está sobre
   **`product_suppliers`**: se dispara cuando cambia un costo, no cuando
   alguien escribe `products.purchase_price` directamente. El editor masivo lo
   escribe en cada guardado, así que el valor viejo quedaba hasta la próxima
   vez que se tocara el costo de ese proveedor, y mientras tanto el margen de
   ese producto se calculaba contra una cifra desactualizada. Es el mismo error
   que tenía `products.stock`, en la columna de al lado.

   El arreglo es simétrico —un trigger en `products` que deriva la columna—
   **pero con la excepción de #72 respetada**: sólo pisa el valor cuando hay un
   proveedor preferido con costo. Los **8 productos** cuyo costo es una cifra
   cargada a mano, sin proveedor, la conservan; para ellos ese número es el
   único dato de costo que existe. Probado contra Postgres 16 con seis casos,
   incluidos "asignarle proveedor a uno que no tenía pasa a derivar" y "un
   INSERT sin proveedor conserva su costo".

4. **Menor:** el tipo de `settings` declara `paypal` y `crypto` como medios de
   pago; el checkout sólo implementa MercadoPago. `PaymentSection` ya lo
   explica honestamente, así que es esquema muerto, no un control que miente.

5. **Decisión de color, no de código (2026-08-28).** Quedan dos textos bajo el
   mínimo de contraste, y arreglarlos cambia un color que la gente reconoce, así
   que la decisión es tuya. Es un cambio de una línea en cada caso:

   - **Banner de ofertas de la portada.** "Descuentos hasta 40% OFF" está en
     2,13:1 y su bajada en 1,69:1. Pasar el degradado de `amber-500/orange-500`
     a `amber-700/orange-700` lo deja en 5,02:1 — ámbar quemado en vez de ámbar
     brillante.
   - **Botón "Chat directo por WhatsApp" en /contacto**, 1,98:1. Pasar de
     `#25D366` (el verde claro de WhatsApp) a `#075E54` (el verde oscuro, que
     también es oficial de WhatsApp) lo deja en 7,67:1.

   Si preferís que se vean como están, se quedan: es un banner promocional y un
   botón que la gente encuentra igual por el logo. Detalle en "El verde de marca
   no se leía encima de sí mismo".

   - **Los bordes de los campos de formulario**, aparte. `border-gray-200` da
     1,24:1 contra el fondo y el mínimo no textual es 3, así que en 16 campos
     de contacto, login, registro y los buscadores no se distingue dónde
     empieza el campo. El reemplazo es `border-gray-500` (4,83:1) — no
     `border-gray-400`, que da 2,54:1 y sigue fallando. Tampoco lo toqué porque
     cambia el peso visual de todos los formularios del sitio.

---

## Documentos relacionados

- `docs/PLAN_PRECIOS.md` — la auditoría completa del módulo de precios, costos
  y reposición, con los hallazgos y su estado. **Actualizado**: fases 1 a 5
  completas.
- `docs/PLAN_MEJORA.md` — plan anterior, más amplio.
