import Link from "next/link";
import { BUSINESS, whatsappLink, getService, type CourierSlug } from "@/lib/seo/business";

/**
 * Bloques de UI compartidos por las landings locales.
 * Todos son server components: su contenido debe estar en el HTML servido
 * porque es exactamente lo que se marca en JSON-LD.
 */

/** NAP en texto plano — nunca como imagen. Fuente: BUSINESS. */
export function NapBlock({ className = "" }: { className?: string }) {
  return (
    <address className={`not-italic space-y-2 text-gray-700 ${className}`}>
      <p className="font-bold text-gray-900">{BUSINESS.name}</p>
      <p>{BUSINESS.addressFull}</p>
      <p>
        Teléfono:{" "}
        <a href={`tel:${BUSINESS.phoneE164}`} className="font-bold text-emerald-700 hover:underline">
          {BUSINESS.phoneDisplay}
        </a>
      </p>
      <p>
        Email:{" "}
        <a href={`mailto:${BUSINESS.email}`} className="font-bold text-emerald-700 hover:underline">
          {BUSINESS.email}
        </a>
      </p>
    </address>
  );
}

/** Horarios — misma fuente que el schema, cero divergencia. */
export function HorariosBlock({ className = "" }: { className?: string }) {
  return (
    <dl className={`space-y-1.5 text-gray-700 ${className}`}>
      {BUSINESS.openingHoursDisplay.map((h) => (
        <div key={h.label} className="flex justify-between gap-4 max-w-xs">
          <dt className="font-medium">{h.label}</dt>
          <dd className="font-bold text-gray-900">{h.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Mapa embebido. Usa el CID si existe; si no, búsqueda por dirección literal. */
export function MapEmbed({ title }: { title: string }) {
  const query = encodeURIComponent(`${BUSINESS.name}, ${BUSINESS.addressFull}`);
  const src = `https://www.google.com/maps?q=${query}&output=embed`;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full h-72 md:h-80 border-0"
      />
    </div>
  );
}

/** Preguntas frecuentes visibles — obligatorio si se emite FAQPage. */
export function FaqBlock({
  faqs,
  titulo = "Preguntas frecuentes",
}: {
  faqs: ReadonlyArray<{ pregunta: string; respuesta: string }>;
  titulo?: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900">{titulo}</h2>
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.pregunta} className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="font-bold text-gray-900">{faq.pregunta}</h3>
            <p className="mt-2 text-gray-700 leading-relaxed">{faq.respuesta}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Q&A en texto plano al cierre de cada landing: pregunta directa, respuesta
 * directa, sin adornos. Pensado para extracción por motores de IA.
 */
export function QaPlano({
  items,
}: {
  items: ReadonlyArray<{ pregunta: string; respuesta: string }>;
}) {
  return (
    <section className="border-t border-gray-200 pt-8">
      <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">
        Preguntas y respuestas
      </h2>
      <div className="space-y-3 text-gray-700">
        {items.map((item) => (
          <p key={item.pregunta} className="leading-relaxed">
            <strong className="text-gray-900">{item.pregunta}</strong> {item.respuesta}
          </p>
        ))}
      </div>
      <p className="mt-6 text-gray-600 text-sm">{BUSINESS.entityPhrase}</p>
    </section>
  );
}

/** Migas de pan visibles (acompañan al BreadcrumbList del schema). */
export function Breadcrumbs({
  items,
}: {
  items: ReadonlyArray<{ name: string; path: string }>;
}) {
  return (
    <nav aria-label="Migas de pan" className="text-sm text-gray-500 mb-6">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.path} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === items.length - 1 ? (
              <span className="font-bold text-gray-700">{item.name}</span>
            ) : (
              <Link href={item.path} className="hover:text-emerald-700 hover:underline">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Qué se puede y qué NO se puede hacer con un courier en el local, más su
 * horario. Decir explícitamente lo que no hay evita viajes en vano.
 */
export function ServiciosCourier({ slug }: { slug: CourierSlug }) {
  const service = getService(slug);
  if (!service) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
        <h3 className="font-black text-emerald-900">Qué puedes hacer acá</h3>
        <ul className="mt-3 space-y-2 text-emerald-900">
          {service.puedeHacer.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="font-black">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-bold text-emerald-800">
          Horario: {service.horarioDisplay}
        </p>
      </div>

      {service.noDisponible && service.noDisponible.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="font-black text-gray-900">Qué no ofrecemos con {service.nombre}</h3>
          <ul className="mt-3 space-y-2 text-gray-600">
            {service.noDisponible.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="font-black">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Lo indicamos para que no hagas el viaje en vano.
          </p>
        </div>
      )}
    </div>
  );
}

/** Horario de colecta: responde "¿hasta qué hora puedo dejar un paquete?". */
export function ColectaBlock() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="font-black text-amber-900">
        Colecta: lunes a viernes antes de las {BUSINESS.colecta.horaLimite}
      </p>
      <p className="mt-2 text-amber-900 leading-relaxed">{BUSINESS.colecta.resumen}</p>
    </div>
  );
}

/** CTA a WhatsApp con mensaje pre-cargado por contexto. */
export function WhatsappCta({ mensaje, children }: { mensaje: string; children: React.ReactNode }) {
  return (
    <a
      href={whatsappLink(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 h-12 font-bold text-white transition-colors hover:bg-emerald-500"
    >
      {children}
    </a>
  );
}

/** Ficha compacta de la tienda: NAP + horarios + CTA. Reutilizada en landings. */
export function FichaTienda({ mensajeWhatsapp }: { mensajeWhatsapp: string }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-xl font-black text-gray-900">Dónde estamos</h2>
        <NapBlock />
        <p className="text-sm text-gray-500">
          Estamos en Av. José Pedro Alessandri, a pasos del límite entre Ñuñoa y Macul.
        </p>
      </div>
      <div className="space-y-3">
        <h2 className="text-xl font-black text-gray-900">Horario de atención</h2>
        <HorariosBlock />
        <div className="pt-2">
          <WhatsappCta mensaje={mensajeWhatsapp}>Escríbenos por WhatsApp</WhatsappCta>
        </div>
      </div>
    </section>
  );
}
