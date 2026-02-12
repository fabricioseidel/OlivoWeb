"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteProductAction } from "@/actions/products";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

interface ProductActionsProps {
  productId?: string | number;
}

export default function ProductActions({ productId }: ProductActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const id = productId ? String(productId) : "";

  const handleDelete = () => {
    if (!id) return;
    const confirmed = window.confirm("¿Seguro que deseas eliminar este producto?");
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (!result?.ok) {
        const message = result?.message ?? "No se pudo eliminar el producto";
        setError(message);
        showToast(message, result?.toastType ?? "error");
        return;
      }

      showToast("Producto eliminado con éxito", "success");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/productos/editar?id=${id}`}
          className="rounded-md border border-primary/30 px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
        >
          Editar
        </Link>
        <Button
          type="button"
          variant="danger"
          size="sm"
          loading={isPending}
          disabled={!id}
          onClick={handleDelete}
        >
          Eliminar
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
