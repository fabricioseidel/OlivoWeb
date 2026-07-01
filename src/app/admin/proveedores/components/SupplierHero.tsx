"use client";

import Link from "next/link";
import {
  TruckIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { HeroHeader } from "@/components/admin/shell";

interface SupplierHeroProps {
  loading: boolean;
  onRefresh: () => void;
}

export default function SupplierHero({ loading, onRefresh }: SupplierHeroProps) {
  return (
    <HeroHeader
      kicker="Compras"
      title="Proveedores"
      subtitle="Gestioná proveedores y asigná productos para automatizar pedidos"
      icon={<TruckIcon className="w-6 h-6 text-emerald-300" />}
      right={
        <div className="flex items-center gap-2">
          <Link href="/admin/proveedores/asignar">
            <button className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:bg-white/15 transition-all min-h-[36px]">
              <ArrowsRightLeftIcon className="size-4" />
              Asignación masiva
            </button>
          </Link>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-white/10 ring-1 ring-white/15 rounded-xl text-emerald-100 hover:bg-white/15 transition-colors min-h-[36px]"
            title="Actualizar"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      }
    />
  );
}
