import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import DespachoInfo from "@/components/seo/DespachoInfo";
import { Breadcrumbs, QaPlano, WhatsappCta } from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Delivery en Peñalolén | Productos Venezolanos",
  description:
    "Despacho de productos venezolanos a Peñalolén desde Ñuñoa, Av. José Pedro Alessandri 2010. Harina PAN, quesos y abarrotes con entrega a domicilio en la comuna. Pide online o por WhatsApp.",
  alternates: { canonical: "/delivery/penalolen" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/delivery/penalolen",
    title: "Delivery en Peñalolén | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Delivery en Peñalolén", path: "/delivery/penalolen" },
];

const QA = [
  {
    pregunta: "¿Despachan a Peñalolén?",
    respuesta:
      "Sí, Peñalolén está dentro de nuestra cobertura de reparto desde la tienda en Ñuñoa.",
  },
  {
    pregunta: "¿Conviene pedir un pedido grande?",
    respuesta:
      "Sí. Al ser una comuna más distante, agrupar la compra en un solo pedido rinde más que varios envíos chicos.",
  },
  {
    pregunta: "¿Desde dónde sale el despacho?",
    respuesta: "Desde Av. José Pedro Alessandri 2010, Local A, Ñuñoa.",
  },
];

export default function DeliveryPenalolenPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Delivery de productos venezolanos en Peñalolén
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Llevamos productos venezolanos a Peñalolén desde nuestra tienda en Ñuñoa, en Av. José Pedro
          Alessandri 2010. Es una de las comunas donde más cuesta encontrar harina de maíz precocida,
          quesos venezolanos o salsas importadas en el comercio de barrio, y por eso concentramos ahí
          buena parte de los pedidos con despacho a domicilio.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Repartimos en los sectores de Grecia, Tobalaba, Consistorial, La Faena, Lo Hermida y el
          entorno del Parque Peñalolén. La ruta habitual sale por Av. Grecia o Quilín según la
          dirección de destino. Al estar más lejos que Ñuñoa o Macul, el trayecto es más largo y eso
          se refleja en la tarifa, que se calcula por kilómetro recorrido.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Por esa razón, a los clientes de Peñalolén les recomendamos concentrar la compra: como el
          costo del despacho depende de la distancia y no de la cantidad de productos, un pedido
          mensual grande sale bastante más conveniente que varios pedidos pequeños. Si además superas
          el monto de despacho gratis que se indica más abajo, el envío no te cuesta nada.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Costo y tiempo de despacho</h2>
          <DespachoInfo />
          {/* TODO-HUMANO: confirmar el tiempo de entrega comprometido para
              Peñalolén y si hay sectores altos de la comuna fuera de cobertura. */}
          <p className="text-gray-700 leading-relaxed">
            Al confirmar el pedido calculamos los kilómetros exactos hasta tu dirección y verás el
            monto antes de pagar. Peñalolén queda en el tramo más externo de nuestra cobertura, así
            que conviene revisar si te acomoda superar el mínimo de despacho gratis.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Cómo pedir</h2>
          <p className="text-gray-700 leading-relaxed">
            Selecciona los productos en el catálogo y elige despacho a domicilio en el checkout. Si
            quieres coordinar un pedido grande o consultar disponibilidad, escríbenos por WhatsApp.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/productos"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-6 h-12 font-bold text-white transition-colors hover:bg-emerald-500"
            >
              Ver catálogo
            </Link>
            <WhatsappCta mensaje="Hola Olivo Market, quiero hacer un pedido con despacho a Peñalolén.">
              Pedir por WhatsApp
            </WhatsappCta>
          </div>
        </section>

        <p className="mt-8 text-gray-700">
          Consulta también el despacho a{" "}
          <Link href="/delivery/nunoa" className="font-bold text-emerald-700 hover:underline">
            Ñuñoa
          </Link>
          ,{" "}
          <Link href="/delivery/macul" className="font-bold text-emerald-700 hover:underline">
            Macul
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
