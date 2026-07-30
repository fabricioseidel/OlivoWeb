# TODO-HUMANO — datos que faltan para cerrar el SEO local

Este archivo consolida **todos** los `// TODO-HUMANO` que quedan en el código. Son
datos reales que no se pueden inventar: mientras falten, el sitio funciona y el
schema es válido, pero se pierden señales de posicionamiento local.

Al resolver cada punto, edita el archivo indicado y borra el comentario
`TODO-HUMANO` correspondiente.

---

## 🔴 Pendiente — bloquea señales de SEO local

### 1. CID de Google Business Profile
- **Archivo:** `src/lib/seo/business.ts` (`BUSINESS.googleCid`)
- **Estado:** `null`. Se omite `hasMap` del schema. Con el CID se enlaza el sitio con
  la ficha de Google, que es la señal que más pesa en el pack local.
- **Cómo obtenerlo:** en la URL larga de la ficha aparece como
  `...?cid=XXXXXXXXXXXXXXXXX`. Otra vía: en Google Maps, ficha del negocio →
  Compartir → "Insertar un mapa"; el HTML del iframe contiene el CID.
- *(Quedaste en revisarlo.)*

---

## 🟡 Pendiente — mejora conversión y contenido

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
- **Cuando esté operativo:** avísame y lo agrego como servicio con su propia sección en
  las landings de comuna y en el schema (`GroceryStore.makesOffer`), además de ajustar
  los plazos de entrega, que pasarían de "día siguiente 08:00–14:00" a minutos.

## Decisiones tomadas que conviene revisar

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
