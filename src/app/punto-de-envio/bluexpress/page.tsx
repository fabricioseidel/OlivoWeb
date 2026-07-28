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
} from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Bluexpress en Ñuñoa | Punto de Entrega y Retiro",
  description:
    "Punto Bluexpress en Ñuñoa: entrega y retiro de encomiendas en Av. José Pedro Alessandri 2010. Atención de lunes a domingo, por orden de llegada y con horario de tarde para quienes trabajan.",
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
    pregunta: "¿Puedo despachar un envío Bluexpress desde acá?",
    respuesta:
      "Sí, siempre que traigas el envío ya generado y pagado en Bluexpress, con su etiqueta impresa y pegada en el paquete.",
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
      "Hasta las 21:00 de lunes a sábado y hasta las 18:00 el domingo.",
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

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
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
          <h2 className="text-2xl font-black text-gray-900">Cómo retirar tu encomienda</h2>
          <ol className="space-y-3 text-gray-700 list-decimal list-inside leading-relaxed">
            <li>Espera la notificación de Bluexpress que confirma que el paquete llegó al punto.</li>
            <li>Ven al local con tu cédula de identidad y el número de seguimiento.</li>
            <li>Verificamos los datos contra el registro del courier.</li>
            <li>Firmas la recepción y te llevas la encomienda.</li>
          </ol>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Qué tienes que llevar</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Cédula de identidad de quien retira.</li>
            <li>Número de seguimiento de Bluexpress.</li>
            <li>Para despachos: paquete cerrado con la etiqueta Bluexpress ya impresa.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Horario de corte</h2>
          <p className="text-gray-700 leading-relaxed">
            El retiro de Bluexpress pasa por el local una vez al día en días hábiles. Los envíos
            admitidos después de ese paso, o durante el fin de semana, salen el siguiente día hábil.
            Para envíos con plazo ajustado, consúltanos el corte del día antes de venir.
          </p>
          {/* TODO-HUMANO: indicar la hora exacta de corte diario del retiro de
              Bluexpress y confirmar si pasa también sábado. */}
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
          <Link href="/punto-de-envio/chilexpress" className="font-bold text-emerald-700 hover:underline">
            Chilexpress
          </Link>{" "}
          o el{" "}
          <Link href="/punto-de-envio" className="font-bold text-emerald-700 hover:underline">
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
