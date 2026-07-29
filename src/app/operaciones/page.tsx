import OperacionesApp from "@/components/admin/operaciones/OperacionesApp";

/**
 * Punto de entrada del APK. Monta sólo la app de operaciones: sin barra
 * lateral del admin, sin catálogo de la tienda y sin salida a otras
 * secciones desde la interfaz.
 */
export default function OperacionesPage() {
  return <OperacionesApp />;
}
