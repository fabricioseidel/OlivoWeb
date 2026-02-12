interface ShowProductCardProps {
  name?: string;
  category?: string;
  description?: string;
  price?: number;
  stock?: number;
}

export default function ShowProductCard({ name, category, description, price, stock }: ShowProductCardProps) {
  return (
    <article className="space-y-2 rounded-lg border border-muted-foreground/30 p-4">
      <p className="text-xs uppercase text-muted-foreground">Vista previa de producto</p>
      <dl className="space-y-1 text-sm">
        <div>
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="font-medium">{name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Categoría</dt>
          <dd className="font-medium">{category ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Descripción</dt>
          <dd className="font-medium">{description ?? '—'}</dd>
        </div>
        <div className="flex gap-4">
          <div>
            <dt className="text-muted-foreground">Precio</dt>
            <dd className="font-semibold">{price != null ? `$${price}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stock</dt>
            <dd className="font-semibold">{stock != null ? stock : '—'}</dd>
          </div>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {/* TODO: mostrar info extendida (lotes, métricas) */}
        Completar cuando ProductTable y servicios estén disponibles.
      </p>
    </article>
  );
}
