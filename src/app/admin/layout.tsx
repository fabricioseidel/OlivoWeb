"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBagIcon,
  UsersIcon,
  TagIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BugAntIcon,
  TruckIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Verificar si el usuario es administrador o vendedor
  useEffect(() => {
    console.log("[ADMIN-LAYOUT] Session status:", status);
    console.log("[ADMIN-LAYOUT] Session data:", session);
    console.log("[ADMIN-LAYOUT] User role:", session?.user?.role);
    
    if (status === "authenticated") {
      const userRole = (session as any)?.user?.role || (session as any)?.role;
      
      // Permitir acceso a ADMIN y SELLER
      if (userRole !== "ADMIN" && userRole !== "SELLER") {
        console.log("Usuario sin permisos de administrador o vendedor. Redirigiendo...");
        router.push("/");
        router.refresh();
      }
    } else if (status === "unauthenticated") {
      console.log("Usuario no autenticado. Redirigiendo al login...");
      router.push("/login?callbackUrl=/admin");
      router.refresh();
    }
  }, [session, status, router]);

  // Mostrar pantalla de carga mientras verifica la sesión
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Verificar rol después de cargar
  const userRole = (session as any)?.user?.role || (session as any)?.role;
  if (userRole !== "ADMIN" && userRole !== "SELLER") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Estructura del menú de administración
  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: ChartBarIcon },
    { name: "Productos", href: "/admin/productos", icon: ShoppingBagIcon },
    { name: "Categorías", href: "/admin/categorias", icon: TagIcon },
    { name: "Ventas", href: "/admin/ventas", icon: CurrencyDollarIcon },
    { name: "Reabastecimiento", href: "/admin/reabastecimiento", icon: ArrowPathIcon },
    { name: "Pedidos Proveedores", href: "/admin/pedidos-proveedor", icon: TruckIcon },
    { name: "Proveedores", href: "/admin/proveedores", icon: TruckIcon },
    { name: "Pedidos Clientes", href: "/admin/pedidos", icon: ClipboardDocumentListIcon },
    { name: "Usuarios", href: "/admin/usuarios", icon: UsersIcon },
    { name: "Configuración", href: "/admin/configuracion", icon: Cog6ToothIcon },
    { name: "Debug Categorías", href: "/debug/categorias", icon: BugAntIcon },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 print:hidden">
        <div className="flex flex-col w-64 fixed h-screen">
          <div className="flex flex-col flex-1 bg-gray-800">
            <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
              <Link href="/admin" className="text-xl font-bold text-white">
                OLIVOMARKET <span className="text-emerald-400">Admin</span>
              </Link>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <item.icon
                      className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-64 print:ml-0">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 print:hidden">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <span className="sr-only">Abrir sidebar</span>
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        <main className="relative z-0 focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
