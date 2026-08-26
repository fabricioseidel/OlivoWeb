"use client";

import React from 'react';
import Link from "next/link";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { BUSINESS } from "@/lib/seo/business";

/** Título de columna. Antes combinaba mayúsculas, tracking ancho e itálica a
 *  la vez, que a 12px vuelve el texto difícil de leer sin aportar jerarquía. */
function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-sm font-semibold text-white">{children}</h3>
  );
}

const linkClass =
  "o-focus rounded text-sm text-emerald-100/80 transition-colors hover:text-white";

const Footer = () => {
  const { settings } = useStoreSettings();
  // El NAP sale de BUSINESS, no de settings: debe ser idéntico en todo el sitio
  // y coincidir carácter por carácter con Google Business Profile.
  // socialMedia se lee directo de settings; antes se copiaba a estado con un
  // useEffect que solo agregaba un render extra sin cambiar el valor.
  const socialMedia = settings?.socialMedia ?? {};

  const contactInfo = {
    storeName: BUSINESS.name,
    storeEmail: BUSINESS.email,
    storePhone: BUSINESS.phoneDisplay,
    storeAddress: BUSINESS.addressFull,
  };

  return (
    <footer className="mt-16 bg-emerald-950 text-white">
      <div className="o-container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <h2 className="mb-3 text-xl font-bold tracking-tight text-white">
              {contactInfo.storeName}
            </h2>
            {/* Frase de entidad: idéntica en todo el sitio */}
            <p className="max-w-xs text-sm leading-relaxed text-emerald-100/80">
              {BUSINESS.entityPhrase}
            </p>

            {/* Se comprueban los valores y no las claves: el objeto puede traer
                las tres redes en null y aun así tener longitud 3, lo que dejaba
                una fila de iconos vacía. */}
            {(socialMedia.facebook || socialMedia.instagram || socialMedia.whatsapp) && (
              <div className="mt-5 flex gap-2.5">
                {socialMedia.facebook && (
                  <a
                    href={socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="o-focus flex size-9 items-center justify-center rounded-lg border border-white/15 text-emerald-100 transition-colors hover:border-emerald-400 hover:bg-emerald-600 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                )}
                {socialMedia.instagram && (
                  <a
                    href={socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="o-focus flex size-9 items-center justify-center rounded-lg border border-white/15 text-emerald-100 transition-colors hover:border-emerald-400 hover:bg-emerald-600 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>
                )}
                {socialMedia.whatsapp && (
                  <a
                    href={`https://wa.me/${socialMedia.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="o-focus flex size-9 items-center justify-center rounded-lg border border-white/15 text-emerald-100 transition-colors hover:border-emerald-400 hover:bg-emerald-600 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          <nav aria-label="Enlaces rápidos">
            <ColumnTitle>Tienda</ColumnTitle>
            <ul className="space-y-2.5">
              <li><Link href="/" className={linkClass}>Inicio</Link></li>
              <li><Link href="/productos" className={linkClass}>Productos</Link></li>
              <li><Link href="/categorias" className={linkClass}>Categorías</Link></li>
              <li><Link href="/ofertas" className={linkClass}>Ofertas</Link></li>
            </ul>
          </nav>

          <nav aria-label="Punto de envíos">
            <ColumnTitle>Punto de envíos</ColumnTitle>
            <ul className="space-y-2.5">
              {BUSINESS.services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/punto-de-envio/${s.slug}`} className={linkClass}>
                    {s.nombre}
                  </Link>
                </li>
              ))}
              <li><Link href="/tienda-nunoa" className={linkClass}>Tienda en Ñuñoa</Link></li>
              <li><Link href="/contacto" className={linkClass}>Contacto</Link></li>
              {settings.faqUrl && <li><a href={settings.faqUrl} className={linkClass}>Preguntas frecuentes</a></li>}
              {/* Los documentos legales viven en el sitio. Los campos de
                  configuración siguen mandando si se cargó una URL propia:
                  antes, sin esa URL, el pie simplemente no mostraba nada. */}
              <li>
                {settings.termsUrl
                  ? <a href={settings.termsUrl} className={linkClass}>Términos y condiciones</a>
                  : <Link href="/legal/terminos" className={linkClass}>Términos y condiciones</Link>}
              </li>
              <li>
                {settings.privacyUrl
                  ? <a href={settings.privacyUrl} className={linkClass}>Política de privacidad</a>
                  : <Link href="/legal/privacidad" className={linkClass}>Política de privacidad</Link>}
              </li>
              <li>
                {settings.returnPolicyUrl
                  ? <a href={settings.returnPolicyUrl} className={linkClass}>Cambios y devoluciones</a>
                  : <Link href="/legal/devoluciones" className={linkClass}>Cambios y devoluciones</Link>}
              </li>
            </ul>
          </nav>

          <div>
            <ColumnTitle>Contacto</ColumnTitle>
            {/* NAP en texto plano (nunca imagen) y teléfono como enlace tel: */}
            <address className="space-y-2.5 not-italic text-sm text-emerald-100/80">
              <p>
                <a href={`mailto:${contactInfo.storeEmail}`} className={linkClass}>
                  {contactInfo.storeEmail}
                </a>
              </p>
              <p>
                <a href={`tel:${BUSINESS.phoneE164}`} className={linkClass}>
                  {contactInfo.storePhone}
                </a>
              </p>
              <p className="leading-relaxed">{contactInfo.storeAddress}</p>
            </address>

            <dl className="mt-5 space-y-1 text-sm text-emerald-100/70">
              {BUSINESS.openingHoursDisplay.map((h) => (
                <div key={h.label} className="flex flex-wrap gap-x-1.5">
                  <dt>{h.label}:</dt>
                  <dd>{h.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          {/* El copyright estaba en emerald-100/30 sobre emerald-950: por
              debajo del contraste mínimo legible. */}
          <p className="text-sm text-emerald-100/70">
            © {new Date().getFullYear()} {contactInfo.storeName}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
