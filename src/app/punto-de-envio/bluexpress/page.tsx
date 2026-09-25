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
  title: "Bluexpress en Ñuñoa | Punto de Entrega y Retiro",
  description:
    "Punto Bluexpress en Ñuñoa, Av. José Pedro Alessandri 2010: envío, pickup, devoluciones, impresión de etiquetas en el local y sistema de cobro de encomiendas. Atención de lunes a domingo.",
  alternates: { canonical: "/punto-de-envio/bluexpress" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/punto-de-envio/bluexpress",
    title: "Bluexpress en Ñuñoa | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Punto de envío", path: "/punto-de-envio" },
  { name: "Bluexpress", path: "/punto-de-envio/bluexpress" },
];

const FAQS = [
  {
    pregunta: "¿Cómo sé que mi encomienda Bluexpress llegó al punto?",
    respuesta:
      "Bluexpress notifica al destinatario cuando el paquete queda disponible en el punto. Si no recibiste el aviso pero el seguimiento indica que llegó, escríbenos por WhatsApp con el número de seguimiento y lo verificamos.",
  },
  {
    pregunta: "¿Qué pasa si no retiro a tiempo?",
    respuesta:
      "Bluexpress fija un plazo de permanencia en el punto. Cumplido ese plazo, la encomienda se devuelve al remitente. Por eso conviene retirar apenas te llegue la notificación.",
  },
  {
    pregunta: "¿Puedo imprimir la etiqueta en el local?",
    respuesta:
      "Sí. Con Bluexpress contamos con máquina de impresión de etiquetas adhesivas, así que si generaste el envío en la app pero no pudiste imprimir, lo resolvemos acá mismo.",
  },
  {
    pregunta: "¿Puedo pagar una encomienda Bluexpress en el punto?",
    respuesta:
      "Sí. Tenemos sistema de cobro habilitado para encomiendas Bluexpress, así que puedes pagar en el local al momento de retirar.",
  },
  {
    pregunta: "¿Puedo despachar un envío Bluexpress desde acá?",
    respuesta:
      "Sí. Puedes traer el envío ya generado en la app, o llegar con el envío creado y que te imprimamos la etiqueta acá. También admitimos paquetes preetiquetados de vendedores.",
  },
  {
    pregunta: "¿Atienden sin reserva?",
    respuesta:
      "Sí, la atención es por orden de llegada durante todo el horario de la tienda. No se reserva hora.",
  },
];

const QA = [
  {
    pregunta: "¿Dónde retiro una encomienda Bluexpress en Ñuñoa?",
    respuesta: "En Olivo Market, Av. José Pedro Alessandri 2010, Local A, Ñuñoa.",
  },
  {
    pregunta: "¿Qué llevo para retirar?",
    respuesta: "Cédula de identidad y el número de seguimiento de Bluexpress.",
  },
  {
    pregunta: "¿Hasta qué hora puedo pasar?",
    respuesta:
      "En el horario del minimarket: lunes a viernes de 07:45 a 20:30, sábado y domingo de 10:00 a 18:00.",
  },
];

export default function BluexpressPage() {
  return (
    <>
      <JsonLd data={serviceSchema("bluexpress")} />
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />
      <JsonLd data={faqSchema(FAQS)} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="o-display text-neutral-900">
          Bluexpress en Ñuñoa: punto de entrega y retiro
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Olivo Market opera como punto Bluexpress en{" "}
          <strong>Av. José Pedro Alessandri 2010, Local A, Ñuñoa</strong>. Recibimos las encomiendas
          que llegan a tu nombre y también admitimos envíos que ya vengan generados desde Bluexpress,
          para que no dependas del horario de una sucursal.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Bluexpress se usa mucho para compras a tiendas y emprendimientos que despachan desde
          regiones. El problema típico es que la entrega a domicilio pasa cuando no hay nadie en casa
          y el paquete queda dando vueltas. Redirigirlo a un punto con horario extendido resuelve eso:
          el paquete te espera en el local y lo retiras cuando puedas dentro del horario de atención,
          incluido el fin de semana.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="o-h2 text-neutral-900">Cómo retirar tu encomienda</h2>
          <ol className="space-y-3 text-gray-700 list-decimal list-inside leading-relaxed">
            <li>Espera la notificación de Bluexpress que confirma que el paquete llegó al punto.</li>
            <li>Ven al local con tu cédula de identidad y el número de seguimiento.</li>
            <li>Verificamos los datos contra el registro del courier.</li>
            <li>Firmas la recepción y te llevas la encomienda.</li>
          </ol>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="o-h2 text-neutral-900">Servicios disponibles</h2>
          <ServiciosCourier slug="bluexpress" />
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="o-h2 text-neutral-900">Qué tienes que llevar</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Cédula de identidad de quien retira.</li>
            <li>Número de seguimiento de Bluexpress.</li>
            <li>
              Para despachos: el paquete cerrado. La etiqueta puede venir impresa o la imprimimos acá.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="o-h2 text-neutral-900">Horario de colecta</h2>
          <ColectaBlock />
          <p className="text-gray-700 leading-relaxed">
            Recibimos encomiendas Bluexpress todos los días en el horario del minimarket, incluidos
            sábado y domingo, pero la colecta ocurre de lunes a viernes. El plazo de entrega posterior
            depende del servicio contratado en la app de Bluexpress, no del punto.
          </p>
        </section>

        <div className="mt-10">
          <FichaTienda mensajeWhatsapp="Hola Olivo Market, tengo una consulta sobre una encomienda Bluexpress." />
        </div>

        <div className="mt-6">
          <WhatsappCta mensaje="Hola Olivo Market, ¿ya llegó mi encomienda Bluexpress al punto?">
            Consultar si llegó mi encomienda
          </WhatsappCta>
        </div>

        <div className="mt-10">
          <FaqBlock faqs={FAQS} />
        </div>

        <p className="mt-8 text-gray-700">
          Revisa también{" "}
          <Link href="/punto-de-envio/chilexpress" className="font-bold text-brand-700 hover:underline">
            Chilexpress
          </Link>{" "}
          o el{" "}
          <Link href="/punto-de-envio" className="font-bold text-brand-700 hover:underline">
            listado completo de couriers
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
