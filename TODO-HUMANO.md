# TODO-HUMANO — datos que faltan para cerrar el SEO local

Este archivo consolida **todos** los `// TODO-HUMANO` que quedan en el código. Son
datos reales que no se pueden inventar: mientras falten, el sitio funciona y el
schema es válido, pero se pierden señales de posicionamiento local.

Al resolver cada punto, edita el archivo indicado y borra el comentario
`TODO-HUMANO` correspondiente.

---

## 🔴 Pendiente — bloquea señales de SEO local

### 1. Coordenadas exactas del local
- **Archivo:** `src/lib/seo/business.ts` (`BUSINESS.geo`)
- **Estado:** `null`. La propiedad `geo` se **omite** del JSON-LD (no se emite `null`,
  que invalidaría el bloque). Sin `geo`, Google infiere la ubicación desde la
  dirección de texto, lo que debilita el ranking en búsquedas "cerca de mí".
- **Cómo obtenerlas (2 minutos, desde el computador):**
  1. Abre [google.com/maps](https://www.google.com/maps) y busca "Olivo Market Ñuñoa".
  2. **Clic derecho** sobre el pin rojo del local.
  3. La primera línea del menú son dos números, por ejemplo `-33.487123, -70.610456`.
     Haz clic ahí: se copian al portapapeles.
  4. Pégalos en `BUSINESS.geo` → `latitude: -33.487123, longitude: -70.610456`.
- **Nota:** el enlace corto que compartiste (`maps.app.goo.gl/...`) no expone las
  coordenadas; hay que abrirlo en Maps y hacer el clic derecho sobre el pin.

### 2. CID de Google Business Profile
- **Archivo:** `src/lib/seo/business.ts` (`BUSINESS.googleCid`)
- **Estado:** `null`. Se omite `hasMap` del schema. Con el CID se enlaza el sitio con
  la ficha de Google, que es la señal que más pesa en el pack local.
- **Cómo obtenerlo:** en la URL larga de la ficha aparece como
  `...?cid=XXXXXXXXXXXXXXXXX`. Otra vía: en Google Maps, ficha del negocio →
  Compartir → "Insertar un mapa"; el HTML del iframe contiene el CID.
- *(Quedaste en revisarlo.)*

---

## 🟡 Pendiente — mejora conversión y contenido

### 3. Foto real de la fachada
- **Archivo:** `src/lib/seo/business.ts` (`BUSINESS.facadePhoto`)
- **Estado:** `null`, por lo que `image[]` se omite del schema y las landings locales
  no muestran foto. El `alt` ya está preparado para incluir "Ñuñoa".
- **Qué hacer:** sube la foto (por ejemplo desde el Constructor Visual) y pega la URL
  pública en ese campo. Idealmente con el letrero visible.

### 4. Tiempos de entrega del despacho propio por comuna
- **Archivos:** `src/app/delivery/{nunoa,macul,penalolen,san-joaquin}/page.tsx`
- **Pregunta:** para el **despacho de productos del minimarket** (no encomiendas de
  courier): ¿cuál es el tiempo de entrega comprometido en cada comuna? ¿Hay entrega el
  mismo día si el pedido entra antes de cierta hora? ¿Algún sector fuera de cobertura,
  por ejemplo los sectores altos de Peñalolén?
- **Estado:** las páginas describen la distancia relativa pero no comprometen un plazo.
  **Los costos sí son reales**: se leen en vivo desde la configuración de la tienda
  (`settings`), así que no hay riesgo de publicar un precio que el checkout no respete.
- **Nota:** lo que confirmaste sobre "el tiempo depende de la app del courier" aplica a
  las encomiendas y ya está reflejado en las páginas de courier. Esto es distinto: es
  el reparto propio de la tienda.

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

---

## Decisiones tomadas que conviene revisar

- **`/centro-logistico` ahora redirige (301) a `/punto-de-envio`.** Ambas cubrían el
  mismo tema y competían por las mismas búsquedas (canibalización). `/punto-de-envio`
  quedó como canónica porque tiene FAQPage, páginas por courier y segmentación local.
- **El H1 de la portada se edita desde el Constructor Visual.** Su valor por defecto es
  "Olivo Market Ñuñoa — Productos venezolanos y punto de envíos". Si se edita y se le
  quita "Ñuñoa", se pierde la señal local más fuerte de la home.
- **La comuna La Reina** está declarada en `areaServed` del schema pero **no tiene
  landing** propia (el spec pedía 4 landings de comuna, no 5). Si se quiere posicionar,
  replicar el patrón de las otras cuatro con contenido propio.
