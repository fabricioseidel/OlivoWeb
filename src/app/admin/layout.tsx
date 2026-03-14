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
    <div className="flex min-h-screen bg-[#fcfdfd]">
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
              <Dialog.Panel className="relative flex w-full max-w-[300px] flex-1 flex-col bg-emerald-950 shadow-2xl">
                <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" />
                <div className="p-8 flex items-center justify-between border-b border-white/5 bg-emerald-950/50 backdrop-blur-md">
                  <span className="text-xl font-black text-white tracking-widest">
                    OLIVO<span className="text-emerald-500 italic">ADMIN</span>
                  </span>
                  <button type="button" className="p-3 bg-white/5 rounded-2xl text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-white/10" onClick={() => setMobileMenuOpen(false)}>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
                  <div className="space-y-1.5">
                    {menuItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 ${pathname === item.href
                          ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/40"
                          : "text-emerald-100/30 hover:bg-white/5 hover:text-emerald-400 font-bold"
                          }`}
                      >
                        <item.icon
                          className={`mr-4 h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${pathname === item.href ? "text-white" : "text-emerald-100/20 group-hover:text-emerald-400"
                            }`}
                        />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </nav>

                <div className="p-8 border-t border-white/5 bg-emerald-950/30">
                  <button
                    onClick={() => { /* Logout logic */ }}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-400/5 hover:bg-rose-400 hover:text-white rounded-2xl transition-all border border-rose-400/20"
                  >
                    <ArrowPathIcon className="w-4 h-4 rotate-180" />
                    Cerrar Sesión
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Sidebar Escritorio Premium */}
      <div
        className={`hidden md:flex flex-col sticky top-0 h-screen bg-emerald-950 border-r border-white/5 transition-all duration-500 ease-in-out flex-shrink-0 relative ${isCollapsed ? "w-24" : "w-72"
          }`}
      >
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" />
        
        <div className="flex items-center h-24 flex-shrink-0 px-8 bg-emerald-950/50 backdrop-blur-md justify-between border-b border-white/5 mb-6">
          {!isCollapsed && (
            <Link href="/admin" className="text-xl font-black text-white tracking-widest">
              OLIVO<span className="text-emerald-500 italic">ADMIN</span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/admin" className="text-xl font-black text-emerald-500 mx-auto italic tracking-tighter">
              OA
            </Link>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden px-4 mb-4 scrollbar-hide">
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group relative flex items-center px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-500 ${isActive
                    ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/40 translate-x-1"
                    : "text-emerald-100/30 hover:bg-emerald-600/10 hover:text-emerald-400"
                    } ${isCollapsed ? "justify-center px-0 h-14" : ""}`}
                >
                  <item.icon
                    className={`shrink-0 transition-all duration-500 group-hover:scale-110 ${isActive ? "text-white" : "text-emerald-100/20 group-hover:text-emerald-500"
                      } ${!isCollapsed ? "mr-4 h-5 w-5" : "h-6 w-6"}`}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                  
                  {/* Indicador Activo */}
                  {isActive && !isCollapsed && (
                    <div className="absolute left-0 w-1 h-6 bg-white rounded-full -ml-4" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-8 border-t border-white/5 bg-emerald-950/30 flex justify-between items-center">
            {!isCollapsed && (
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Vuestro Market</span>
                    <span className="text-[10px] font-bold text-emerald-100/20 truncate w-32 uppercase">Panel de Control</span>
                </div>
            )}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-3 rounded-2xl bg-white/5 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-white/10"
            >
                {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
            </button>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header Móvil Premium */}
        <header className="sticky top-0 z-40 flex h-20 shrink-0 items-center justify-between bg-emerald-950 px-6 shadow-xl shadow-emerald-950/20 md:hidden border-b border-white/5">
          <button type="button" className="p-3 bg-white/5 border border-white/10 rounded-2xl text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-lg" onClick={() => setMobileMenuOpen(true)}>
            <Bars3Icon className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link href="/admin" className="text-xl font-black text-white tracking-widest uppercase">
            Olivo<span className="text-emerald-500 italic lowercase">Admin</span>
          </Link>

          <div className="w-11" />
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
