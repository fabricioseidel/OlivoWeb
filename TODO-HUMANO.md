# TODO-HUMANO — lo que falta

Este archivo consolida lo que **solo tú puedes hacer**: datos reales que no se
pueden inventar, cuentas que hay que crear y decisiones de negocio.

Al resolver cada punto, edita el archivo indicado y borra el comentario
`TODO-HUMANO` correspondiente.

> **Verificado contra la base y los logs de producción el 5-sep-2026.** Lo que
> antes decía este archivo sobre el modo vitrina, las migraciones, el stock y
> Uber Direct estaba desactualizado y llevaba a conclusiones equivocadas. Cada
> punto de abajo dice ahora si se comprobó y cómo.

---

## 🚦 Estado actual: la tienda está ABIERTA

`preview_mode` está en `false`: el checkout acepta pedidos y cobra de verdad.
El modo vitrina ya no está puesto.

Eso cambia cómo se lee este archivo. Lo que queda pendiente no es "falta esto
para poder abrir", es **"esto está corriendo así ahora mismo"**.

Para volver a cerrar las ventas sin bajar el sitio: panel → Configuración →
Políticas → activar *"Modo vitrina"*. Surte efecto en segundos, sin desplegar.

### Cuántas ventas reales van

Una: la prueba de $500 del 30-jul, pagada con tarjeta propia. Pasó de creada a
`paid` en **2 minutos con 6 segundos**, que es el webhook de MercadoPago
confirmando — no se movió a mano.

Los otros 8 pedidos de la base son pruebas y carritos abandonados. Ninguno
tiene plata de un cliente comprometida.

## 🧭 El panel te dice en qué vas

Antes de leer la lista: en el admin hay una pantalla que **comprueba sola** casi
todo lo de abajo — **Resumen → Estado de apertura**.

Verifica de verdad si las migraciones se aplicaron, si el modo vitrina está
activo, qué variables faltan en Vercel, cuántos productos no se ven y por qué,
y si el stock del catálogo cuadra con el de la sucursal. Este archivo explica
*qué* hay que hacer; el panel dice *qué falta ahora mismo*, que cambia cada día.

Lo que no puede comprobar es la prueba de compra real (punto G) ni el
historial de webhooks de MercadoPago, que vive en el panel de MP.

---

## 🔴 Crítico — está corriendo así ahora mismo

### A. ~~Aplicar las migraciones pendientes a la base~~ ✅ HECHO

Todas las migraciones del repo están aplicadas. Se comprobó una por una contra
el historial de la base el 5-sep-2026.

Faltaban dos que nunca se habían corrido, y ya se aplicaron:

- **`audit_logs`** — la tabla no existía, pero `src/server/audit.service.ts`
  escribe en ella. Toda la auditoría de pedidos pagados, cambios de estado y
  bootstrap de admin se estaba perdiendo en silencio (el servicio traga el
  error a propósito, para no romper la operación de negocio). Ya creada y con
  RLS; a las pocas horas tenía 77 filas.
- **`harden_orders_rls`** — faltaban las 6 políticas RESTRICTIVE que bloquean
  insert/update/delete de `anon`/`authenticated` en `orders` y `order_items`.

`preview_mode` existe y está en `false`.

### B. Confirmar qué token de MercadoPago está cargado

Panel → Configuración → Métodos de Pago. El diagnóstico dice cuál está activo.

Un token que empieza con `APP_USR-` **cobra de verdad**. Cualquier otro es de
prueba y los pedidos que entren no te van a pagar nada. Decide con cuál abres.

> Ojo: antes esta pantalla tenía un interruptor de *"modo prueba (sin cobros
> reales)"* que **no estaba conectado a nada**. Si alguna vez lo activaste
> creyendo que estabas probando en seguro, los cobros fueron reales igual. Ya
> se quitó y la pantalla ahora dice la verdad.

### C. Cargar las variables que faltan en Vercel

| Variable | Qué pasa sin ella |
|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | El checkout falla al crear el pago. No se puede vender. |
| `MERCADOPAGO_WEBHOOK_SECRET` | El webhook rechaza todas las notificaciones: **los pedidos pagados nunca se marcan como pagados**. |
| `CRON_SECRET` | Los turnos de caja no se cierran solos. |
| `RESEND_API_KEY` | No sale ningún correo: ni confirmación de pedido ni recuperación de contraseña. |
| `NEXT_PUBLIC_SITE_URL` | MercadoPago vuelve a un dominio equivocado tras pagar. |

