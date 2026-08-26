# TODO-HUMANO — lo que falta para abrir

Este archivo consolida lo que **solo tú puedes hacer**: datos reales que no se
pueden inventar, cuentas que hay que crear y decisiones de negocio. Mientras
falten, el sitio funciona, pero no se puede abrir con seguridad.

Al resolver cada punto, edita el archivo indicado y borra el comentario
`TODO-HUMANO` correspondiente.

---

## 🚦 Estado actual: la tienda está en MODO VITRINA

El sitio se puede publicar ya. Los clientes ven el catálogo completo, las
fichas, las landings de comuna y el punto de envíos, y Google puede indexarlo
todo — pero **nadie puede pagar ni dejar un pedido**: las rutas de cobro
responden 503 con un aviso.

El bloqueo es del servidor, no un botón escondido, así que tampoco se puede
saltar llamando la API a mano.

**Para abrir:** panel → Configuración → Políticas → desactivar *"Modo vitrina"*.
Surte efecto en segundos, sin desplegar. Ahí mismo puedes editar el aviso que
se muestra mientras tanto.

No lo desactives hasta cerrar los puntos 🔴 de abajo.

---

## 🧭 El panel te dice en qué vas

Antes de leer la lista: en el admin hay una pantalla que **comprueba sola** casi
todo lo de abajo — **Resumen → Estado de apertura**.

Verifica de verdad si las migraciones se aplicaron, si el modo vitrina está
activo, qué variables faltan en Vercel, cuántos productos no se ven y por qué,
y si el stock del catálogo cuadra con el de la sucursal. Este archivo explica
*qué* hay que hacer; el panel dice *qué falta ahora mismo*, que cambia cada día.

Lo único que no puede comprobar es la prueba de compra real (punto G): pagar,
recibir el correo y ver el pedido marcado como pagado.

---

## 🔴 Bloquea la apertura — sin esto no se puede cobrar

### A. Aplicar las migraciones pendientes a la base

```
supabase db push
```

Sin esto la columna `preview_mode` no existe, y la tienda queda **en vitrina
de todos modos** (el código cierra ante la duda), así que el sitio no vendería
aunque desactives el interruptor. Las migraciones nuevas son:

- `20260825000000_document_express_delivery_columns.sql` — registra columnas que
  ya existían en la base sin archivo. No cambia nada, solo alinea el historial.
- `20260825010000_add_store_preview_mode.sql` — agrega el modo vitrina.

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

La URL del webhook de MercadoPago debe registrarse **con `www`**: el dominio
raíz responde 307 y los webhooks no siguen redirecciones. Es exactamente lo que
hizo que los eventos de Resend no llegaran nunca.

### D. Reconciliar el stock antes de vender

> El panel de **Estado de apertura** te lista exactamente qué productos están
> descuadrados y cuáles no tienen stock de sucursal, así que no hace falta
> consultar la base a mano.

El catálogo y el carrito leen el stock de la sucursal, que es de donde se
descuenta. Hasta ahora había cuatro caminos que escribían el stock con
criterios distintos y se pisaban entre sí; ya quedó uno solo, pero **los
números que dejaron los caminos viejos siguen ahí**.

Antes de abrir conviene hacer un conteo y dejarlos correctos, o vas a vender lo
que no tienes. Después de la primera recepción y la primera venta, mira la
tabla `inventory_movements`: cada movimiento debe aparecer con su motivo
(`RECEPTION`, `POS_SALE`, `WEB_SALE`, `MANUAL_ADJUSTMENT`).

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

1. **El RUT de Inversiones El Olivo SpA.** Va en `BUSINESS.rut`
   (`src/lib/seo/business.ts`). Mientras sea `null` la línea simplemente no se
   muestra — no se inventa —, pero los términos de un comercio chileno deben
   identificar al proveedor, así que es lo único que falta para que estén
   completos.

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
> los agrupa por lo que les falta: foto, precio, categoría o nombre.

Un producto **no aparece en la tienda** si le falta cualquiera de estas cuatro
cosas: nombre, categoría, precio mayor a 0, o **foto propia**. La foto es la
que más suele faltar.

Panel → Productos → Edición masiva permite ver de una pasada cuáles están
incompletos y arreglarlos ahí mismo.

---

## 🟡 Antes de la primera campaña, no antes de abrir

### G. Prueba de compra real, de punta a punta

Con la tienda recién abierta, hazte un pedido de verdad con tu propia tarjeta,
por el monto más bajo posible, y comprueba la cadena completa:

1. El pedido aparece en el panel.
2. Llega el correo de confirmación.
3. El estado pasa a pagado solo (eso confirma que el webhook está bien).
4. El stock del producto bajó.
5. El cobro aparece en tu cuenta de MercadoPago.

