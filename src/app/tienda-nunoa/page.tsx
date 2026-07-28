import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { groceryStoreSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { BUSINESS } from "@/lib/seo/business";
import {
  Breadcrumbs,
  FichaTienda,
  MapEmbed,
  QaPlano,
  NapBlock,
  HorariosBlock,
} from "@/components/seo/LocalBlocks";

export const metadata: Metadata = {
  title: "Tienda en Ñuñoa | Olivo Market — Av. José Pedro Alessandri",
  description:
    "Visita Olivo Market en Av. José Pedro Alessandri 2010, Local A, Ñuñoa. Minimarket de productos venezolanos y punto de envíos, con horario, cómo llegar y mapa. Atención presencial todos los días.",
  alternates: { canonical: "/tienda-nunoa" },
  openGraph: {
    locale: "es_CL",
    siteName: BUSINESS.name,
    type: "website",
    url: "/tienda-nunoa",
    title: "Tienda en Ñuñoa | Olivo Market",
  },
};

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Tienda en Ñuñoa", path: "/tienda-nunoa" },
];

const QA = [
  {
    pregunta: "¿Dónde queda Olivo Market en Ñuñoa?",
    respuesta:
      "En Av. José Pedro Alessandri 2010, Local A, Ñuñoa, Región Metropolitana.",
  },
  {
    pregunta: "¿Está abierto ahora?",
    respuesta:
      "Atendemos de lunes a viernes de 07:45 a 20:30, y sábado y domingo de 10:00 a 18:00.",
  },
  {
    pregunta: "¿Hay un minimarket venezolano cerca de mí en Ñuñoa?",
    respuesta:
      "Sí. Olivo Market está sobre Av. José Pedro Alessandri, en el límite entre Ñuñoa y Macul, a pasos del Estadio Nacional.",
  },
  {
    pregunta: "¿Se puede pagar con tarjeta?",
    respuesta: "Sí, aceptamos efectivo y tarjetas de débito y crédito.",
  },
];

export default function TiendaNunoaPage() {
  const images = BUSINESS.facadePhoto ? [BUSINESS.facadePhoto] : [];

  return (
    <>
      {/* Único GroceryStore de esta página; el otro vive en la home */}
      <JsonLd data={groceryStoreSchema(images)} />
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumbs items={BREADCRUMBS} />

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Tienda Olivo Market en Ñuñoa
        </h1>

        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Nuestra tienda física está en <strong>Av. José Pedro Alessandri 2010, Local A, Ñuñoa</strong>,
          y funciona como minimarket de productos venezolanos y como punto de envíos al mismo tiempo.
          Puedes venir a comprar harina PAN, quesos, pan de jamón y abarrotes, y en la misma visita
          dejar o retirar una encomienda de MercadoLibre, Chilexpress, Bluexpress o Correos de Chile.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Estamos sobre una de las avenidas principales de la comuna, en el tramo que conecta Ñuñoa
          con Macul, cerca del Estadio Nacional y de Campus San Joaquín. Es una ubicación cómoda si
          te mueves en micro por Av. José Pedro Alessandri o si vienes en auto desde Irarrázaval,
          Grecia o Vicuña Mackenna. El local tiene atención presencial en el horario indicado más
          abajo, y no necesitas reserva ni cita previa para comprar ni para dejar un paquete.
        </p>

        <p className="mt-4 text-gray-700 leading-relaxed">
          Si buscas un minimarket venezolano cerca de ti en Ñuñoa, este es el punto de referencia:
          reponemos productos de marcas venezolanas de forma constante y, cuando algo se agota,
          puedes escribirnos por WhatsApp para saber cuándo vuelve a estar disponible. También
          despachamos a domicilio en Ñuñoa y comunas vecinas.
        </p>

        <div className="mt-10">
          <FichaTienda mensajeWhatsapp="Hola Olivo Market, tengo una consulta sobre la tienda en Ñuñoa." />
        </div>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Cómo llegar</h2>
          <p className="text-gray-700 leading-relaxed">
            La entrada del local da directamente a Av. José Pedro Alessandri. Si vienes en transporte
            público, cualquier recorrido que circule por esa avenida te deja a pocos metros. Si vienes
            en Metro, la combinación más directa es bajar en Estadio Nacional (Línea 6) y caminar hacia
            el sur por Av. José Pedro Alessandri. En auto, hay estacionamiento en la calle según
            disponibilidad del momento.
          </p>
          <MapEmbed title="Mapa de Olivo Market en Av. José Pedro Alessandri 2010, Ñuñoa" />
        </section>

        <section className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-xl font-black text-gray-900">Datos de contacto</h2>
            <NapBlock />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-black text-gray-900">Horarios</h2>
            <HorariosBlock />
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-black text-gray-900">Qué encuentras en el local</h2>
          <ul className="grid gap-2 sm:grid-cols-2 text-gray-700">
            <li>Harina PAN y harinas de maíz precocida</li>
            <li>Quesos y charcutería venezolana</li>
            <li>Pan de jamón y panadería en temporada</li>
            <li>Salsas, aliños y abarrotes importados</li>
            <li>Bebidas y snacks venezolanos</li>
            <li>Punto de retiro y envío de encomiendas</li>
          </ul>
          <p className="text-gray-700">
            ¿Prefieres comprar online?{" "}
            <Link href="/productos" className="font-bold text-emerald-700 hover:underline">
              Revisa el catálogo completo
            </Link>{" "}
            o mira los{" "}
            <Link href="/punto-de-envio" className="font-bold text-emerald-700 hover:underline">
              servicios de paquetería
            </Link>
            .
          </p>
        </section>

        <div className="mt-12">
          <QaPlano items={QA} />
        </div>
      </main>
    </>
  );
}
