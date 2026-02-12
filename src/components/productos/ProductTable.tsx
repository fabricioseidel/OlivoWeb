import { getProducts } from "@/server/products.service";
import ProductActions from "./ProductActions";

export default async function ProductTable() {
    const products = await getProducts().catch((error) => {
        console.error("Error fetching products:", error);
        return null;
    });

    if (!products) {
        return (
            <div className="rounded-md border border-dashed border-red-200 bg-red-50 p-6 text-sm text-red-600 text-center">
                No pudimos cargar los productos. Por favor intenta más tarde.
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground text-center">
                No hay productos registrados todavía.
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-background">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Nombre</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Categoría</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Precio Ref.</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Stock</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {products.map((product) => (
                            <tr
                                key={product.id}
                                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                            >
                                <td className="p-4 align-middle font-medium">{product.name}</td>
                                <td className="p-4 align-middle text-muted-foreground">{product.category}</td>
                                <td className="p-4 align-middle font-mono">
                                    ${typeof product.sale_price === 'number' ? product.sale_price.toFixed(2) : product.sale_price}
                                </td>
                                <td className="p-4 align-middle font-mono">
                                    {product.stock}
                                </td>
                                <td className="p-4 align-middle text-right">
                                    <ProductActions productId={product.id} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
