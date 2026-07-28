# TODO-HUMANO — datos que faltan para cerrar el SEO local

Este archivo consolida **todos** los `// TODO-HUMANO` del código. Son datos reales
que no se pueden inventar: mientras falten, el sitio funciona y el schema es
válido, pero se pierden señales de posicionamiento local.

Al resolver cada punto, edita el archivo indicado y borra el comentario
`TODO-HUMANO` correspondiente.

---

## 🔴 Prioridad alta — bloquean señales de SEO local

### 1. Horarios reales de atención
- **Archivo:** `src/lib/seo/business.ts:106` (`BUSINESS.openingHours` y `openingHoursDisplay`)
- **Pregunta:** ¿Cuál es el horario real de atención de la tienda física, por día?
  ¿A qué hora abre y cierra de lunes a viernes, sábado y domingo? ¿Cierran algún día?
- **Por qué importa:** hoy hay valores **provisorios** (L-V 09:00–21:00, sáb 10:00–21:00,
  dom 11:00–18:00) que ya se están publicando en el schema, el footer, `/contacto` y
  las 10 landings. Si no coinciden con la realidad, Google muestra "abierto" cuando
  está cerrado y eso genera reseñas negativas. **Es el punto más urgente de la lista.**
- **Dónde se refleja:** JSON-LD `openingHoursSpecification`, footer, `/contacto`,
  `/tienda-nunoa`, `/punto-de-envio` y las 4 páginas de courier.

### 2. Coordenadas exactas del local
- **Archivo:** `src/lib/seo/business.ts:80` (`BUSINESS.geo`)
- **Pregunta:** ¿Cuál es la latitud y longitud exacta del local?
- **Cómo obtenerlo:** abrir Google Maps, clic derecho sobre el pin del local →
  la primera opción del menú copia las coordenadas.
- **Estado actual:** `null`. La propiedad `geo` se **omite** del JSON-LD (no se emite
  `null`, que invalidaría el bloque). Sin `geo`, Google tiene que inferir la ubicación
  desde la dirección de texto, lo que debilita el ranking en búsquedas "cerca de mí".

### 3. CID de Google Business Profile
- **Archivo:** `src/lib/seo/business.ts:98` (`BUSINESS.googleCid`)
- **Pregunta:** ¿Cuál es el CID de la ficha de Google Business Profile?
- **Cómo obtenerlo:** en la URL larga de la ficha aparece como `...?cid=XXXXXXXXXXXXXXXXX`.
- **Estado actual:** `null`. Se omite `hasMap` del schema. Con el CID, se enlaza el sitio
  con la ficha de Google, que es la señal que más pesa en el pack local.

---

## 🟡 Prioridad media — mejoran conversión y contenido

### 4. Foto real de la fachada
- **Archivo:** `src/lib/seo/business.ts:91` (`BUSINESS.facadePhoto`)
- **Pregunta:** ¿Tienes una foto de la fachada del local, con el letrero visible?
- **Estado actual:** `null`, por lo que `image[]` se omite del schema y las landings
  locales no muestran foto. El `alt` ya está preparado para incluir "Ñuñoa".
- **Qué hacer:** sube la foto (por ejemplo desde el Constructor Visual) y pega la URL
  pública en ese campo.

### 5. Horario de corte por courier
- **Archivos:**
  - `src/app/punto-de-envio/mercadolibre/page.tsx:138`
  - `src/app/punto-de-envio/chilexpress/page.tsx:135`
  - `src/app/punto-de-envio/bluexpress/page.tsx:128`
  - `src/app/punto-de-envio/correos-de-chile/page.tsx:132`
- **Pregunta:** ¿A qué hora exacta pasa el retiro de cada courier por el local?
  En el caso de Bluexpress, ¿pasa también los sábados?
- **Estado actual:** cada página dice "pasa una vez al día" sin hora. "¿Hasta qué hora
  puedo dejar un paquete?" es una de las consultas más frecuentes de este tipo de
  negocio; responderla con una hora concreta reduce llamadas y mejora la página.

### 6. Devoluciones y etiquetas por courier
- **Archivo:** `src/app/punto-de-envio/page.tsx:147` (tabla comparativa)
- **Pregunta:** para Chilexpress, Bluexpress y Correos de Chile — ¿el local admite
  devoluciones? ¿Se puede imprimir la etiqueta en tienda o el cliente debe traerla?
- **Estado actual:** la tabla dice "Según el vendedor" en la columna de devoluciones,
  que es una respuesta vaga. Con el dato real la tabla pasa a ser un diferenciador.

### 7. Tiempos de entrega por comuna
- **Archivos:**
  - `src/app/delivery/nunoa/page.tsx:83`
  - `src/app/delivery/macul/page.tsx:82`
  - `src/app/delivery/penalolen/page.tsx:81`
  - `src/app/delivery/san-joaquin/page.tsx:81`
- **Pregunta:** ¿Cuál es el tiempo de entrega comprometido en cada comuna? ¿Hay entrega
  el mismo día si el pedido entra antes de cierta hora? ¿Se trabaja con franjas horarias?
  ¿Hay sectores fuera de cobertura (por ejemplo, sectores altos de Peñalolén)?
- **Estado actual:** las páginas describen la distancia relativa pero no comprometen
  un plazo. **Los costos sí son reales**: se leen en vivo desde la configuración de
  la tienda (`settings`), así que no hay riesgo de publicar un precio que el checkout
  no respete.

---

## Decisiones tomadas que conviene revisar

- **`/centro-logistico` ahora redirige (301) a `/punto-de-envio`.** Ambas páginas cubrían
  el mismo tema y competían por las mismas búsquedas (canibalización). `/punto-de-envio`
  quedó como canónica porque tiene FAQPage, páginas por courier y segmentación local.
  El enlace del menú y los enlaces internos se actualizaron.
- **El H1 de la portada se edita desde el Constructor Visual.** Su valor por defecto es
  ahora "Olivo Market Ñuñoa — Productos venezolanos y punto de envíos". Si se edita y se
  le quita "Ñuñoa", se pierde la señal local más fuerte de la home.
- **La comuna La Reina** está declarada en `areaServed` del schema pero **no tiene landing**
  propia (el spec pedía 4 landings de comuna, no 5). Si se quiere posicionar, replicar el
  patrón de las otras cuatro con contenido propio.
