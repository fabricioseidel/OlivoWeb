import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import DespachoInfo from "@/components/seo/DespachoInfo";
import { Breadcrumbs, QaPlano, WhatsappCta } from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Delivery en Ñuñoa | Productos Venezolanos a Domicilio",
  description:
    "Despacho de productos venezolanos a domicilio en Ñuñoa desde Av. José Pedro Alessandri 2010. Harina PAN, quesos y abarrotes con entrega el mismo día en la comuna. Pide por la web o por WhatsApp.",
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
      "Es la comuna donde está la tienda, así que es el despacho más rápido de nuestra cobertura.",
  },
  {
    pregunta: "¿Puedo retirar en tienda en vez de pedir despacho?",
    respuesta:
      "Sí, puedes retirar en Av. José Pedro Alessandri 2010, Local A, dentro del horario de atención.",
  },
];

export default function DeliveryNunoaPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Delivery de productos venezolanos en Ñuñoa
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Ñuñoa es nuestra comuna: la tienda está en Av. José Pedro Alessandri 2010, Local A, así que
          los pedidos dentro de la comuna son los que salen más rápido de todo nuestro radio de
          reparto. Si vives en Ñuñoa, puedes pedir harina PAN, quesos, pan de jamón y abarrotes
          venezolanos y recibirlos a domicilio sin moverte de casa.
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
          <h2 className="text-2xl font-black text-gray-900">Costo y tiempo de despacho</h2>
          <DespachoInfo />
          {/* TODO-HUMANO: confirmar el tiempo de entrega comprometido para Ñuñoa
              (¿mismo día si el pedido entra antes de cierta hora? ¿franjas
              horarias?) para reemplazar la redacción cualitativa. */}
          <p className="text-gray-700 leading-relaxed">
            El valor exacto se calcula por la distancia entre la tienda y tu dirección al momento de
            confirmar el pedido, así que lo ves antes de pagar. Al ser la comuna de origen, Ñuñoa
            tiene el trayecto más corto y por lo tanto la tarifa más baja del radio de reparto.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-2xl font-black text-gray-900">Cómo pedir</h2>
          <p className="text-gray-700 leading-relaxed">
            Arma tu pedido en el catálogo online y elige despacho a domicilio al finalizar la compra,
            o escríbenos por WhatsApp si necesitas algo puntual o quieres consultar stock antes.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/productos"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-6 h-12 font-bold text-white transition-colors hover:bg-emerald-500"
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
          <Link href="/delivery/macul" className="font-bold text-emerald-700 hover:underline">
            Macul
          </Link>
          ,{" "}
          <Link href="/delivery/penalolen" className="font-bold text-emerald-700 hover:underline">
            Peñalolén
          </Link>{" "}
          o{" "}
          <Link href="/delivery/san-joaquin" className="font-bold text-emerald-700 hover:underline">
            San Joaquín
          </Link>
          . También puedes visitarnos en la{" "}
          <Link href="/tienda-nunoa" className="font-bold text-emerald-700 hover:underline">
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
