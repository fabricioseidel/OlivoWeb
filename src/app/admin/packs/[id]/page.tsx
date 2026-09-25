"use client";

import { use, useEffect, useState } from "react";
import { useProducts, Product } from "@/contexts/ProductContext";
import PackForm from "@/components/admin/packs/PackForm";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function EditPackPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = decodeURIComponent(resolvedParams.id);
  const { getProductById, fetchDetails, loading: contextLoading } = useProducts();
  const [pack, setPack] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Intentar resolver desde el contexto local
    const local = getProductById(id);
    if (local) {
      setPack(local);
      setLoading(false);
      return;
    }

    // 2. Si no está en el contexto local o aún está cargando, buscar por fetchDetails directo
    if (!contextLoading) {
      fetchDetails(id)
        .then((data) => {
          if (isMounted && data) {
            setPack(data);
          }
        })
        .catch((err) => {
          console.warn("Pack no encontrado por fetch directo:", err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [id, getProductById, fetchDetails, contextLoading]);

  // Si se encontró pack localmente en el contexto pero el estado local aún no se sincronizó
  const effectivePack = pack || getProductById(id);

  if (loading || (contextLoading && !effectivePack)) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="inline-block size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <p className="mt-2 text-sm">Cargando pack...</p>
      </div>
    );
  }

  if (!effectivePack) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
        <h2 className="text-lg font-bold text-gray-900">Pack no encontrado</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          El pack con identificador &ldquo;{id}&rdquo; no existe o fue eliminado.
        </p>
        <Link href="/admin/packs">
          <Button type="button">Volver al listado de packs</Button>
        </Link>
      </div>
    );
  }

  return <PackForm initialData={effectivePack} isEditing={true} />;
}