La URL del webhook de MercadoPago debe registrarse **con `www`**, y la ruta es
`/api/payments/webhook` — no `/api/webhooks/mercadopago`. El dominio raíz
responde 307 y los webhooks no siguen redirecciones: es exactamente lo que hizo
que los eventos de Resend no llegaran nunca.

**Qué se pudo comprobar desde afuera** (5-sep-2026). No tengo acceso a los
valores de las variables en Vercel, así que esto se deduce del comportamiento:

| Variable | Evidencia |
|---|---|
| `RESEND_API_KEY` | ✅ Cargada. Hay correos entregados el 4-sep, segundos después del pedido. |
| `MERCADOPAGO_ACCESS_TOKEN` | ✅ Presente. El checkout crea pagos; si faltara, fallaría al crear la preferencia. |
| `MERCADOPAGO_WEBHOOK_SECRET` | ❓ **Sin comprobar.** Funcionó el 30-jul; desde entonces no hay un pago real que lo pruebe. |
| `UBER_DIRECT_*` | ⚠️ Presentes pero con algo mal — ver la sección de Uber Direct. |
| `CRON_SECRET` | ❓ Sin comprobar. |
| `NEXT_PUBLIC_SITE_URL` | ❓ Sin comprobar. |

Para el `MERCADOPAGO_WEBHOOK_SECRET` no hace falta adivinar: **MP → Tus
integraciones → Webhooks** tiene el historial de entregas con el código de
respuesta de cada notificación. Si aparecen con 401, el secret no coincide; si
no aparece ninguna, la URL no está registrada.

> El plan Hobby de Vercel guarda los logs de runtime **1 hora**, así que un
> problema de ayer ya no se puede mirar ahí. La tabla de errores agrupados sí
> llega a 7 días, pero sólo recoge excepciones, no un 401 devuelto a propósito.

### D. ~~Reconciliar el stock antes de vender~~ ✅ CUADRA

Comprobado el 5-sep-2026: **715 productos activos, todos cuadran** entre
`products.stock` y la suma de `branch_stock`. Cero desalineados y cero
productos con stock pero sin fila de sucursal.

Los movimientos salen con su motivo, como corresponde: `RECEPTION` 656,
`WEB_SALE` 62, `MANUAL_ADJUSTMENT` 1.

Esto se descuadra solo con el uso, así que conviene volver a mirarlo desde
**Estado de apertura** cada tanto, no darlo por resuelto para siempre.

### E. Revisar los documentos legales y entregar el RUT

Las tres páginas **ya están escritas y publicadas**, enlazadas desde el pie y
desde el checkout:

- `/legal/terminos` — condiciones de venta
- `/legal/privacidad` — qué datos se recogen y con quién se comparten
- `/legal/devoluciones` — cambios, devoluciones y derecho a retracto

Los datos operativos (horarios, comunas, ventana de entrega, tope de despacho)
salen de las mismas constantes que usa el checkout, así que el documento no
puede prometer una cosa mientras el sistema cobra otra.

**Lo que falta de tu parte:**

1. ~~**El RUT de Inversiones El Olivo SpA.**~~ **Entregado el 2026-09-05**:
   `78.002.865-3`, cargado en `BUSINESS.rut` (`src/lib/seo/business.ts`). Ya
   aparece al pie de las tres páginas legales.

2. **Léelos y confirma que describen tu operación.** Escribí lo que hace el
   sistema hoy, pero hay decisiones de negocio que son tuyas y conviene que
   revises: el plazo de 48 horas para avisar de un producto en mal estado, que
   el despacho de ida no se reembolsa si el cliente se retracta, y qué queda
   fuera del derecho a retracto por ser perecible.

3. **Si el volumen lo justifica, que los mire un abogado.** Son un punto de
   partida sólido y honesto, no una asesoría legal. Lo más sensible es el
   tratamiento de datos personales: Chile está en transición hacia la Ley
   21.719, que crea una agencia de protección de datos, y conviene confirmar
   qué exige a la fecha en que abras.

### F. Revisar que los productos se vean

> El panel de **Estado de apertura** te dice cuántos productos no aparecen y
> los agrupa por lo que les falta.

Un producto **no aparece en la tienda** si le falta cualquiera de estas cinco
cosas: nombre, categoría, precio mayor a 0, foto propia, **o costo de
proveedor**. El costo es el que más apaga y el que menos se nota, porque el
producto se ve completo en el panel.

