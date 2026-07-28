import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import DespachoInfo from "@/components/seo/DespachoInfo";
import { Breadcrumbs, QaPlano, WhatsappCta } from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Delivery en San Joaquín | Productos Venezolanos",
  description:
    "Despacho de productos venezolanos a San Joaquín desde Ñuñoa, Av. José Pedro Alessandri 2010. Reparto directo por el eje Alessandri con harina PAN, quesos y abarrotes. Pide online o por WhatsApp.",
  alternates: { canonical: "/delivery/san-joaquin" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/delivery/san-joaquin",
    title: "Delivery en San Joaquín | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Delivery en San Joaquín", path: "/delivery/san-joaquin" },
];

const QA = [
  {
    pregunta: "¿Hacen entregas en San Joaquín?",
    respuesta:
      "Sí, despachamos a San Joaquín desde la tienda en Av. José Pedro Alessandri 2010, Ñuñoa.",
  },
  {
    pregunta: "¿Por dónde llega el reparto?",
    respuesta:
      "Baja por el eje de Av. José Pedro Alessandri, que conecta directo con la comuna.",
  },
  {
    pregunta: "¿Puedo pagar con tarjeta?",
    respuesta: "Sí, el checkout online acepta tarjetas de débito y crédito.",
  },
];

export default function DeliverySanJoaquinPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Delivery de productos venezolanos en San Joaquín
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          San Joaquín está conectada con nuestra tienda por el propio eje de Av. José Pedro
          Alessandri, que baja desde Ñuñoa cruzando el límite comunal. Eso hace que el reparto sea
          directo y sin desvíos: para buena parte de las direcciones de la comuna es prácticamente el
          mismo recorrido de la avenida hacia el sur.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Entregamos en los sectores de La Legua, Santa Rosa, el entorno del Campus San Joaquín de la
          UC y las villas en torno a Av. Las Industrias y Carlos Valdovinos. La zona universitaria
          concentra bastante demanda de productos venezolanos, sobre todo entre estudiantes que buscan
          harina de maíz precocida y snacks que no se consiguen en el comercio cercano.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Si trabajas o estudias en el sector, considera que la tienda queda a pocos minutos subiendo
          por la misma avenida: varios clientes de San Joaquín prefieren pasar a retirar de camino a
          casa, sobre todo cuando necesitan algo con urgencia o quieren revisar el stock disponible
          antes de decidir la compra.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Costo y tiempo de despacho</h2>
          <DespachoInfo />
          {/* TODO-HUMANO: confirmar el tiempo de entrega comprometido para San
              Joaquín y si hay restricciones de horario en algún sector. */}
          <p className="text-gray-700 leading-relaxed">
            El monto sale del cálculo por distancia que hace el checkout con tu dirección, y se
            muestra antes del pago. Por la conexión directa a través de Alessandri, San Joaquín queda
            en el rango cercano de nuestra cobertura.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Cómo pedir</h2>
          <p className="text-gray-700 leading-relaxed">
            Arma el pedido desde el catálogo online y elige despacho a domicilio, o consúltanos por
            WhatsApp si buscas un producto específico y quieres saber si está disponible.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/productos"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-6 h-12 font-bold text-white transition-colors hover:bg-emerald-500"
            >
              Ver catálogo
            </Link>
            <WhatsappCta mensaje="Hola Olivo Market, quiero hacer un pedido con despacho a San Joaquín.">
              Pedir por WhatsApp
            </WhatsappCta>
          </div>
        </section>

        <p className="mt-8 text-gray-700">
          Mira también el despacho a{" "}
          <Link href="/delivery/nunoa" className="font-bold text-emerald-700 hover:underline">
            Ñuñoa
          </Link>
          ,{" "}
          <Link href="/delivery/macul" className="font-bold text-emerald-700 hover:underline">
            Macul
          </Link>{" "}
          y{" "}
          <Link href="/delivery/penalolen" className="font-bold text-emerald-700 hover:underline">
            Peñalolén
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
