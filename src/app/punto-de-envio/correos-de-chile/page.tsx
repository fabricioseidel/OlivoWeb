import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { serviceSchema, breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import {
  Breadcrumbs,
  FichaTienda,
  FaqBlock,
  QaPlano,
  WhatsappCta,
  ServiciosCourier,
  ColectaBlock,
} from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Correos de Chile en Ñuñoa | Envío y Retiro",
  description:
    "Punto de Correos de Chile en Ñuñoa: retiro (pickup) y envío de encomiendas preetiquetadas en Av. José Pedro Alessandri 2010. Atención de lunes a domingo, sin fila de sucursal y por orden de llegada.",
  alternates: { canonical: "/punto-de-envio/correos-de-chile" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/punto-de-envio/correos-de-chile",
    title: "Correos de Chile en Ñuñoa | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Punto de envío", path: "/punto-de-envio" },
  { name: "Correos de Chile", path: "/punto-de-envio/correos-de-chile" },
];

const FAQS = [
  {
    pregunta: "¿Puedo enviar a regiones desde este punto?",
    respuesta:
      "Sí. Correos de Chile tiene la cobertura territorial más amplia del país, incluidas localidades donde otros couriers no llegan. Genera el envío en su sitio indicando el destino y tráelo con la etiqueta pegada.",
  },
  {
    pregunta: "¿Reciben encomiendas internacionales?",
    respuesta:
      "Las encomiendas que vienen del extranjero suelen requerir trámite aduanero y se gestionan directamente con Correos de Chile, no en el punto. Consúltanos tu caso por WhatsApp antes de venir.",
  },
  {
    pregunta: "¿Qué necesito para retirar?",
    respuesta:
      "Tu cédula de identidad y el número de seguimiento del envío. Si retira otra persona, debe traer su propia cédula junto con el número de seguimiento.",
  },
  {
    pregunta: "¿Puedo comprar el franqueo o imprimir la etiqueta acá?",
    respuesta:
      "No. Con Correos de Chile solo admitimos paquetes preetiquetados: el envío se genera, se paga y se imprime la etiqueta en el sitio o la app de Correos antes de venir. Si necesitas impresión de etiquetas en el local, la tenemos disponible para Bluexpress.",
  },
];

const QA = [
  {
    pregunta: "¿Dónde envío por Correos de Chile en Ñuñoa?",
    respuesta: "En Olivo Market, Av. José Pedro Alessandri 2010, Local A, Ñuñoa.",
  },
  {
    pregunta: "¿Qué necesito para despachar?",
    respuesta:
      "El envío generado y pagado en Correos de Chile, con la etiqueta pegada en el paquete.",
  },
  {
    pregunta: "¿Atienden domingo?",
    respuesta:
      "Sí, sábado y domingo de 10:00 a 18:00, aunque la colecta del courier ocurre de lunes a viernes.",
  },
];

export default function CorreosDeChilePage() {
  return (
    <>
      <JsonLd data={serviceSchema("correos-de-chile")} />
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />
      <JsonLd data={faqSchema(FAQS)} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Correos de Chile en Ñuñoa: envío y retiro
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Olivo Market es punto de Correos de Chile en{" "}
          <strong>Av. José Pedro Alessandri 2010, Local A, Ñuñoa</strong>. Puedes dejar acá tus envíos
          ya generados y retirar las encomiendas que te llegan, sin depender del horario acotado de
          una sucursal.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          La razón más común para elegir Correos de Chile es la cobertura: llega a prácticamente todo
          el territorio nacional, incluidas zonas rurales y localidades pequeñas donde los couriers
          privados no tienen reparto o cobran tarifas mucho más altas. Si estás mandando algo a
          regiones o a un pueblo chico, suele ser la alternativa más razonable.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Cómo despachar tu envío</h2>
          <ol className="space-y-3 text-gray-700 list-decimal list-inside leading-relaxed">
            <li>
              Genera y paga el envío en el sitio o la app de Correos de Chile, con los datos completos
              del destinatario.
            </li>
            <li>Imprime la etiqueta y pégala firme en la cara más visible del paquete.</li>
            <li>Trae el paquete cerrado al local dentro del horario de atención.</li>
            <li>Queda admitido y a la espera del retiro, que se realiza en días hábiles.</li>
          </ol>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Servicios disponibles</h2>
          <ServiciosCourier slug="correos-de-chile" />
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Qué tienes que llevar</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Paquete cerrado con la etiqueta de Correos de Chile ya impresa y adherida.</li>
            <li>Número de seguimiento del envío.</li>
            <li>Para retiros: cédula de identidad y número de seguimiento.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Horario de colecta</h2>
          <ColectaBlock />
          <p className="text-gray-700 leading-relaxed">
            Recibimos encomiendas todos los días en el horario del minimarket, pero la colecta de
            Correos de Chile ocurre de lunes a viernes: lo que dejes el sábado o el domingo sale el
            lunes. El plazo de entrega lo define el servicio contratado en Correos de Chile.
          </p>
        </section>

        <div className="mt-10">
          <FichaTienda mensajeWhatsapp="Hola Olivo Market, tengo una consulta sobre un envío de Correos de Chile." />
        </div>

        <div className="mt-6">
          <WhatsappCta mensaje="Hola Olivo Market, ¿a qué hora es el corte de Correos de Chile hoy?">
            Consultar el corte de hoy
          </WhatsappCta>
        </div>

        <div className="mt-10">
          <FaqBlock faqs={FAQS} />
        </div>

        <p className="mt-8 text-gray-700">
          Compara con{" "}
          <Link href="/punto-de-envio/chilexpress" className="font-bold text-emerald-700 hover:underline">
            Chilexpress
          </Link>{" "}
          y{" "}
          <Link href="/punto-de-envio/bluexpress" className="font-bold text-emerald-700 hover:underline">
            Bluexpress
          </Link>{" "}
          en el{" "}
          <Link href="/punto-de-envio" className="font-bold text-emerald-700 hover:underline">
            hub de paquetería
          </Link>
          .
        </p>

        <div className="mt-12">
          <QaPlano items={QA} />
        </div>
      </main>
    </>
  );
}
