# Gestión documental

> Panel → OLIVOTEAM → **Administración → Gestión documental** (`/admin/documentos`).
> Sólo la ve el rol **ADMIN**: tiene sueldos e impuestos.

Es el lugar para cuatro preguntas:

1. **¿Qué facturas recibí y cuáles me faltan revisar o pagar?**
2. **¿Qué boletas y facturas emití?** Y también cómo emitir una nueva.
3. **¿Cuánto IVA voy a pagar este mes?** Es el libro mensual con el F29 estimado.
4. **¿Cuándo vence cada pago y cuánto tengo que separar?** Incluye el F29, Previred, la patente y la renta.

---

## Cómo se planificó

La sección se diseñó a partir de siete miradas, cada una hecha por un agente con ese rol. Esto es lo que aportó cada uno y dónde quedó en el sistema.

### Asesor financiero

- **Calendario.**
  - El F29 vence el **día 20**, porque la empresa emite documentos electrónicos y declara por internet. Si ese día es inhábil, se corre al siguiente día hábil.
  - Previred vence el **día 13** si se paga en línea, y ese plazo **no se corre** aunque caiga domingo (DL 3.500, art. 19). Por eso, cuando no es hábil, el sistema propone pagar el día hábil anterior.
  - La patente de Ñuñoa se paga el 31 de enero y el 31 de julio. El F22, el 30 de abril.
- **Cálculo del F29.** IVA de ventas − IVA de compras − remanente anterior, más PPM y retenciones. Las notas de crédito restan del lado donde están (ventas o compras).
- **Voucher como boleta.** El voucher de tarjeta y de MercadoPago vale como boleta, así que no hay que emitir boleta por esas ventas. Sí necesitan boleta el efectivo y la transferencia.
- **Plazo de reclamo.** Una factura recibida queda aceptada sola a los **8 días** (Ley 19.983). El sistema avisa antes de que se cumplan.
- **Tasas 2026, que se pueden editar.**
  - PPM Pro Pyme: 0,125%.
  - Retención de honorarios: 15,25%.
  - Aporte del empleador de la Ley 21.735: 3,5%.
  - Cesantía: 2,4% y 0,6% en contrato indefinido.
  - Mutual: 0,93%.

### Dueño

- Al abrir la sección lo primero que se ve es **qué vence, cuándo y cuánto**, y cuánta **plata hay que separar** en los próximos 30 días.
- Los avisos salen **antes** de cada vencimiento, no el mismo día.
- No hay que tipear línea por línea: el **Registro de Compras y Ventas del SII se importa completo**.

### Empleado

- La factura del proveedor **se fotografía con el celular** apenas llega.
- El **RUT se valida mientras se escribe**, con el dígito verificador.
- Si una factura ya está registrada, el sistema avisa en vez de duplicarla. Compara folio, tipo y RUT del emisor.
- El vendedor no ve sueldos ni impuestos: el menú, la pantalla y la API exigen rol ADMIN.

### Usuario / cliente

- Una factura exige RUT, razón social, giro y dirección.
- Los datos del cliente se copian solos a la nota de crédito.
- Hay un campo de correo para mandarle el documento.
- *Pendiente para una segunda etapa:* elegir boleta o factura en el checkout web y guardar los datos de facturación en «Mi cuenta».

### Desarrollador

- **Datos.**
  - Cinco tablas con RLS, a las que sólo accede `service_role`.
  - Los archivos van a un bucket **privado**. El bucket `uploads` es público.
  - Un trigger congela los documentos de un mes ya declarado.
- **Código.**
  - La lógica tributaria son funciones puras en `src/lib/documentos/` y tiene tests.
  - La emisión pasa por un adaptador de proveedor (`src/server/dte.ts`). Sin proveedor, sólo se generan **borradores**.

### QA

- Los casos de borde tienen tests:
  - notas de crédito
  - remanente
  - exentos
  - redondeo
  - feriados seguidos
  - diciembre que se paga en enero
  - CSV guardado con Excel
  - filas malas que no abortan la importación
- La base rechaza los duplicados.
- No se puede marcar como «emitido» un documento sin folio, ni tocar un mes cerrado.

### Marca y locación

- Usa los tonos `brand-*` del sitio.
- El semáforo de vencimientos lleva siempre **ícono y texto**, nunca sólo color.
- Los textos van en «tú», en español de Chile.
- Formatos: montos como `$12.500` y fechas como `20-10-2026`.
- Los feriados chilenos de 2026 y 2027 están cargados.
- Los datos de la empresa salen de `BUSINESS` (`src/lib/seo/business.ts`).

---

## Cómo se usa, mes a mes

**Durante el mes**

- Cada factura de proveedor que llega se registra con su foto: *Facturas recibidas → Registrar factura*.
- Si piden factura, o hay ventas en efectivo o transferencia sin boleta, el documento se prepara en *Boletas y facturas emitidas → Emitir*.

**Días 1 al 10**

- Descarga del SII el Registro de Compras del mes anterior y el de Ventas.
- Impórtalos con *Importar del SII*. Lo que ya está cargado no se duplica.
- Revisa cada factura con *Está bien* o *Reclamar*. Si reclamas una, hazlo también en el SII.

**Antes del 13**

- Paga Previred.
- Registra el pago en *Calendario de pagos*, con su comprobante.

**Antes del 20**

- Declara el F29.
- Revisa el *Libro del mes*: el monto real es el del formulario del SII.
- Registra el pago y **cierra el mes**. Cerrar congela los documentos y pasa el remanente al mes siguiente.

**Para el contador**

- *Libro del mes → Excel para el contador* genera tres hojas: resumen, ventas y compras.

---

## Qué NO hace (todavía), y por qué

- **No emite documentos con validez ante el SII.** Emitir una boleta o factura válida exige tres cosas: el certificado digital del representante legal, folios autorizados (CAF) y un sistema certificado.
  - Mientras no se conecte un proveedor, "Emitir" deja un **borrador** sin folio.
  - El documento se emite en el portal del SII y después se anota su folio.
  - El sistema nunca inventa un folio.
- **No descarga el Registro de Compras y Ventas solo.** Hay que bajar el CSV del SII e importarlo.
- **Las imposiciones son una estimación.** El monto real es el de la planilla de Previred.
- **El remanente se arrastra sin reajuste UTM.** La diferencia es de pocos pesos al mes.
- **Uber Eats** no registra sus ventas en este sistema, así que no entra en «ventas del sistema».

## Archivos

| Qué | Dónde |
|---|---|
| Página y pestañas | `src/app/admin/documentos/page.tsx`, `src/components/admin/documentos/` |
| API (sólo ADMIN) | `src/app/api/admin/documentos/**` |
| Servicio | `src/server/documentos.service.ts` |
| Adaptador de facturación | `src/server/dte.ts` |
| Lógica pura (RUT, IVA/F29, vencimientos, RCV, imposiciones, emisión) | `src/lib/documentos/` |
| Tablas, trigger y bucket | `supabase/migrations/20260925000000_gestion_documental.sql` |
| Tests | `src/__tests__/documentos-*.test.ts` |
