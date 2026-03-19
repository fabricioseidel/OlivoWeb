"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to unified Compras page (Pedidos tab)
export default function PedidosProveedorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/reabastecimiento?tab=pedidos");
  }, [router]);
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500" />
    </div>
  );
}
