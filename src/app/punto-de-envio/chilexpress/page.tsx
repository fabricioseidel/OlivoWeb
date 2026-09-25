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
  title: "Chilexpress en Ñuñoa | Envío y Retiro de Encomiendas",
  description:
    "Envía y retira encomiendas Chilexpress y Falabella en Ñuñoa, en Av. José Pedro Alessandri 2010. Punto de admisión abierto de lunes a viernes de 08:00 a 20:00, por orden de llegada y sin reservar hora.",
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
    pregunta: "¿Imprimen la etiqueta en el local?",
    respuesta:
      "No. Con Chilexpress no contamos con impresión de etiquetas, así que el paquete debe llegar ya etiquetado. Genera y paga el envío en la app o el sitio de Chilexpress, imprime la etiqueta y pégala antes de venir.",
  },
  {
    pregunta: "¿Reciben envíos de Falabella?",
    respuesta:
      "Sí. Falabella despacha a través de Chilexpress, así que las compras de Falabella que llegan a este punto se retiran acá igual que cualquier encomienda Chilexpress.",
  },
  {
    pregunta: "¿Tienen servicio de cobro o Western Union?",
    respuesta:
      "No. Con Chilexpress no ofrecemos servicio de cobro (pago contra entrega) ni Western Union. Si necesitas pagar una encomienda en el punto, sí contamos con sistema de cobro para Bluexpress.",
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
    pregunta: "¿Atienden Chilexpress los fines de semana?",
    respuesta:
      "No. Chilexpress opera de lunes a viernes de 08:00 a 20:00. El minimarket abre igual el fin de semana, pero ese día no se admiten ni entregan encomiendas Chilexpress.",
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

        <h1 className="o-display text-neutral-900">
          Chilexpress en Ñuñoa: envío y retiro de encomiendas
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          En Olivo Market, <strong>Av. José Pedro Alessandri 2010, Local A, Ñuñoa</strong>, funcionamos
          como punto Chilexpress para que despaches tus envíos y retires las encomiendas que te llegan,
          incluidas las compras de Falabella, que despacha por esta misma empresa.{" "}
          <strong>La atención Chilexpress es de lunes a viernes, de 08:00 a 20:00</strong>: es el único
          courier del local que no opera los fines de semana.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          El caso de uso más frecuente acá son las personas que venden online y necesitan despachar
          varios paquetes por semana sin perder media mañana en fila. Como estamos sobre una avenida
          principal y atendemos de corrido, puedes pasar cuando te acomode dentro de ese horario y
          dejar el paquete admitido en pocos minutos. Eso sí, con Chilexpress el paquete debe llegar
          ya etiquetado: en este punto no imprimimos etiquetas de esta empresa.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="o-h2 text-neutral-900">Cómo despachar tu envío</h2>
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

        <section className="mt-10 space-y-4">
          <h2 className="o-h2 text-neutral-900">Servicios disponibles</h2>
          <ServiciosCourier slug="chilexpress" />
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="o-h2 text-neutral-900">Qué tienes que llevar</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Paquete cerrado y embalado, con la etiqueta Chilexpress ya impresa y adherida.</li>
            <li>Número de seguimiento del envío (en el teléfono basta).</li>
            <li>Para retiros: cédula de identidad y número de seguimiento.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="o-h2 text-neutral-900">Horario de colecta</h2>
          <ColectaBlock />
          <p className="text-gray-700 leading-relaxed">
            A diferencia de los otros couriers, la atención Chilexpress en el local es solo de lunes a
            viernes entre 08:00 y 20:00. El tiempo de tránsito posterior lo define el servicio que
            hayas contratado en la app de Chilexpress, no el punto de admisión.
          </p>
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
          <Link href="/punto-de-envio/bluexpress" className="font-bold text-brand-700 hover:underline">
            Bluexpress
          </Link>{" "}
          y{" "}
          <Link href="/punto-de-envio/correos-de-chile" className="font-bold text-brand-700 hover:underline">
            Correos de Chile
          </Link>
          . Revisa el{" "}
          <Link href="/punto-de-envio" className="font-bold text-brand-700 hover:underline">
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
