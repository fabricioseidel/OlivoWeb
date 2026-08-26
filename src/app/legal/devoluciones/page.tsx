import type { Metadata } from "next";
import { BUSINESS } from "@/lib/seo/business";
import { LegalLayout, Lista, Seccion } from "@/components/legal/LegalLayout";

/**
 * Política de cambios y devoluciones.
 *
 * El punto delicado es el derecho a retracto de la compra a distancia: la Ley
 * 19.496 lo reconoce, pero los alimentos perecibles no se pueden devolver una
 * vez entregados sin romper la cadena de frío. El texto separa esos dos casos
 * en vez de mezclarlos, porque prometer una devolución que no se va a poder
 * cumplir genera más reclamos que decirlo claro desde el principio.
 */

export const metadata: Metadata = {
  title: `Cambios y devoluciones | ${BUSINESS.name}`,
  description:
    "Cómo cambiar o devolver un producto comprado en Olivo Market: plazos, productos perecibles, derecho a retracto y reembolsos.",
  alternates: { canonical: "/legal/devoluciones" },
  robots: { index: true, follow: true },
};

export default function DevolucionesPage() {
  return (
    <LegalLayout
      titulo="Cambios y devoluciones"
      resumen="Qué hacer si un producto llegó en mal estado, no era el que pediste o cambiaste de opinión."
      actual="/legal/devoluciones"
    >
      <Seccion titulo="Si el producto llegó mal, lo resolvemos siempre">
        <p>
          Es la situación más común y la más simple: si un producto llega
          dañado, vencido, en mal estado, incompleto o no corresponde a lo que
          pediste, <strong>lo cambiamos o te devolvemos el dinero</strong>. Sin
          discusión y sin costo para ti.
        </p>
        <p>
          Avísanos dentro de las <strong>48 horas</strong> siguientes a recibir
          el pedido, con una foto del producto. Es el plazo que nos permite
          revisar el lote y reclamarle al proveedor si corresponde; pasado ese
          tiempo se hace difícil determinar si el problema venía de origen.
        </p>
        <p>
          Esto no reemplaza tus derechos legales: la Ley 19.496 te da garantía
          por productos defectuosos, y este plazo no la limita.
        </p>
      </Seccion>

      <Seccion titulo="Si cambiaste de opinión">
        <p>
          En las compras hechas por internet existe el <strong>derecho a
          retracto</strong>: puedes dejar sin efecto la compra dentro de los{" "}
          <strong>10 días</strong> siguientes a recibir el producto, según el
          artículo 3 bis de la Ley 19.496.
        </p>
        <p>Para ejercerlo, el producto tiene que estar sin usar y en su envase
          original, en condiciones de volver a venderse. Por su naturaleza,{" "}
          <strong>quedan fuera</strong>:
        </p>
        <Lista
          items={[
            "Alimentos frescos, refrigerados o congelados, una vez entregados: se rompe la cadena de frío y no se pueden volver a vender.",
            "Productos abiertos o con el sello sanitario roto.",
            "Productos preparados o cortados especialmente para tu pedido.",
          ]}
        />
        <p>
          En esos casos igual puedes escribirnos: si el problema es de calidad,
          aplica lo de la sección anterior, que no tiene estas restricciones.
        </p>
      </Seccion>

      <Seccion titulo="Cómo lo pides">
        <Lista
          items={[
            <>
              Escríbenos a{" "}
              <a
                href={`mailto:${BUSINESS.email}`}
                className="text-emerald-700 underline underline-offset-4"
              >
                {BUSINESS.email}
              </a>{" "}
              o por WhatsApp al {BUSINESS.phoneDisplay}.
            </>,
            "Indica el número de pedido, qué producto es y qué pasó. Si es un problema de calidad, adjunta una foto.",
            "Te respondemos con los pasos: en general pasamos a retirar el producto en la misma entrega siguiente, o lo traes al local si te queda cómodo.",
          ]}
        />
      </Seccion>

      <Seccion titulo="Reembolsos">
        <Lista
          items={[
            "El reembolso se hace por el mismo medio de pago que usaste. Es la vía que exige MercadoPago y la que deja registro para ambos.",
            "Una vez que lo autorizamos, el dinero suele reflejarse en un plazo de 3 a 10 días hábiles, según tu banco o emisor de tarjeta. Ese plazo lo maneja el medio de pago, no nosotros.",
            "Si el problema fue nuestro —producto en mal estado, equivocado o faltante— también devolvemos el costo de despacho.",
            "Si ejerces el derecho a retracto por haber cambiado de opinión, el costo de despacho de ida no se reembolsa.",
          ]}
        />
      </Seccion>

      <Seccion titulo="Pedidos que no alcanzaste a recibir">
        <p>
          Si no había nadie en la dirección al momento de la entrega, te
          contactamos para coordinar una segunda visita o el retiro en tienda.
          Si después de eso el pedido no se puede entregar y contiene productos
          perecibles, nos comunicamos contigo antes de tomar cualquier decisión
          sobre el reembolso.
        </p>
      </Seccion>

      <Seccion titulo="Encomiendas">
        <p>
          Esta política cubre los productos que nos compras. Los paquetes que
          entregas o retiras como parte del servicio de punto de envíos se rigen
          por las condiciones del courier correspondiente, que es quien
          transporta y responde por ellos.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
