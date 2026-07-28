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
      "Se calcula por distancia desde la tienda; al ser comuna colindante, el trayecto es corto.",
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

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
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
          <h2 className="text-2xl font-black text-gray-900">Costo y tiempo de despacho</h2>
          <DespachoInfo />
          {/* TODO-HUMANO: confirmar el tiempo de entrega comprometido para Macul
              y si hay algún sector de la comuna fuera de cobertura. */}
          <p className="text-gray-700 leading-relaxed">
            La tarifa se calcula según los kilómetros reales entre la tienda y tu dirección, y la ves
            antes de pagar. Por la cercanía entre ambas comunas, los pedidos a Macul quedan entre los
            más económicos de nuestro radio de reparto.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Cómo pedir</h2>
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
