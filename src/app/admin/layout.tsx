"use client";
import React, { useEffect, useState, Fragment, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBagIcon,
  UsersIcon,
  TagIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  TruckIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  Bars3Icon,
  UserCircleIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ArchiveBoxIcon,
  MegaphoneIcon,
  TicketIcon,
  StarIcon,
  EnvelopeIcon,
  NewspaperIcon,
  SparklesIcon,
  BoltIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { POSProvider } from "@/contexts/POSContext";

// ── Sidebar Groups ──────────────────────────────────────────────────────
type MenuItem = { name: string; href: string; icon: typeof ChartBarIcon };
type MenuGroup = { label: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  {
    label: "General",
    items: [
      { name: "Dashboard", href: "/admin", icon: ChartBarIcon },
    ],
  },
  {
    label: "Ventas",
    items: [
      { name: "Punto de Venta", href: "/admin/pos", icon: UserCircleIcon },
      { name: "Venta Rápida", href: "/admin/productos/venta-rapida", icon: BoltIcon },
      { name: "Venta iPhone", href: "/admin/productos/venta-rapida-iphone", icon: CameraIcon },
      { name: "Caja (Arqueo)", href: "/admin/caja", icon: BanknotesIcon },
      { name: "Historial Ventas", href: "/admin/ventas", icon: CurrencyDollarIcon },
    ],
  },
  {
    label: "Inventario",
    items: [
      { name: "Productos", href: "/admin/productos", icon: ShoppingBagIcon },
      { name: "Creación Rápida", href: "/admin/productos/creacion-rapida", icon: SparklesIcon },
      { name: "Compra Rápida", href: "/admin/productos/compra-rapida", icon: ArrowPathIcon },
      { name: "Compra iPhone", href: "/admin/productos/compra-rapida-iphone", icon: CameraIcon },
      { name: "Categorías", href: "/admin/categorias", icon: TagIcon },
    ],
  },
  {
    label: "Compras",
    items: [
      { name: "Proveedores", href: "/admin/proveedores", icon: TruckIcon },
      { name: "Compras", href: "/admin/reabastecimiento", icon: ShoppingCartIcon },
    ],
  },
  {
    label: "Marketing",
    items: [
      { name: "Central Marketing", href: "/admin/marketing", icon: MegaphoneIcon },
      { name: "Cupones", href: "/admin/marketing/cupones", icon: TicketIcon },
      { name: "Programa Puntos", href: "/admin/marketing/puntos", icon: StarIcon },
      { name: "Plantillas Email", href: "/admin/marketing/emails", icon: EnvelopeIcon },
      { name: "Newsletter", href: "/admin/marketing/newsletter", icon: NewspaperIcon },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "Pedidos Clientes", href: "/admin/pedidos", icon: ClipboardDocumentListIcon },
      { name: "Usuarios", href: "/admin/usuarios", icon: UsersIcon },
      { name: "Constructor Visual", href: "/admin/constructor", icon: SparklesIcon },
      { name: "Configuración", href: "/admin/configuracion", icon: Cog6ToothIcon },
    ],
  },
];

// Flatten for active detection
const allItems = menuGroups.flatMap(g => g.items);

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth guard
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

  // Close mobile menu on navigate
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

  const isPOS = pathname === "/admin/pos";

  // ── Sidebar nav content (shared between desktop and mobile) ──
  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <nav className={`flex-1 overflow-y-auto ${mobile ? 'px-4 py-4' : 'px-3 py-2'}`}>
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!isCollapsed && (
              <p className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/50">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                        : "text-emerald-100/40 hover:text-emerald-300 hover:bg-white/5"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isCollapsed && !mobile ? "mx-auto" : ""}`} />
                    {(!isCollapsed || mobile) && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      <div className={`mt-auto ${mobile ? 'px-4 py-4' : 'px-3 py-4'} border-t border-white/5`}>
        <Link
          href="/"
          className={`flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all bg-white/5 text-emerald-300 hover:text-white hover:bg-white/10`}
        >
          <ShoppingBagIcon className={`h-4 w-4 shrink-0 ${isCollapsed && !mobile ? "mx-auto" : ""}`} />
          {(!isCollapsed || mobile) && <span className="truncate">Volver a la Tienda</span>}
        </Link>
      </div>
    </>
  );

  // Content wrapper: only POS gets POSProvider
  const wrappedContent = isPOS ? (
    <POSProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
    </POSProvider>
  ) : (
    <ErrorBoundary>{children}</ErrorBoundary>
  );

  return (
    <div className={`flex min-h-screen ${isPOS ? 'bg-black' : 'bg-[#fcfdfd]'}`}>
      {/* ── Mobile Sidebar (Slide-over) ── */}
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
              <Dialog.Panel className="relative flex w-full max-w-[280px] flex-1 flex-col bg-emerald-950 shadow-2xl">
                <div className="p-6 flex items-center justify-between border-b border-white/5">
                  <span className="text-lg font-black text-white tracking-widest">OLIVO<span className="text-emerald-500 italic">ADMIN</span></span>
                  <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 text-emerald-500 hover:text-white">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <NavContent mobile />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* ── Desktop Sidebar ── */}
      {!isPOS && (
        <div className={`hidden md:flex flex-col sticky top-0 h-screen bg-emerald-950 transition-all duration-500 ${isCollapsed ? "w-20" : "w-64"}`}>
          <div className="flex items-center h-20 px-6 border-b border-white/5">
            {!isCollapsed && <span className="text-lg font-black text-white">OLIVO<span className="text-emerald-500 italic">ADMIN</span></span>}
            {isCollapsed && <span className="text-lg font-black text-emerald-500 mx-auto italic">OA</span>}
          </div>
          <NavContent />
          <div className="p-4 border-t border-white/5 flex justify-center">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 text-emerald-500 hover:text-emerald-300 transition-colors">
              {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-emerald-950 px-4 md:hidden border-b border-white/5">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-emerald-400">
            <Bars3Icon className="h-5 w-5" />
          </button>
          <span className="text-md font-black text-white tracking-widest uppercase">Olivo<span className="text-emerald-500 italic lowercase">Admin</span></span>
          <div className="w-9" />
        </header>

        <main className={`flex-1 ${isPOS ? 'p-0' : 'py-4 px-3 sm:px-6 lg:px-8'}`}>
          {wrappedContent}
        </main>
      </div>
    </div>
  );
}
