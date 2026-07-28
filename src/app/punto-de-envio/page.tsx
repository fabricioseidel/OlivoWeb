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
    "Punto de retiro y envío de encomiendas en Ñuñoa: MercadoLibre, Chilexpress, Bluexpress y Correos de Chile en Av. José Pedro Alessandri 2010. Horario extendido, sin cita previa y con atención de lunes a domingo.",
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
      "Depende del courier. Para devoluciones de MercadoLibre basta con el código QR en el teléfono. Para Chilexpress, Bluexpress y Correos de Chile lo habitual es traer la etiqueta o el número de envío generado en la app del courier. Si tienes dudas, escríbenos por WhatsApp antes de venir.",
  },
  {
    pregunta: "¿Hasta qué hora puedo dejar un paquete?",
    respuesta:
      "Recibimos paquetes durante todo el horario de atención de la tienda, pero el retiro del courier tiene un horario de corte diario: lo que entra después de esa hora sale al día hábil siguiente. Consúltanos el corte del día por WhatsApp.",
  },
  {
    pregunta: "¿Tiene costo dejar o retirar una encomienda?",
    respuesta:
      "El costo lo define cada courier según el servicio que contrataste en su app o sitio web. Como punto asociado no cobramos un cargo adicional por recibir o entregar el paquete.",
  },
  {
    pregunta: "¿Necesito cita previa?",
    respuesta:
      "No. La atención es por orden de llegada dentro del horario de la tienda, sin reserva.",
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
      "El horario es lunes a viernes de 09:00 a 21:00, sábado de 10:00 a 21:00 y domingo de 11:00 a 18:00.",
  },
];

export default function PuntoDeEnvioPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />
      <JsonLd data={faqSchema(FAQS)} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Punto de envío y retiro de encomiendas en Ñuñoa
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Olivo Market funciona como punto de paquetería en{" "}
          <strong>Av. José Pedro Alessandri 2010, Local A, Ñuñoa</strong>. Aquí puedes dejar envíos,
          retirar compras online y gestionar devoluciones de cuatro operadores: MercadoLibre,
          Chilexpress, Bluexpress y Correos de Chile. Todo en el mismo local, sin cita previa y
          con horario extendido de lunes a domingo.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          La ventaja de un punto asociado frente a una sucursal es el horario y la cercanía: estamos
          sobre una avenida principal, atendemos hasta las 21:00 de lunes a sábado y no cerramos al
          mediodía. Si trabajas fuera de la comuna y sueles llegar tarde, este es el tipo de punto
          pensado para eso. Además, mientras dejas o retiras el paquete puedes aprovechar de comprar
          en el minimarket, que funciona en el mismo lugar.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Qué puedes hacer con cada courier</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-200 text-sm uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4 font-black">Courier</th>
                  <th className="py-3 pr-4 font-black">Retiro</th>
                  <th className="py-3 pr-4 font-black">Envío</th>
                  <th className="py-3 font-black">Devolución</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-bold text-gray-900">MercadoLibre</td>
                  <td className="py-3 pr-4">Sí, con código QR</td>
                  <td className="py-3 pr-4">Según etiqueta de la app</td>
                  <td className="py-3">Sí</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-bold text-gray-900">Chilexpress</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3">Según el vendedor</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-bold text-gray-900">Bluexpress</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3">Según el vendedor</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-gray-900">Correos de Chile</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3 pr-4">Sí</td>
                  <td className="py-3">Según el vendedor</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* TODO-HUMANO: confirmar por courier si el local admite devoluciones y
              envíos con etiqueta impresa en tienda, para reemplazar los "Según
              el vendedor" por la respuesta real. */}
          <p className="text-sm text-gray-500">
            Las condiciones exactas dependen del servicio que hayas contratado en la app de cada
            courier. Ante cualquier duda puntual, escríbenos antes de venir.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Elige tu courier</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {BUSINESS.services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/punto-de-envio/${s.slug}`}
                  className="block rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-emerald-300"
                >
                  <p className="font-black text-gray-900">{s.nombre}</p>
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
