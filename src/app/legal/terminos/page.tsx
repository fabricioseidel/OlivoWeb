import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/seo/business";
import {
  ENTREGA,
  RADIO_DESPACHO_KM_DEFAULT,
  RADIO_ZONA_PLANA_KM,
  TARIFA_ZONA_PLANA_CLP,
} from "@/lib/shipping-policy";
import { LegalLayout, Lista, Seccion } from "@/components/legal/LegalLayout";

/**
 * Términos y condiciones de venta.
 *
 * Los datos operativos —horarios, comunas, ventana de entrega, topes de
 * despacho— se leen de `BUSINESS` y `shipping-policy`, que son las mismas
 * fuentes que usa el checkout. Escribirlos a mano acá haría que el documento
 * prometiera una cosa y el sistema cobrara otra en cuanto alguien cambiara una
 * constante.
 */

export const metadata: Metadata = {
  title: `Términos y condiciones | ${BUSINESS.name}`,
  description:
    "Condiciones de compra en Olivo Market: precios, despacho, retiro en tienda, medios de pago, derecho a retracto y cómo reclamar.",
  alternates: { canonical: "/legal/terminos" },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return (
    <LegalLayout
      titulo="Términos y condiciones"
      resumen="Estas condiciones rigen las compras hechas en olivomarket.cl. Al comprar, aceptas lo que se describe aquí."
      actual="/legal/terminos"
    >
      <Seccion titulo="1. Quiénes somos y qué vendemos">
        <p>
          {BUSINESS.entityPhrase} Vendemos alimentos y productos de consumo, en
          la tienda física y a través de este sitio, y además operamos como
          punto de admisión y retiro de encomiendas.
        </p>
        <p>
          Estas condiciones aplican a las compras hechas por el sitio web. Las
          compras presenciales en el local se rigen por la boleta emitida y por
          la Ley 19.496 sobre protección de los derechos de los consumidores.
        </p>
      </Seccion>

      <Seccion titulo="2. Precios y disponibilidad">
        <Lista
          items={[
            "Todos los precios se muestran en pesos chilenos e incluyen IVA.",
            "El precio que rige es el que aparece al momento de confirmar el pedido. Si un producto cambia de precio después, no afecta a los pedidos ya pagados.",
            "La disponibilidad depende del stock real del local. Si un producto se agota entre que lo agregas al carrito y confirmas el pago, el sistema te lo advierte antes de cobrar.",
            "Trabajamos con alimentos: puede haber diferencias menores de peso o formato entre lo mostrado y lo entregado. Si la diferencia es relevante, se aplica lo indicado en la política de cambios y devoluciones.",
            "Si detectamos un error evidente de precio —por ejemplo, un producto publicado en $1 por una falla de carga— nos comunicaremos contigo antes de preparar el pedido y podrás confirmarlo al precio correcto o anularlo con reembolso total.",
          ]}
        />
      </Seccion>

      <Seccion titulo="3. Medios de pago">
        <p>
          Los pagos del sitio se procesan a través de <strong>MercadoPago</strong>,
          que permite pagar con tarjeta de crédito, de débito o con saldo de esa
          cuenta. No almacenamos los datos de tu tarjeta: los administra
          MercadoPago bajo sus propias condiciones.
        </p>
        <p>
          El pedido se considera confirmado cuando MercadoPago nos notifica que
          el pago fue aprobado. Hasta entonces, el pedido queda registrado como
          pendiente y no se prepara.
        </p>
      </Seccion>

      <Seccion titulo="4. Despacho y retiro">
        <p>
          Repartimos con despacho propio en {BUSINESS.comunas.length} comunas
          cercanas al local:{" "}
          {BUSINESS.comunas.map((c) => c.nombre).join(", ")}. La cobertura se
          calcula por distancia real desde la tienda, así que una dirección muy
          alejada dentro de esas comunas puede quedar fuera; el checkout lo
          indica antes de cobrar.
        </p>
        <Lista
          items={[
            <>
              <strong>Ventana de entrega:</strong> {ENTREGA.ventana}.
            </>,
            <>
              <strong>Corte del mismo día:</strong> {ENTREGA.resumen}
            </>,
            <>
              <strong>Retiro en tienda:</strong> {ENTREGA.retiroEnTienda} El
              retiro es sin costo.
            </>,
            <>
              <strong>Costo de despacho:</strong> dentro de{" "}
              {RADIO_ZONA_PLANA_KM} km del local es una tarifa plana de $
              {TARIFA_ZONA_PLANA_CLP.toLocaleString("es-CL")}. Más lejos se calcula
              por distancia, hasta un máximo de {RADIO_DESPACHO_KM_DEFAULT} km. En
              todos los casos el costo se muestra antes de pagar.
            </>,
          ]}
        />
        <p>
          Las entregas se hacen en la dirección que indiques. Si no hay nadie
          para recibir el pedido, te contactamos por teléfono o WhatsApp para
          coordinar una segunda entrega o el retiro en tienda. Una dirección mal
          escrita o incompleta puede impedir la entrega: revísala antes de pagar.
        </p>
      </Seccion>

      <Seccion titulo="5. Horario de atención">
        <Lista
          items={BUSINESS.openingHoursDisplay.map((h) => (
            <>
              <strong>{h.label}:</strong> {h.value}
            </>
          ))}
        />
        <p>
          Los pedidos web se pueden hacer a cualquier hora, pero se preparan y
          despachan dentro del horario de atención.
        </p>
      </Seccion>

      <Seccion titulo="6. Derecho a retracto y devoluciones">
        <p>
          Las condiciones de cambio, devolución y retracto están detalladas en
          la{" "}
          <Link
            href="/legal/devoluciones"
            className="text-brand-700 underline underline-offset-4"
          >
            política de cambios y devoluciones
          </Link>
          , que forma parte de estos términos.
        </p>
      </Seccion>

      <Seccion titulo="7. Datos personales">
        <p>
          Los datos que nos entregas para comprar se tratan según la{" "}
          <Link
            href="/legal/privacidad"
            className="text-brand-700 underline underline-offset-4"
          >
            política de privacidad
          </Link>
          , que también forma parte de estos términos.
        </p>
      </Seccion>

      <Seccion titulo="8. Cuenta de cliente">
        <p>
          Puedes comprar con o sin cuenta. Si creas una, eres responsable de
          mantener tu contraseña en reserva; avísanos de inmediato si crees que
          alguien más accedió a ella. Podemos suspender una cuenta que se use
          para fines fraudulentos o que afecte el funcionamiento del servicio.
        </p>
      </Seccion>

      <Seccion titulo="9. Encomiendas y paquetería">
        <p>
          El servicio de punto de envíos es independiente de la venta online.
          Actuamos como punto de admisión y retiro de las compañías con las que
          trabajamos, y el transporte, los plazos y la responsabilidad sobre el
          paquete corresponden a cada courier según sus propias condiciones.
        </p>
        <p>{BUSINESS.colecta.resumen}</p>
      </Seccion>

      <Seccion titulo="10. Reclamos y ley aplicable">
        <p>
          Si algo sale mal, escríbenos primero a{" "}
          <a
            href={`mailto:${BUSINESS.email}`}
            className="text-brand-700 underline underline-offset-4"
          >
            {BUSINESS.email}
          </a>{" "}
          o por WhatsApp al {BUSINESS.phoneDisplay}: casi todo se resuelve
          directo y más rápido.
        </p>
        <p>
          Estas condiciones se rigen por la ley chilena, en especial la Ley
          19.496 sobre protección de los derechos de los consumidores. Nada de
          lo escrito aquí limita los derechos que esa ley te reconoce. Si no
          llegamos a acuerdo, puedes reclamar ante el SERNAC o ante los
          tribunales que correspondan.
        </p>
      </Seccion>

      <Seccion titulo="11. Cambios a estas condiciones">
        <p>
          Podemos actualizar estos términos. La versión vigente es siempre la
          publicada en esta página, con su fecha de vigencia. Los cambios no se
          aplican con efecto retroactivo a pedidos ya realizados.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
