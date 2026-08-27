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

---

## Documentos relacionados

- `docs/PLAN_PRECIOS.md` — la auditoría completa del módulo de precios, costos
  y reposición, con los hallazgos y su estado. **Actualizado**: fases 1 a 5
  completas.
- `docs/PLAN_MEJORA.md` — plan anterior, más amplio.
