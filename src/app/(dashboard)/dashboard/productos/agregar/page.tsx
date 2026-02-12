import Link from "next/link";
import AddProductForm from "@/components/productos/forms/AddProductForm";

export default function AgregarProductoPage() {
  return (
    <section className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/dashboard/productos" className="text-sm text-primary">
          &larr; Volver al listado
        </Link>
        <div>
          <p className="text-sm uppercase text-muted-foreground">Productos</p>
          <h1 className="text-3xl font-semibold tracking-tight">Crear producto</h1>
        </div>
      </header>
      <AddProductForm />
    </section>
  );
}

