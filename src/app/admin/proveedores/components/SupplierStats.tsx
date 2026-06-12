"use client";

import { TruckIcon, CubeIcon } from "@heroicons/react/24/outline";
import { StatsRow, StatsCard } from "@/components/admin/shell";

interface SupplierStatsProps {
  stats: {
    total: number;
    withProducts: number;
    totalAssignments: number;
    withoutContact: number;
  };
}

export default function SupplierStats({ stats }: SupplierStatsProps) {
  return (
    <StatsRow cols={4}>
      <StatsCard
        label="Proveedores"
        value={stats.total.toLocaleString()}
        tone="default"
        icon={<TruckIcon className="w-4 h-4" />}
      />
      <StatsCard
        label="Con productos"
        value={stats.withProducts.toLocaleString()}
        tone="emerald"
        icon={<CubeIcon className="w-4 h-4" />}
      />
      <StatsCard
        label="Asignaciones"
        value={stats.totalAssignments.toLocaleString()}
        tone="sky"
      />
      <StatsCard
        label="Sin contacto"
        value={stats.withoutContact.toLocaleString()}
        tone="amber"
        hint="Sin teléfono ni email"
      />
    </StatsRow>
  );
}
