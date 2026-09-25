import OperacionesApp from "@/components/admin/operaciones/OperacionesApp";

/**
 * Operaciones dentro del panel admin (escritorio), con la barra lateral y el
 * resto del panel alrededor. La versión para el teléfono vive en /operaciones,
 * que monta el mismo componente sin nada más.
 */
export default function OperacionesAdminPage() {
  return <OperacionesApp />;
}
