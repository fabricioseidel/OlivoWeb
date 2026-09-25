import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import {
  Breadcrumbs,
  FichaTienda,
  FaqBlock,
  QaPlano,
} from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Punto de Envío en Ñuñoa | MercadoLibre y Couriers",
  description:
    "Punto de retiro y envío de encomiendas en Ñuñoa: MercadoLibre, Chilexpress, Bluexpress y Correos de Chile en Av. José Pedro Alessandri 2010. Impresión de etiquetas, sin cita previa y atención de lunes a domingo.",
  alternates: { canonical: "/punto-de-envio" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/punto-de-envio",
    title: "Punto de Envío en Ñuñoa | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Punto de envío", path: "/punto-de-envio" },
];

/** Estas preguntas se renderizan visibles más abajo: es requisito para FAQPage. */
const FAQS = [
  {
    pregunta: "¿Necesito imprimir la etiqueta antes de llegar?",
    respuesta:
      "Depende del courier. Con Bluexpress no hace falta: tenemos máquina de impresión de etiquetas adhesivas en el local. Con MercadoLibre basta el código QR en el teléfono. Con Chilexpress y Correos de Chile el paquete debe llegar ya etiquetado, porque no imprimimos etiquetas de esas empresas.",
  },
  {
    pregunta: "¿Hasta qué hora puedo dejar un paquete?",
    respuesta:
      "Puedes dejarlo a cualquier hora del horario del minimarket: no rechazamos paquetes. Lo que sí tiene hora es la colecta, que pasa de lunes a viernes antes de las 16:00. Si llegas después, el paquete se recibe igual y sale en la colecta del día siguiente.",
  },
  {
    pregunta: "¿Atienden todos los couriers el fin de semana?",
    respuesta:
      "MercadoLibre, Bluexpress y Correos de Chile sí, en el horario del minimarket (sábado y domingo de 10:00 a 18:00). Chilexpress es la excepción: opera solo de lunes a viernes de 08:00 a 20:00.",
  },
  {
    pregunta: "¿Puedo pagar una encomienda en el local?",
    respuesta:
      "Solo con Bluexpress, para el que contamos con sistema de cobro habilitado. Con Chilexpress no tenemos servicio de cobro ni Western Union.",
  },
  {
    pregunta: "¿Cuánto se demora en llegar mi envío?",
    respuesta:
      "El plazo de entrega lo define el servicio que contrataste en la app de cada courier, no el punto de admisión. Nosotros garantizamos que el paquete salga en la siguiente colecta.",
  },
  {
    pregunta: "¿Qué documento tengo que llevar para retirar?",
    respuesta:
      "Tu cédula de identidad y el código de retiro que te envía el courier. Si retira otra persona, debe llevar su propia cédula y el código.",
  },
];

const QA = [
  {
    pregunta: "¿Dónde hay un punto de envío en Ñuñoa?",
    respuesta:
      "En Olivo Market, Av. José Pedro Alessandri 2010, Local A, Ñuñoa.",
  },
  {
    pregunta: "¿Qué couriers atienden ahí?",
    respuesta: "MercadoLibre, Chilexpress, Bluexpress y Correos de Chile.",
  },
  {
    pregunta: "¿Está abierto ahora?",
    respuesta:
      "El minimarket abre lunes a viernes de 07:45 a 20:30, y sábado y domingo de 10:00 a 18:00. Chilexpress solo lunes a viernes de 08:00 a 20:00.",
  },
];

export default function PuntoDeEnvioPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />
      <JsonLd data={faqSchema(FAQS)} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="o-display text-neutral-900">
          Punto de envío y retiro de encomiendas en Ñuñoa
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Olivo Market funciona como punto de paquetería en{" "}
          <strong>Av. José Pedro Alessandri 2010, Local A, Ñuñoa</strong>. Aquí puedes dejar envíos,
          retirar compras online y gestionar devoluciones de cuatro operadores: MercadoLibre,
          Chilexpress, Bluexpress y Correos de Chile. Todo en el mismo local, sin cita previa y por
          orden de llegada.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          La ventaja de un punto asociado frente a una sucursal es el horario y la cercanía: estamos
          sobre una avenida principal, abrimos a las 07:45 de lunes a viernes y no cerramos al
          mediodía. MercadoLibre, Bluexpress y Correos de Chile se atienden también sábado y domingo;
          Chilexpress es el único que opera solo en días hábiles. Además, mientras dejas o retiras el
          paquete puedes aprovechar de comprar en el minimarket, que funciona en el mismo lugar.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Un dato que suele decidir a quién vende online: con <strong>Bluexpress imprimimos la
          etiqueta acá mismo</strong> y contamos con sistema de cobro de encomiendas, algo que no
          todos los puntos ofrecen. Con Chilexpress y Correos de Chile, en cambio, el paquete debe
          llegar ya etiquetado.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="o-h2 text-neutral-900">Qué puedes hacer con cada courier</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-200 text-sm uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4 font-semibold text-neutral-700">Courier</th>
                  <th className="py-3 pr-4 font-semibold text-neutral-700">Retiro</th>
                  <th className="py-3 pr-4 font-semibold text-neutral-700">Envío</th>
                  <th className="py-3 pr-4 font-semibold text-neutral-700">Devolución</th>
                  <th className="py-3 pr-4 font-semibold text-neutral-700">Etiqueta en local</th>
                  <th className="py-3 font-semibold text-neutral-700">Horario</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-bold text-gray-900">MercadoLibre</td>
                  <td className="py-3 pr-4">Sí, con QR (7 días)</td>
                  <td className="py-3 pr-4">Sí, etiquetados</td>
                  <td className="py-3 pr-4">Sí, con QR</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">Corrido</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-bold text-gray-900">Bluexpress</td>
                  <td className="py-3 pr-4">Sí, pickup</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3 pr-4 font-bold text-brand-700">Sí</td>
                  <td className="py-3">Corrido</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-bold text-gray-900">Chilexpress</td>
                  <td className="py-3 pr-4">Sí (incluye Falabella)</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3 pr-4">—</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3 font-bold">L-V 08:00–20:00</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-gray-900">Correos de Chile</td>
                  <td className="py-3 pr-4">Sí, pickup</td>
                  <td className="py-3 pr-4">Solo preetiquetados</td>
                  <td className="py-3 pr-4">—</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">Corrido</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500">
            &quot;Corrido&quot; significa el horario completo del minimarket, incluidos sábado y
            domingo. Chilexpress es el único courier que no opera los fines de semana. Bluexpress es
            el único con impresión de etiquetas y sistema de cobro en el local.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="o-h2 text-neutral-900">Elige tu courier</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {BUSINESS.services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/punto-de-envio/${s.slug}`}
                  className="block rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-300"
                >
                  <p className="font-semibold text-neutral-900">{s.nombre}</p>
                  <p className="mt-1 text-sm text-gray-600">{s.descripcion}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10">
          <FichaTienda mensajeWhatsapp="Hola Olivo Market, tengo una consulta sobre el punto de envío en Ñuñoa." />
        </div>

        <div className="mt-10">
          <FaqBlock faqs={FAQS} />
        </div>

        <div className="mt-12">
          <QaPlano items={QA} />
        </div>
      </main>
    </>
  );
}
