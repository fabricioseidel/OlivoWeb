import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import {
  NapBlock,
  HorariosBlock,
  MapEmbed,
  QaPlano,
  Breadcrumbs,
} from "@/components/seo/LocalBlocks";
import ContactoClient from "./ContactoClient";

const BREADCRUMBS = [
  { name: "Inicio", path: "/" },
  { name: "Contacto", path: "/contacto" },
];

const QA = [
  {
    pregunta: "¿Cuál es la dirección de Olivo Market?",
    respuesta: "Av. José Pedro Alessandri 2010, Local A, Ñuñoa, Región Metropolitana.",
  },
  {
    pregunta: "¿Cuál es el teléfono de contacto?",
    respuesta: "+56 9 2063 9745, también disponible por WhatsApp.",
  },
  {
    pregunta: "¿Cuál es el horario de atención?",
    respuesta:
      "Lunes a viernes de 07:45 a 20:30, sábado y domingo de 10:00 a 18:00.",
  },
];

export default function ContactoPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(BREADCRUMBS)} />

      {/* Formulario de contacto (cliente) */}
      <ContactoClient />

      {/* NAP, horarios y mapa server-rendered: es lo que leen los buscadores */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <Breadcrumbs items={BREADCRUMBS} />

        <h2 className="o-h2 text-neutral-900">
          Visítanos en Ñuñoa
        </h2>
        <p className="mt-3 text-gray-700 leading-relaxed">
          Nuestro local está en Av. José Pedro Alessandri 2010, en Ñuñoa, y atiende como minimarket
          venezolano y punto de envíos. Puedes venir sin cita previa dentro del horario de atención.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900">Dirección y contacto</h3>
            <NapBlock />
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900">Horario de atención</h3>
            <HorariosBlock />
          </div>
        </div>

        <div className="mt-8">
          <MapEmbed title="Mapa de Olivo Market en Av. José Pedro Alessandri 2010, Ñuñoa" />
        </div>

        <div className="mt-12">
          <QaPlano items={QA} />
        </div>
      </section>
    </>
  );
}
