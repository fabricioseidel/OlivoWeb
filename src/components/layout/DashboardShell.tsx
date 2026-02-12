"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ChartNoAxesCombined, Home, Package, Settings, Users2, ShoppingCart as ShoppingCartIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Resumen", icon: <Home className="size-4" /> },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: <ShoppingCartIcon className="size-4" /> },
  { href: "/dashboard/productos", label: "Productos", icon: <Package className="size-4" /> },
  { href: "/dashboard/ventas", label: "Ventas", icon: <ChartNoAxesCombined className="size-4" /> },
  { href: "/dashboard/clientes", label: "Usuarios", icon: <Users2 className="size-4" /> },
  { href: "/dashboard/reportes", label: "Reportes", icon: <ChartNoAxesCombined className="size-4" /> },
  { href: "/dashboard/configuracion", label: "Configuración", icon: <Settings className="size-4" /> },
];

export default function DashboardShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden border-r border-slate-200 bg-white/70 px-4 py-6 md:block md:w-64 lg:w-72">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">OlivoWeb</p>
          <p className="text-lg font-semibold text-slate-900">Panel</p>
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </header>
        <div className="px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
