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
  title: "Punto MercadoLibre en Ñuñoa | Retiro y Devolución",
  description:
    "Retira, envía, devuelve y cambia compras de MercadoLibre en Ñuñoa, en Av. José Pedro Alessandri 2010. Punto asociado con código QR, 7 días de plazo para retirar y atención de lunes a domingo.",
  alternates: { canonical: "/punto-de-envio/mercadolibre" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/punto-de-envio/mercadolibre",
    title: "Punto MercadoLibre en Ñuñoa | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Punto de envío", path: "/punto-de-envio" },
  { name: "MercadoLibre", path: "/punto-de-envio/mercadolibre" },
];

const FAQS = [
  {
    pregunta: "¿Qué necesito para retirar mi compra de MercadoLibre?",
    respuesta:
      "El código QR o el código de retiro que aparece en la app de MercadoLibre, más tu cédula de identidad. No hace falta imprimir nada: basta con mostrar el código desde el teléfono.",
  },
  {
    pregunta: "¿Puedo devolver un producto de MercadoLibre acá?",
    respuesta:
      "Sí, siempre que hayas iniciado la devolución desde la app y MercadoLibre te haya generado el código QR de devolución. Trae el producto en su empaque y muestra el QR al llegar.",
  },
  {
    pregunta: "¿Cuántos días guardan mi paquete?",
    respuesta:
      "Tienes 7 días desde que el paquete llega al local para pasar a retirarlo. Cumplido ese plazo, el paquete se devuelve al vendedor, así que conviene venir apenas te llegue el aviso.",
  },
  {
    pregunta: "¿Puedo hacer un cambio de producto acá?",
    respuesta:
      "Sí. El cambio se coordina primero en la app de MercadoLibre, que genera un código QR; con ese código traes el producto al local y nosotros gestionamos el cambio.",
  },
  {
    pregunta: "¿Puede retirar otra persona por mí?",
    respuesta:
      "Sí, si lleva el código de retiro y su cédula de identidad. Recomendamos avisar por WhatsApp si quien retira no es la persona que aparece en la compra.",
  },
];

const QA = [
  {
    pregunta: "¿Dónde retiro mi compra de MercadoLibre en Ñuñoa?",
    respuesta: "En Olivo Market, Av. José Pedro Alessandri 2010, Local A, Ñuñoa.",
  },
  {
    pregunta: "¿Qué llevo para retirar?",
    respuesta: "El código QR de la app de MercadoLibre y tu cédula de identidad.",
  },
  {
    pregunta: "¿Hasta qué hora atienden?",
    respuesta:
      "En el horario del minimarket: lunes a viernes de 07:45 a 20:30, sábado y domingo de 10:00 a 18:00.",
  },
];

export default function MercadoLibrePage() {
  return (
    <>
      <JsonLd data={serviceSchema("mercadolibre")} />
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />
      <JsonLd data={faqSchema(FAQS)} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Punto MercadoLibre en Ñuñoa: retiro y devolución
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Olivo Market es punto asociado de MercadoLibre en{" "}
          <strong>Av. José Pedro Alessandri 2010, Local A, Ñuñoa</strong>. Si elegiste retiro en punto
          al momento de comprar, tu paquete llega hasta acá y lo retiras mostrando el código QR desde
          la app. También recibimos devoluciones con QR generado por MercadoLibre.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Cómo funciona el flujo con código QR</h2>
          <ol className="space-y-3 text-gray-700 list-decimal list-inside leading-relaxed">
            <li>
              Al comprar en MercadoLibre, selecciona <strong>retiro en un punto</strong> y elige
              Olivo Market como destino.
            </li>
            <li>
              Cuando el paquete llegue al local, MercadoLibre te avisa por la app y por correo. Ese
              aviso incluye tu código de retiro.
            </li>
            <li>
              Ven al local dentro del horario de atención con el código QR en el teléfono y tu cédula
              de identidad. No necesitas imprimir nada.
            </li>
            <li>
              Escaneamos el código, verificamos tu identidad y te entregamos el paquete en el momento.
            </li>
          </ol>
          <p className="text-gray-700 leading-relaxed">
            Para las <strong>devoluciones</strong> el flujo es el mismo pero al revés: primero inicias
            la devolución desde la app de MercadoLibre, la plataforma te genera un QR de devolución, y
            traes el producto empaquetado junto con ese código. Nosotros lo recibimos y queda a la
            espera del retiro del courier.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Servicios disponibles</h2>
          <ServiciosCourier slug="mercadolibre" />
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Qué tienes que llevar</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Código QR o código de retiro visible en tu teléfono.</li>
            <li>Cédula de identidad de quien retira.</li>
            <li>En devoluciones y cambios: el producto en su empaque y el QR que genera la app.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Horario de colecta</h2>
          <ColectaBlock />
          <p className="text-gray-700 leading-relaxed">
            Recibimos paquetes durante todo el horario del minimarket, incluidos sábado y domingo. La
            colecta en sí ocurre de lunes a viernes, así que lo que dejes el fin de semana sale el
            lunes. El tiempo de entrega posterior lo define el servicio que contrataste en la app de
            MercadoLibre, no el punto.
          </p>
        </section>

        <div className="mt-10">
          <FichaTienda mensajeWhatsapp="Hola Olivo Market, tengo una consulta sobre retiro o devolución de MercadoLibre." />
        </div>

        <div className="mt-6">
          <WhatsappCta mensaje="Hola Olivo Market, ¿mi paquete de MercadoLibre ya llegó al punto?">
            Consultar si mi paquete llegó
          </WhatsappCta>
        </div>

        <div className="mt-10">
          <FaqBlock faqs={FAQS} />
        </div>

        <p className="mt-8 text-gray-700">
          ¿Necesitas otro courier? Revisa{" "}
          <Link href="/punto-de-envio" className="font-bold text-emerald-700 hover:underline">
            todos los servicios de paquetería
          </Link>{" "}
          o visita la{" "}
          <Link href="/tienda-nunoa" className="font-bold text-emerald-700 hover:underline">
            tienda en Ñuñoa
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