Medido el 5-sep-2026 sobre 734 productos activos:

| Motivo | Productos |
|---|---|
| Sin costo de proveedor | **349** |
| Sin foto | 42 |
| Sin precio | 28 |
| **Visibles en la tienda** | **315** |

Los 349 sin costo tienen nombre, categoría, precio y foto: les falta sólo
`purchase_price`, que se deriva de `product_suppliers.unit_cost`. Es la
diferencia entre mostrar 315 productos y mostrar 664.

Panel → Productos → Edición masiva permite ver de una pasada cuáles están
incompletos y arreglarlos ahí mismo.


## 🟡 Importante, no urgente

### G. Prueba de compra real — hecha una vez, conviene repetirla

Ya se hizo: el pedido de $500 del 30-jul con tarjeta propia. La cadena completa
funcionó, incluido el paso 3, que es el que no se puede simular.

Vale la pena repetirla **ahora**, por dos razones: han pasado cinco semanas y
las variables de Vercel pudieron cambiar, y desde entonces se agregó el envío
flash, que crea una entrega de Uber con el pago confirmado y no estaba en esa
prueba.

Qué mirar:

1. El pedido aparece en el panel.
2. Llega el correo de confirmación.
3. El estado pasa a pagado solo (eso confirma que el webhook sigue bien).
4. El stock del producto bajó.
5. El cobro aparece en tu cuenta de MercadoPago.
6. Si elegiste flash: llega el `tracking_url` y el pedido se mueve con los
   estados de Uber.

### H. Cuenta de correo verificada en Resend

El dominio del remitente tiene que estar verificado o los correos caen en spam
—o no salen. Revisa `RESEND_FROM_EMAIL`.

---

## 🟢 Mejora el posicionamiento local

### 1. CID de Google Business Profile
- **Archivo:** `src/lib/seo/business.ts` (`BUSINESS.googleCid`)
- **Estado:** `null`. Se omite `hasMap` del schema. Con el CID se enlaza el sitio con
  la ficha de Google, que es la señal que más pesa en el pack local.
- **Cómo obtenerlo:** en la URL larga de la ficha aparece como
  `...?cid=XXXXXXXXXXXXXXXXX`. Otra vía: en Google Maps, ficha del negocio →
  Compartir → "Insertar un mapa"; el HTML del iframe contiene el CID.
- *(Quedaste en revisarlo.)*

---

## 🟢 Mejora conversión y contenido

### 2. Foto real de la fachada
- **Archivo:** `src/lib/seo/business.ts` (`BUSINESS.facadePhoto`)
- **Estado:** `null`, por lo que `image[]` se omite del schema y las landings locales
  no muestran foto. El `alt` ya está preparado para incluir "Ñuñoa".
- **Qué hacer:** sube la foto (por ejemplo desde el Constructor Visual) y pega la URL
  pública en ese campo. Idealmente con el letrero visible.

---

## ✅ Resuelto con los datos que entregaste

- **Horario del minimarket:** lunes a viernes 07:45–20:30, sábado y domingo 10:00–18:00.
  Aplicado en `BUSINESS.openingHours`, y desde ahí al schema, footer, `/contacto` y las
  10 landings. Se corrigieron todos los textos que traían el horario provisorio.
- **Horario de colecta:** lunes a viernes antes de las 16:00; fin de semana se recibe
  pero la colecta pasa el lunes. Aplicado en `BUSINESS.colecta` y visible en las 4
  páginas de courier — responde la pregunta más frecuente del rubro.
- **Chilexpress con horario propio:** lunes a viernes 08:00–20:00, sin fin de semana.
  Modelado como `horarioPropio` y emitido en el schema como `hoursAvailable`, distinto
  del horario general de la tienda.
- **Servicios reales por courier**, incluyendo lo que **no** se ofrece (Chilexpress sin
  cobro, sin Western Union y sin impresión de etiquetas). Declararlo evita viajes en
  vano y es contenido único que los competidores no publican.
- **Diferenciadores de Bluexpress** (impresión de etiquetas adhesivas en el local y
  sistema de cobro) destacados en el hub y en su página: es la ventaja competitiva más
  concreta del punto.
- **MercadoLibre:** 4 servicios (envío etiquetado, pickup, devolución y cambio, ambos
  con QR) y el **plazo de 7 días** para retirar.
- **Falabella vía Chilexpress**: agregado, es una búsqueda con volumen propio.
- **Tiempos de entrega de encomiendas**: aclarado en cada página que dependen del
  servicio contratado en la app del courier, no del punto de admisión.
