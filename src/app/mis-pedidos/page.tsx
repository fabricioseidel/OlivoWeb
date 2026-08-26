import { redirect } from "next/navigation";

/**
 * Ruta antigua. La lista real de pedidos vive en /mi-cuenta/pedidos.
 *
 * Antes esta página mostraba dos pedidos inventados a modo de maqueta
 * ("ORD-5421", "ORD-5422") que cualquier cliente que llegara a la URL veía
 * como si fueran suyos, con enlaces a un detalle inexistente. Se deja el
 * redirect porque la URL puede estar guardada o enlazada desde fuera.
 */
export default function MisPedidosPage() {
  redirect("/mi-cuenta/pedidos");
}
