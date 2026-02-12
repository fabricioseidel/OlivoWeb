"use client";

interface ProductBarProps {
  labels: string[];
  dataSeries: number[];
  categories: string[];
}

export default function ProductBar({ labels, dataSeries, categories }: ProductBarProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        TODO: implementar gráfico de barras reutilizando el componente de visualización global.
      </p>
      <pre className="text-xs text-muted-foreground/70">
        {JSON.stringify({ labels, dataSeries, categories }, null, 2)}
      </pre>
    </div>
  );
}