- **La colecta no rechaza paquetes**: se aclaró en el hub y en las 4 páginas de courier
  que después de las 16:00 se sigue recibiendo, solo que sale en la colecta siguiente.
  Antes la redacción podía leerse como "después de las 16:00 no reciben".
- **Despacho propio**: ventana de entrega 08:00–14:00, con corte a las 08:00 para
  entrega el mismo día, y retiro en tienda confirmado por correo en menos de una hora.
  Aplicado en las 4 landings de comuna y en el checkout.
- **Tarifas de despacho**: tope de $1.500 para Ñuñoa y Macul, y envío gratis sobre
  el mínimo configurado en las comunas con cobertura (hoy $30.000; el valor vive
  en la base, no en el código). Implementado en `src/lib/shipping-policy.ts`,
  con 15 tests, y conectado al checkout (antes el envío gratis por monto estaba
  configurado en la base de datos pero **el checkout nunca lo aplicaba**).
- **Coordenadas exactas del local**: `-33.472904287482656, -70.59850517606597`.
  Aplicado en `BUSINESS.geo` (antes `null`, se omitía del JSON-LD) y en
  `settings.shipping_origin_lat/lng`, la coordenada real que usa el checkout para
  calcular el envío a domicilio. El valor anterior en `settings` estaba desfasado
  ~2.3km del local real — se detectó en una compra de prueba real y se corrigió
  con la migración `20260730000000_set_real_shipping_origin_coords.sql`.

---

## 📐 Trabajo planificado, aún sin implementar

### Precios, costos y reposición

Plan completo en [`docs/PLAN_PRECIOS.md`](docs/PLAN_PRECIOS.md).

**Lo que necesito de ti para arrancar:**

1. **Los márgenes reales por categoría.** El 35% actual sirve de punto de
   partida, pero las bebidas y los abarrotes no se comportan igual. Sin esto, la
   pantalla de precios va a marcar como problema cosas que no lo son.
2. **El umbral de caducidad**: cuánto tiene que subir un costo para que el precio
   de venta vuelva a revisión. Propongo 5%.
3. **Confirmar que los costos guardados son sin IVA.** Lo deduje leyendo el
   código, no está documentado. Si alguno se cargó con IVA incluido, ese producto
   queda 19% mal.

> ⚠️ Un hallazgo de esa revisión que ya te está costando dinero: el total que
> muestra el motor de reposición antes de comprar está **19% por debajo** de lo
> que vas a pagar, porque suma costos sin IVA. En un pedido de $400.000 son
> $76.000 de diferencia. Lo corrige la Fase 1.

---

## 🟠 Uber Direct — PUBLICADO y funcionando, con credenciales a revisar

Esto ya no es un plan: **el envío flash está vivo en el checkout**. El código
del PR #56 se mergeó y se desplegó.

**Funciona.** Probado el 5-sep-2026 en producción: cotizó **$2.515 y 37
minutos**, con `fee` y ETA completos. Se crea la entrega sólo con el pago
confirmado, y `express_delivery_id` tiene índice único, así que un webhook que
reintenta no pide dos repartidores.

**Lo que hay que revisar:**

1. **Las credenciales.** En los logs de producción del 2 al 4 de septiembre hay
   62 errores `Invalid customer token` y 5 de autenticación HTTP 401. O el
   `UBER_DIRECT_CUSTOMER_ID` no corresponde a las claves cargadas, o están
   mezcladas las de prueba con las de producción. Se revisa en el panel de Uber
   Direct → Desarrollador. Mientras no cotice, el cliente ve desaparecer la
   opción sin explicación.

2. **El tope de $6.500 no está medido de verdad.** La prueba que salió $2.515
   fue a una dirección a 60 metros del local: es tarifa mínima. Falta cotizar a
   una dirección lejana, en hora punta y con lluvia, que es cuando Uber sube.

3. **Si no se puede arreglar pronto, apagarlo.** Sin las tres variables de
   entorno, `uberDirectConfigurado()` devuelve `false` y la opción desaparece
   sola. Ofrecer un servicio que falla es peor que no ofrecerlo.

**Ojo con el conteo de errores:** hasta el PR #89 el checkout cotizaba **una
vez por cada tecla** que el cliente escribía en dirección, comuna o teléfono.
Los 62 errores no son 62 intentos de compra: son unas 5 personas escribiendo su
dirección. Con el debounce puesto, los números de los logs pasan a ser
comparables con la realidad.

