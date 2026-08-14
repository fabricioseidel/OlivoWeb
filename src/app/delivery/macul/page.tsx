import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import DespachoInfo from "@/components/seo/DespachoInfo";
import { Breadcrumbs, QaPlano, WhatsappCta } from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Delivery en Macul | Productos Venezolanos a Domicilio",
  description:
    "Despacho de productos venezolanos a Macul desde nuestra tienda en Ñuñoa, en Av. José Pedro Alessandri 2010. Comuna vecina con reparto directo por la misma avenida. Pide online o por WhatsApp.",
  alternates: { canonical: "/delivery/macul" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/delivery/macul",
    title: "Delivery en Macul | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Delivery en Macul", path: "/delivery/macul" },
];

const QA = [
  {
    pregunta: "¿Llegan con delivery a Macul?",
    respuesta:
      "Sí. Macul es comuna vecina y se despacha desde la tienda en Av. José Pedro Alessandri 2010, Ñuñoa.",
  },
  {
    pregunta: "¿Cuánto cuesta el despacho a Macul?",
    respuesta:
      "Máximo $1.500. Sobre $35.000 de compra el envío es gratis.",
  },
  {
    pregunta: "¿Dónde queda la tienda si prefiero retirar?",
    respuesta:
      "En Av. José Pedro Alessandri 2010, Local A, Ñuñoa, muy cerca del límite con Macul.",
  },
];

export default function DeliveryMaculPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="o-display text-neutral-900">
          Delivery de productos venezolanos en Macul
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Macul limita directamente con Ñuñoa por Av. José Pedro Alessandri, la misma avenida donde
          está nuestra tienda. Esa vecindad hace que el reparto sea prácticamente en línea recta: no
          hay que atravesar la ciudad ni tomar autopista para llegar a la mayoría de las direcciones
          de la comuna.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Despachamos a los sectores de Campus San Joaquín, Santa Julia, Villa Macul, el eje de
          Departamental y las poblaciones en torno a Av. Macul y Quilín. Si estudias o trabajas en el
          Campus San Joaquín de la UC, estás a minutos del local: bastante gente de esa zona nos pide
          productos venezolanos que no encuentra en supermercados del sector, especialmente harina de
          maíz precocida y quesos.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Un dato útil para quienes viven en Macul: como también somos punto de paquetería, si ya
          venías a dejar una encomienda de MercadoLibre o Chilexpress puedes aprovechar el mismo viaje
          para llevarte el pedido y ahorrarte el costo de despacho por completo.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="o-h2 text-neutral-900">Costo y tiempo de despacho</h2>
          <DespachoInfo comuna="macul" />
          <p className="text-gray-700 leading-relaxed">
            Macul tiene el mismo <strong>tope de $1.500</strong> que Ñuñoa, por la cercanía con el
            local: es el valor máximo que pagas por el despacho, sin importar en qué punto de la comuna
            estés. Sobre $35.000 de compra el envío queda sin costo. La entrega es entre las 08:00 y
            las 14:00, el mismo día si el pedido entró antes de las 08:00 y al día siguiente si entró
            después. También puedes retirar en el local: te avisamos por correo cuando esté listo,
            normalmente en menos de una hora.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="o-h2 text-neutral-900">Cómo pedir</h2>
          <p className="text-gray-700 leading-relaxed">
            Compra directo desde el catálogo y selecciona despacho a domicilio, o escríbenos por
            WhatsApp si quieres confirmar disponibilidad antes de armar el pedido.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/productos"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-6 h-12 font-bold text-white transition-colors hover:bg-emerald-500"
            >
              Ver catálogo
            </Link>
            <WhatsappCta mensaje="Hola Olivo Market, quiero hacer un pedido con despacho a Macul.">
              Pedir por WhatsApp
            </WhatsappCta>
          </div>
        </section>

        <p className="mt-8 text-gray-700">
          También despachamos a{" "}
          <Link href="/delivery/nunoa" className="font-bold text-emerald-700 hover:underline">
            Ñuñoa
          </Link>
          ,{" "}
          <Link href="/delivery/penalolen" className="font-bold text-emerald-700 hover:underline">
            Peñalolén
          </Link>{" "}
          y{" "}
          <Link href="/delivery/san-joaquin" className="font-bold text-emerald-700 hover:underline">
            San Joaquín
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
