"use client";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, Fragment } from "react";
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
  ArrowUpTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verificar si el usuario es administrador o vendedor
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      const callback = encodeURIComponent(pathname);
      router.replace(`/login?callbackUrl=${callback}`);
      return;
    }

    if (status === "authenticated") {
      const userRole = ((session as any)?.role || (session as any)?.user?.role || "USER").toString().toUpperCase();
      if (userRole !== "ADMIN" && userRole !== "SELLER") {
        router.replace("/");
      }
    }
  }, [status, session, router, pathname]);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const userRole = ((session as any)?.role || (session as any)?.user?.role || "USER").toString().toUpperCase();
  if (userRole !== "ADMIN" && userRole !== "SELLER") return null;

  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: ChartBarIcon },
    { name: "Productos", href: "/admin/productos", icon: ShoppingBagIcon },
    { name: "Categorías", href: "/admin/categorias", icon: TagIcon },
    { name: "Ventas", href: "/admin/ventas", icon: CurrencyDollarIcon },
    { name: "Uber Eats Export", href: "/admin/uber-eats", icon: ArrowUpTrayIcon },
    { name: "Reabastecimiento", href: "/admin/reabastecimiento", icon: ArrowPathIcon },
    { name: "Pedidos Proveedores", href: "/admin/pedidos-proveedor", icon: TruckIcon },
    { name: "Proveedores", href: "/admin/proveedores", icon: TruckIcon },
    { name: "Pedidos Clientes", href: "/admin/pedidos", icon: ClipboardDocumentListIcon },
    { name: "Usuarios", href: "/admin/usuarios", icon: UsersIcon },
    { name: "Configuración", href: "/admin/configuracion", icon: Cog6ToothIcon },
    { name: "Debug", href: "/debug/categorias", icon: BugAntIcon },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar Móvil (Slide-over) */}
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100] md:hidden" onClose={setMobileMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-[101]">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-[280px] flex-1 flex-col bg-gray-900 shadow-2xl">
                <div className="p-6 flex items-center justify-between border-b border-white/5">
                  <span className="text-xl font-black text-white tracking-tighter">
                    OLIVO<span className="text-emerald-500">ADMIN</span>
                  </span>
                  <button type="button" className="p-2 text-gray-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
                  <div className="space-y-1.5">
                    {menuItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all ${pathname === item.href
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                          }`}
                      >
                        <item.icon
                          className={`mr-4 h-5 w-5 shrink-0 ${pathname === item.href ? "text-white" : "text-gray-500 group-hover:text-gray-300"
                            }`}
                        />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </nav>

                <div className="p-6 border-t border-white/5">
                  <button
                    onClick={() => { /* Logout logic */ }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"
                  >
                    <ArrowPathIcon className="w-5 h-5 rotate-180" />
                    Cerrar Sesión
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Sidebar Escritorio */}
      <div
        className={`hidden md:flex flex-col sticky top-0 h-screen bg-gray-900 border-r border-gray-800 transition-all duration-300 flex-shrink-0 ${isCollapsed ? "w-20" : "w-64"
          }`}
      >
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900 justify-between">
          {!isCollapsed && (
            <Link href="/admin" className="text-xl font-bold text-white truncate">
              OLIVOMARKET <span className="text-emerald-400">Admin</span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/admin" className="text-xl font-bold text-emerald-400 mx-auto">
              OM
            </Link>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all ${pathname === item.href
                  ? "bg-emerald-600/10 text-emerald-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  } ${isCollapsed ? "justify-center" : ""}`}
              >
                <item.icon
                  className={`h-6 w-6 shrink-0 transition-colors ${pathname === item.href ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"
                    } ${!isCollapsed ? "mr-3" : ""}`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
          >
            {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header Móvil */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 md:hidden">
          <button type="button" className="-m-2.5 p-2.5 text-gray-700" onClick={() => setMobileMenuOpen(true)}>
            <span className="sr-only">Abrir menú</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <Link href="/admin" className="text-lg font-bold text-gray-900">
            OLIVOMARKET <span className="text-emerald-600">Admin</span>
          </Link>

          <div className="w-6" /> {/* Placeholder para equilibrar */}
        </header>

        <main className="flex-1">
          <div className="py-6 sm:py-8 lg:py-10">
            <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