**Cuando esté sólido:** avísame y lo agrego como servicio con su propia sección
en las landings de comuna y en el schema (`GroceryStore.makesOffer`), además de
ajustar los plazos de entrega, que pasarían de "día siguiente 08:00–14:00" a
minutos. Hoy no está declarado en el schema, y está bien que así sea hasta que
las credenciales estén firmes.


## 🔍 Abierto y sin diagnosticar

### Error de hidratación de React (#418) en el checkout

Aparece en la consola del navegador al abrir `/checkout` en producción: el HTML
que arma el servidor no coincide con el que arma el navegador. Todavía no sé
qué componente lo causa — el stack viene minificado y averiguarlo desde ahí es
adivinar.

Estaba enterrado entre cientos de errores 403 que generaba `ClickTracker`
(corregido en el PR #89). Con ese ruido apagado, el error queda visible y se
puede diagnosticar con datos.

No sé qué rompe, si es que rompe algo. Un fallo de hidratación puede ir desde
"no se nota" hasta "un botón no responde en la primera carga".

---

## Decisiones tomadas que conviene revisar

- **El sitio no tenía pie de página.** El componente `Footer` existía, tenía su
  test pasando y varios comentarios del código lo daban por vivo, pero no lo
  renderizaba nadie: ninguna página lo mostraba. Con eso faltaba en todo el
  sitio el NAP —nombre, dirección y teléfono— que el trabajo de SEO local da
  por publicado y que Google compara con la ficha del negocio. Ya está montado.

- **Los interruptores del panel que no hacen nada.** Se encontraron tres que se
  guardaban pero nunca se aplicaban: *modo prueba de pagos* (se quitó, mentía
  sobre cobros reales), las *seis casillas de métodos de pago* (el checkout
  ofrece MercadoPago y solo MercadoPago, con una lista fija en el código) y
  *modo mantenimiento*, que sigue ahí pero ahora avisa en el propio panel que
  no está conectado. Si quieres bajar el sitio entero, hoy hay que hacerlo
  desde Vercel; para cerrar solo las ventas está el modo vitrina.

- **El acceso es solo con correo y contraseña.** Se eliminó el inicio de sesión con
  Google (proveedor de NextAuth, botones, variables y la elevación automática a ADMIN
  por `GOOGLE_ADMIN_EMAILS`). Lo que sigue nombrando a Google es de posicionamiento y
  se conserva a propósito: `Googlebot` en `robots.ts`, el JSON-LD y el CID de la ficha
  del negocio. Quitar eso no "saca a Google" del sitio, impide que el minimarket
  aparezca en las búsquedas. Queda una decisión abierta: el iframe de Google Maps en
  las landings de comuna (`MapEmbed` en `components/seo/LocalBlocks.tsx`) sí es visible
  y sí carga contenido de Google; se puede quitar en una línea si lo prefieres sin mapa.

- **`/centro-logistico` ahora redirige (301) a `/punto-de-envio`.** Ambas cubrían el
  mismo tema y competían por las mismas búsquedas (canibalización). `/punto-de-envio`
  quedó como canónica porque tiene FAQPage, páginas por courier y segmentación local.
- **El H1 de la portada se edita desde el Constructor Visual.** Su valor por defecto es
  "Olivo Market Ñuñoa — Productos venezolanos y punto de envíos". Si se edita y se le
  quita "Ñuñoa", se pierde la señal local más fuerte de la home.
- **La comuna La Reina** está declarada en `areaServed` del schema y **sí recibe el
  envío gratis por monto**, pero no tiene landing propia (el spec pedía 4 landings
  de comuna, no 5). Si se quiere posicionar, replicar el patrón de las otras cuatro.
- **El tope de $1.500 aplica solo a Ñuñoa y Macul**, según lo indicado. Vive en
  `TOPE_POR_COMUNA` (`src/lib/shipping-policy.ts`); agregar otra comuna es una línea.
- **Si no se puede determinar la comuna** de la dirección, el checkout cobra la tarifa
  por distancia sin tope. Es deliberado: ante la duda nunca cobra de menos.
- **`free_shipping_minimum` quedó en $30.000**, no en los $35.000 que este
  archivo afirmaba. Comprobado en la base el 5-sep-2026. El mínimo del flash es
  aparte y está en $40.000 (`free_shipping_minimum_flash`). Si querías $35.000,
  se corrige desde el panel, no desde el código.
