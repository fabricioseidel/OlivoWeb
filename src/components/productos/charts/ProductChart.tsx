import ProductBar from "./ProductBar";

export default async function ProductChart() {
  // TODO: utilizar getProducts() para agrupar stock por categoría y pasarlo al gráfico
  return (
    <section className="rounded-lg border border-muted-foreground/40 p-6">
      <header className="mb-4">
        <p className="text-xs uppercase text-muted-foreground">Inventario</p>
        <h2 className="text-xl font-semibold">Distribución de productos</h2>
      </header>
      <ProductBar categories={[]} dataSeries={[]} labels={[]} />
      <p className="mt-4 text-xs text-muted-foreground">
        Este componente está en scaffolding; falta conectar datos reales.
      </p>
    </section>
  );
}
