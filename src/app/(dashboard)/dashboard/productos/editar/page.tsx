import Link from "next/link";
import { redirect } from "next/navigation";

import EditProductForm from "@/components/productos/forms/EditProductForm";
import { getProductById } from "@/server/products.service";

type EditProductPageProps = {
  searchParams: Promise<{
    id?: string;
  }>;
};

export default async function EditarProductoPage(props: EditProductPageProps) {
  const searchParams = await props.searchParams;
  const productId = searchParams?.id;

  if (!productId) {
    redirect("/dashboard/productos");
  }

  const product = await getProductById(productId);

  if (!product) {
    redirect("/dashboard/productos");
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/dashboard/productos" className="text-sm text-primary">
          &larr; Volver al listado
        </Link>
        <div>
          <p className="text-sm uppercase text-muted-foreground">Productos</p>
          <h1 className="text-3xl font-semibold tracking-tight">Editar producto</h1>
        </div>
      </header>
      <EditProductForm productId={productId} initialProduct={product} />
    </section>
  );
}
