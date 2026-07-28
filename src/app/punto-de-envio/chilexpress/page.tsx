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
  title: "Chilexpress en Ñuñoa | Envío y Retiro de Encomiendas",
  description:
    "Envía y retira encomiendas Chilexpress en Ñuñoa, en Av. José Pedro Alessandri 2010. Punto de admisión con horario extendido, atención por orden de llegada y sin necesidad de reservar hora.",
  alternates: { canonical: "/punto-de-envio/chilexpress" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/punto-de-envio/chilexpress",
    title: "Chilexpress en Ñuñoa | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Punto de envío", path: "/punto-de-envio" },
  { name: "Chilexpress", path: "/punto-de-envio/chilexpress" },
];

const FAQS = [
  {
    pregunta: "¿Puedo generar el envío en el local o tengo que hacerlo antes?",
    respuesta:
      "Lo habitual es que generes el envío en la app o el sitio de Chilexpress, pagues ahí y llegues con la etiqueta o el número de seguimiento. Así evitas esperas y el paquete queda admitido de inmediato.",
  },
  {
    pregunta: "¿Cómo tengo que embalar el paquete?",
    respuesta:
      "En caja o sobre cerrado, con el contenido protegido y la etiqueta pegada en la cara más visible. Si la etiqueta se despega o se moja, el paquete puede quedar detenido en ruta.",
  },
  {
    pregunta: "¿Retiran encomiendas Chilexpress acá?",
    respuesta:
      "Sí. Si el remitente eligió este punto como destino, puedes retirar presentando tu cédula de identidad y el número de seguimiento del envío.",
  },
  {
    pregunta: "¿Hay límite de tamaño o peso?",
    respuesta:
      "Los límites los define Chilexpress según el servicio contratado. Para bultos grandes o pesados conviene consultarnos por WhatsApp antes de venir, porque el espacio de acopio del local es acotado.",
  },
];

const QA = [
  {
    pregunta: "¿Dónde envío un paquete Chilexpress en Ñuñoa?",
    respuesta: "En Olivo Market, Av. José Pedro Alessandri 2010, Local A, Ñuñoa.",
  },
  {
    pregunta: "¿Qué necesito para despachar?",
    respuesta:
      "El envío generado en la app de Chilexpress y la etiqueta pegada en el paquete.",
  },
  {
    pregunta: "¿Atienden los fines de semana?",
    respuesta:
      "Sí, sábado de 10:00 a 21:00 y domingo de 11:00 a 18:00, sujeto al corte de retiro del courier.",
  },
];

export default function ChilexpressPage() {
  return (
    <>
      <JsonLd data={serviceSchema("chilexpress")} />
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />
      <JsonLd data={faqSchema(FAQS)} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Chilexpress en Ñuñoa: envío y retiro de encomiendas
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          En Olivo Market, <strong>Av. José Pedro Alessandri 2010, Local A, Ñuñoa</strong>, funcionamos
          como punto Chilexpress para que despaches tus envíos y retires las encomiendas que te llegan.
          Es una alternativa cómoda a las sucursales cuando necesitas horario de tarde o atención el
          fin de semana.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          El caso de uso más frecuente acá son las personas que venden online y necesitan despachar
          varios paquetes por semana sin perder media mañana en fila. Como estamos sobre una avenida
          principal y atendemos de corrido, puedes pasar cuando te acomode dentro del horario y dejar
          el paquete admitido en pocos minutos.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Cómo despachar tu envío</h2>
          <ol className="space-y-3 text-gray-700 list-decimal list-inside leading-relaxed">
            <li>
              Genera el envío en la app o el sitio de Chilexpress, indicando origen y destino, y paga
              ahí mismo.
            </li>
            <li>Imprime la etiqueta y pégala en la cara más visible del paquete.</li>
            <li>Trae el paquete ya cerrado y embalado al local dentro del horario de atención.</li>
            <li>
              Lo registramos como admitido y queda a la espera del retiro del courier, que pasa una
              vez al día.
            </li>
          </ol>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Qué tienes que llevar</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Paquete cerrado y embalado, con la etiqueta Chilexpress adherida.</li>
            <li>Número de seguimiento del envío (en el teléfono basta).</li>
            <li>Para retiros: cédula de identidad y número de seguimiento.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Horario de corte</h2>
          <p className="text-gray-700 leading-relaxed">
            El retiro de Chilexpress pasa una vez al día por el local. Los paquetes admitidos después
            de ese paso salen al día hábil siguiente, lo que corre la fecha estimada de entrega en un
            día. Si tu envío es urgente, consúltanos por WhatsApp la hora de corte del día antes de
            venir.
          </p>
          {/* TODO-HUMANO: indicar la hora exacta de corte diario del retiro de
              Chilexpress en el local. */}
        </section>

        <div className="mt-10">
          <FichaTienda mensajeWhatsapp="Hola Olivo Market, tengo una consulta sobre un envío Chilexpress." />
        </div>

        <div className="mt-6">
          <WhatsappCta mensaje="Hola Olivo Market, ¿a qué hora es el corte de Chilexpress hoy?">
            Consultar el corte de hoy
          </WhatsappCta>
        </div>

        <div className="mt-10">
          <FaqBlock faqs={FAQS} />
        </div>

        <p className="mt-8 text-gray-700">
          También operamos con{" "}
          <Link href="/punto-de-envio/bluexpress" className="font-bold text-emerald-700 hover:underline">
            Bluexpress
          </Link>{" "}
          y{" "}
          <Link href="/punto-de-envio/correos-de-chile" className="font-bold text-emerald-700 hover:underline">
            Correos de Chile
          </Link>
          . Revisa el{" "}
          <Link href="/punto-de-envio" className="font-bold text-emerald-700 hover:underline">
            resumen de todos los couriers
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
