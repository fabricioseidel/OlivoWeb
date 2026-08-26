import type { Metadata } from "next";
import { BUSINESS } from "@/lib/seo/business";
import { LegalLayout, Lista, Seccion } from "@/components/legal/LegalLayout";

/**
 * Política de privacidad.
 *
 * Describe lo que el sitio realmente hace, no un texto genérico: los servicios
 * externos listados son exactamente los que reciben datos —MercadoPago para
 * cobrar, Resend para los correos, Supabase y Vercel como infraestructura, y
 * Nominatim cuando alguien escribe su dirección en el buscador—. Si mañana se
 * agrega otro proveedor que trate datos de clientes, hay que sumarlo aquí.
 */

export const metadata: Metadata = {
  title: `Política de privacidad | ${BUSINESS.name}`,
  description:
    "Qué datos personales recoge Olivo Market, para qué los usa, con quién los comparte y cómo ejercer tus derechos.",
  alternates: { canonical: "/legal/privacidad" },
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
  return (
    <LegalLayout
      titulo="Política de privacidad"
      resumen="Qué datos tuyos guardamos, para qué los usamos y cómo pedir que los corrijamos o los borremos."
      actual="/legal/privacidad"
    >
      <Seccion titulo="Qué datos recogemos">
        <p>Solo los que necesitamos para venderte y entregarte el pedido:</p>
        <Lista
          items={[
            <>
              <strong>Para comprar:</strong> nombre, correo electrónico,
              teléfono y dirección de entrega.
            </>,
            <>
              <strong>Si creas una cuenta:</strong> tu correo y una contraseña.
              La contraseña se guarda cifrada con un algoritmo de un solo
              sentido — ni nosotros podemos leerla.
            </>,
            <>
              <strong>De tus pedidos:</strong> qué compraste, cuándo, el monto y
              el estado del envío.
            </>,
            <>
              <strong>Si te suscribes al boletín:</strong> tu correo electrónico.
            </>,
            <>
              <strong>De navegación:</strong> estadísticas agregadas de uso del
              sitio, sin identificarte personalmente.
            </>,
          ]}
        />
        <p>
          <strong>No guardamos los datos de tu tarjeta.</strong> El pago ocurre
          dentro de MercadoPago; a nosotros solo nos llega la confirmación de que
          se pagó.
        </p>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <Lista
          items={[
            "Procesar y entregar tu pedido, y contactarte si hay algún problema con él.",
            "Emitir la boleta correspondiente y cumplir las obligaciones tributarias y contables.",
            "Responder tus consultas y gestionar cambios, devoluciones y reclamos.",
            "Administrar tu cuenta y los puntos de fidelidad, si participas.",
            "Enviarte novedades y promociones, solo si te suscribiste. Puedes darte de baja desde cualquier correo que te enviemos.",
            "Entender de forma agregada cómo se usa el sitio, para mejorarlo.",
          ]}
        />
        <p>
          No vendemos ni arrendamos tus datos a terceros, ni los usamos para
          fines distintos de los que están en esta lista.
        </p>
      </Seccion>

      <Seccion titulo="Con quién los compartimos">
        <p>
          Con los proveedores que hacen funcionar la tienda, y solo con los datos
          que cada uno necesita:
        </p>
        <Lista
          items={[
            <>
              <strong>MercadoPago</strong> — procesa los pagos. Recibe los datos
              de la transacción.
            </>,
            <>
              <strong>Supabase</strong> — almacena la base de datos de la tienda
              (cuentas, pedidos, productos).
            </>,
            <>
              <strong>Vercel</strong> — aloja el sitio y provee las estadísticas
              de uso agregadas.
            </>,
            <>
              <strong>Resend</strong> — envía los correos transaccionales, como
              la confirmación de pedido o la recuperación de contraseña.
            </>,
            <>
              <strong>Nominatim (OpenStreetMap)</strong> — cuando escribes tu
              dirección en el buscador, el texto que escribes se envía a ese
              servicio para sugerirte direcciones válidas.
            </>,
            <>
              <strong>Empresas de transporte</strong> — cuando el pedido se
              despacha por un courier, reciben los datos necesarios para
              entregarlo.
            </>,
          ]}
        />
        <p>
          Algunos de estos servicios procesan la información en servidores fuera
          de Chile. También podemos entregar datos cuando una autoridad
          competente lo requiera conforme a la ley.
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo los guardamos">
        <Lista
          items={[
            "Los datos de pedidos y boletas se conservan mientras lo exija la normativa tributaria y comercial.",
            "Los datos de tu cuenta se conservan mientras la mantengas activa.",
            "Tu correo en el boletín se conserva hasta que te des de baja.",
            "Los enlaces de recuperación de contraseña vencen en una hora y se registran cifrados.",
          ]}
        />
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>
          Puedes pedirnos en cualquier momento que te digamos qué datos tuyos
          tenemos, que los corrijamos si están equivocados, que los eliminemos
          cuando ya no sean necesarios, y que dejemos de usarlos para enviarte
          comunicaciones comerciales.
        </p>
        <p>
          Escríbenos a{" "}
          <a
            href={`mailto:${BUSINESS.email}`}
            className="text-emerald-700 underline underline-offset-4"
          >
            {BUSINESS.email}
          </a>{" "}
          desde el correo asociado a tu cuenta y te respondemos. Si consideras
          que no atendimos bien tu solicitud, puedes reclamar ante la autoridad
          competente.
        </p>
        <p>
          Ten en cuenta que algunos datos no se pueden borrar de inmediato: los
          asociados a boletas y pedidos deben conservarse por el plazo que exige
          la normativa tributaria.
        </p>
      </Seccion>

      <Seccion titulo="Cookies y almacenamiento en tu navegador">
        <p>
          Usamos el almacenamiento del navegador para que la tienda funcione:
          guardar tu carrito mientras compras, recordar tus direcciones y
          mantener tu sesión iniciada. Esa información queda en tu propio
          dispositivo.
        </p>
        <p>
          Las estadísticas de uso del sitio son agregadas y no se emplean para
          construir un perfil publicitario tuyo. Puedes borrar el almacenamiento
          desde tu navegador cuando quieras, aunque eso vaciará el carrito y
          cerrará tu sesión.
        </p>
      </Seccion>

      <Seccion titulo="Seguridad">
        <p>
          El sitio se sirve cifrado por HTTPS, las contraseñas se guardan con
          cifrado de un solo sentido y el acceso a los datos de la tienda está
          restringido a las personas que administran el negocio. Ningún sistema
          es infalible, pero si detectáramos un incidente que afecte tus datos,
          te lo informaríamos.
        </p>
      </Seccion>

      <Seccion titulo="Menores de edad">
        <p>
          La tienda está pensada para mayores de 18 años. No recogemos
          conscientemente datos de menores; si detectamos que se creó una cuenta
          de esa forma, la eliminamos.
        </p>
      </Seccion>

      <Seccion titulo="Cambios a esta política">
        <p>
          Si cambiamos la forma en que tratamos tus datos, actualizamos esta
          página y su fecha de vigencia. Te recomendamos revisarla cada cierto
          tiempo.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