Es la única prueba que no se puede simular desde el código: yo no tengo acceso
ni a tu base ni a tu cuenta de MercadoPago.

### H. Cuenta de correo verificada en Resend

El dominio del remitente tiene que estar verificado o los correos caen en spam
—o no salen. Revisa `RESEND_FROM_EMAIL`.

---

## 🟢 No bloquea abrir — mejora el posicionamiento local

### 1. CID de Google Business Profile
- **Archivo:** `src/lib/seo/business.ts` (`BUSINESS.googleCid`)
- **Estado:** `null`. Se omite `hasMap` del schema. Con el CID se enlaza el sitio con
  la ficha de Google, que es la señal que más pesa en el pack local.
- **Cómo obtenerlo:** en la URL larga de la ficha aparece como
  `...?cid=XXXXXXXXXXXXXXXXX`. Otra vía: en Google Maps, ficha del negocio →
  Compartir → "Insertar un mapa"; el HTML del iframe contiene el CID.
- *(Quedaste en revisarlo.)*

---

## 🟢 No bloquea abrir — mejora conversión y contenido

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
  $35.000 en las comunas con cobertura. Implementado en `src/lib/shipping-policy.ts`,
  con 15 tests, y conectado al checkout (antes el envío gratis por monto estaba
  configurado en la base de datos pero **el checkout nunca lo aplicaba**).
- **Coordenadas exactas del local**: `-33.472904287482656, -70.59850517606597`.
  Aplicado en `BUSINESS.geo` (antes `null`, se omitía del JSON-LD) y en
  `settings.shipping_origin_lat/lng`, la coordenada real que usa el checkout para
  calcular el envío a domicilio. El valor anterior en `settings` estaba desfasado
  ~2.3km del local real — se detectó en una compra de prueba real y se corrigió
  con la migración `20260730000000_set_real_shipping_origin_coords.sql`.

---

## 🔵 Planificado a futuro (no publicado)

### Uber Direct
- **Estado:** mencionado como plan, **no** aparece en el sitio. No se publica un
  servicio que todavía no existe: marcarlo en schema o prometerlo en una landing sin
  tenerlo operativo daña la confianza y contradice las guías de Google.
- **Hay código escrito y sin mergear** en el [PR #56](https://github.com/fabricioseidel/OlivoWeb/pull/56):
  cliente de la API, regla de subsidio con tests, recotización al confirmar, webhook
  firmado y la opción en el checkout. Nadie lo revisó (solo comentaron los bots).
- **Para retomarlo hay que hacer, en este orden:**
  1. **Rebasarlo sobre `main`.** Su base es del 31 de julio y choca en tres archivos:
     `api/checkout/create-order/route.ts`, `checkout/page.tsx` y
     `checkout/components/ShippingForm.tsx`. Los tres se reescribieron en #63 y #64
     (envío gratis por distancia, motivo cuando no aplica, método de envío inválido),
     así que los conflictos son sobre lógica de cobro y hay que resolverlos a mano.
  2. **Probar contra la API real** con las credenciales de prueba. Es lo único que
     confirma el manejo de montos en CLP, que la propia descripción del PR deja
     pendiente.
  3. **Cargar las cinco variables en Vercel** y registrar el webhook **con `www`**:
     el dominio raíz responde 307 y los webhooks no siguen redirecciones.
- **Ya resuelto:** las columnas `express_*` de `orders` existían en la base pero no
  tenían archivo de migración. Se agregó
  `supabase/migrations/20260825000000_document_express_delivery_columns.sql`, que es
  idempotente: no cambia nada sobre la base actual y deja el mismo esquema en una
  base nueva.
- **Cuando esté operativo:** avísame y lo agrego como servicio con su propia sección en
  las landings de comuna y en el schema (`GroceryStore.makesOffer`), además de ajustar
  los plazos de entrega, que pasarían de "día siguiente 08:00–14:00" a minutos.

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
  envío gratis sobre $35.000**, pero no tiene landing propia (el spec pedía 4 landings
  de comuna, no 5). Si se quiere posicionar, replicar el patrón de las otras cuatro.
- **El tope de $1.500 aplica solo a Ñuñoa y Macul**, según lo indicado. Vive en
  `TOPE_POR_COMUNA` (`src/lib/shipping-policy.ts`); agregar otra comuna es una línea.
- **Si no se puede determinar la comuna** de la dirección, el checkout cobra la tarifa
  por distancia sin tope. Es deliberado: ante la duda nunca cobra de menos.
- **`free_shipping_minimum` pasó de $25.000 a $35.000** en la configuración de la
  tienda, según lo pedido.
