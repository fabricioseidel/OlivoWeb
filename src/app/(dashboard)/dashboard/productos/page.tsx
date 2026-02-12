import { Suspense } from "react";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import ProductTable from "@/components/productos/ProductTable";

export default function ProductsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
                    <p className="text-muted-foreground">
                        Gestiona el inventario, precios y stock.
                    </p>
                </div>
                <Link href="/dashboard/productos/agregar">
                    <Button>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Nuevo Producto
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border bg-background">
                <Suspense fallback={<div className="p-10 text-center">Cargando productos...</div>}>
                    <ProductTable />
                </Suspense>
            </div>
        </div>
    );
}
