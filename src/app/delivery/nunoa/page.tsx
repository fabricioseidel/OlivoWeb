import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import DespachoInfo from "@/components/seo/DespachoInfo";
import { Breadcrumbs, QaPlano, WhatsappCta } from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Minimarket a domicilio en Ñuñoa | Delivery el mismo día",
  description:
    "Minimarket con despacho a domicilio en Ñuñoa desde Av. José Pedro Alessandri 2010: abarrotes, bebidas, lácteos, panadería, helados y aseo. Entrega el mismo día y también productos venezolanos. Pide por la web o por WhatsApp.",
  alternates: { canonical: "/delivery/nunoa" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/delivery/nunoa",
    title: "Delivery en Ñuñoa | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Delivery en Ñuñoa", path: "/delivery/nunoa" },
];

const QA = [
  {
    pregunta: "¿Hacen delivery en Ñuñoa?",
    respuesta:
      "Sí, despachamos a toda la comuna de Ñuñoa desde Av. José Pedro Alessandri 2010.",
  },
  {
    pregunta: "¿Cuánto demora el despacho en Ñuñoa?",
    respuesta:
      "Se entrega entre las 08:00 y las 14:00: el mismo día si el pedido entra antes de las 08:00, y al día siguiente si entra después.",
  },
  {
    pregunta: "¿Puedo retirar en tienda en vez de pedir despacho?",
    respuesta:
      "Sí. Te avisamos por correo cuando el pedido esté listo, normalmente en menos de una hora, y lo retiras en Av. José Pedro Alessandri 2010, Local A.",
  },
];

export default function DeliveryNunoaPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="o-display text-neutral-900">
          Minimarket a domicilio en Ñuñoa
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Ñuñoa es nuestra comuna: la tienda está en Av. José Pedro Alessandri 2010, Local A, así que
          los pedidos dentro de la comuna son los que salen más rápido de todo nuestro radio de
          reparto. Si vives en Ñuñoa, puedes pedir la compra completa —abarrotes, bebidas, lácteos,
          pan, helados, snacks y productos de aseo— y recibirla en casa sin moverte. También
          tenemos productos venezolanos que no se consiguen en el supermercado: harina PAN,
          quesos, pan de jamón y salsas.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Cubrimos la comuna completa, desde el sector de Plaza Ñuñoa y Villa Frei hasta Estadio
          Nacional, Chile España, Suárez Mujica y el eje de Irarrázaval. Como la tienda está sobre una
          avenida troncal, el reparto no depende de cruzar la ciudad: la mayoría de las direcciones de
          Ñuñoa quedan a pocos kilómetros del local, lo que se traduce en el costo de despacho más
          bajo de nuestra cobertura, porque la tarifa se calcula por distancia real.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Si prefieres no esperar, siempre tienes la opción de pasar a retirar directamente. Muchos
          clientes de Ñuñoa combinan las dos cosas: piden online lo pesado y aprovechan de pasar por
          el local cuando vienen a dejar o retirar una encomienda, ya que también funcionamos como
          punto de envíos de MercadoLibre y los principales couriers.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="o-h2 text-neutral-900">Costo y tiempo de despacho</h2>
          <DespachoInfo comuna="nunoa" />
          <p className="text-gray-700 leading-relaxed">
            El despacho a Ñuñoa tiene un <strong>tope de $1.500</strong>: aunque la tarifa se calcula
            por distancia, en esta comuna nunca pagas más que eso. Y si tu compra supera los $35.000,
            el envío es gratis. Entregamos entre las 08:00 y las 14:00: los pedidos que entran antes
            de las 08:00 salen ese mismo día, y los posteriores al día siguiente en esa misma ventana.
            Si prefieres no esperar, el retiro en tienda queda listo en menos de una hora y te avisamos
            por correo apenas esté disponible.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="o-h2 text-neutral-900">Cómo pedir</h2>
          <p className="text-gray-700 leading-relaxed">
            Arma tu pedido en el catálogo online y elige despacho a domicilio al finalizar la compra,
            o escríbenos por WhatsApp si necesitas algo puntual o quieres consultar stock antes.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/productos"
              className="inline-flex items-center rounded-xl bg-brand-boton px-6 h-12 font-bold text-brand-contraste transition-colors hover:bg-brand-700"
            >
              Ver catálogo
            </Link>
            <WhatsappCta mensaje="Hola Olivo Market, quiero hacer un pedido con despacho a Ñuñoa.">
              Pedir por WhatsApp
            </WhatsappCta>
          </div>
        </section>

        <p className="mt-8 text-gray-700">
          ¿Vives en otra comuna? Revisa el despacho a{" "}
          <Link href="/delivery/macul" className="font-bold text-brand-700 hover:underline">
            Macul
          </Link>
          ,{" "}
          <Link href="/delivery/penalolen" className="font-bold text-brand-700 hover:underline">
            Peñalolén
          </Link>{" "}
          o{" "}
          <Link href="/delivery/san-joaquin" className="font-bold text-brand-700 hover:underline">
            San Joaquín
          </Link>
          . También puedes visitarnos en la{" "}
          <Link href="/tienda-nunoa" className="font-bold text-brand-700 hover:underline">
            tienda de Ñuñoa
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
