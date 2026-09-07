"use client";

import { use } from "react";
import { useProducts } from "@/contexts/ProductContext";
import PackForm from "@/components/admin/packs/PackForm";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { getProductById, loading } = useProducts();
  const pack = getProductById(resolvedParams.id);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="inline-block size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p className="mt-2 text-sm">Cargando pack...</p>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
        <h2 className="text-lg font-bold text-gray-900">Pack no encontrado</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          El pack con identificador {resolvedParams.id} no existe o fue eliminado.
        </p>
        <Link href="/admin/packs">
          <Button type="button">Volver al listado de packs</Button>
        </Link>
      </div>
    );
  }

  return <PackForm initialData={pack} isEditing={true} />;
}
