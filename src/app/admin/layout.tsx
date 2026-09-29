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
  ShoppingCartIcon,
  BanknotesIcon,
  MegaphoneIcon,
  TicketIcon,
  StarIcon,
  EnvelopeIcon,
  NewspaperIcon,
  SparklesIcon,
  BoltIcon,
  Squares2X2Icon,
  RocketLaunchIcon,
  ClipboardDocumentCheckIcon,
  QrCodeIcon,
  ClockIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  BuildingStorefrontIcon,
  BeakerIcon,
  UserGroupIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { Dialog, Transition } from "@headlessui/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { POSProvider } from "@/contexts/POSContext";
import { BranchProvider } from "@/contexts/BranchContext";
import BranchSelector from "@/components/admin/BranchSelector";

// ── Sidebar Groups ──────────────────────────────────────────────────────
// `soloAdmin`: el vendedor (SELLER) no lo ve en el menú ni puede entrar por
// URL. Las rutas de la API lo exigen también; esto es para no mostrarle una
// pantalla que le respondería 403.
type MenuItem = { name: string; href: string; icon: typeof ChartBarIcon; soloAdmin?: boolean };
type MenuGroup = { label: string; items: MenuItem[] };

// OLIVOTEAM: operación diaria de la tienda
const menuGroupsOlivoTeam: MenuGroup[] = [
  {
    label: "Resumen",
    items: [
      { name: "Dashboard", href: "/admin", icon: ChartBarIcon },
      { name: "Estado de apertura", href: "/admin/apertura", icon: ClipboardDocumentCheckIcon, soloAdmin: true },
    ],
  },
  {
    label: "Operación diaria",
    items: [
      { name: "Operaciones", href: "/admin/operaciones", icon: BoltIcon },
      { name: "POS", href: "/admin/pos", icon: ShoppingCartIcon },
      { name: "Caja", href: "/admin/caja", icon: BanknotesIcon },
      { name: "Compras del personal", href: "/admin/compras-personal", icon: UserGroupIcon },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { name: "Productos", href: "/admin/productos", icon: ShoppingBagIcon },
      { name: "Packs y Combos", href: "/admin/packs", icon: SparklesIcon },
      { name: "Categorías", href: "/admin/categorias", icon: TagIcon },
      { name: "Edición masiva", href: "/admin/productos/edicion-masiva", icon: Squares2X2Icon },
      { name: "Precios y costos", href: "/admin/precios", icon: BanknotesIcon, soloAdmin: true },
    ],
  },
  {
    label: "Compras",
    items: [
      { name: "Reabastecimiento", href: "/admin/reabastecimiento", icon: ArrowPathIcon, soloAdmin: true },
      { name: "Proveedores", href: "/admin/proveedores", icon: TruckIcon, soloAdmin: true },
    ],
  },
  {
    label: "Ventas",
    items: [
      { name: "Historial", href: "/admin/ventas", icon: CurrencyDollarIcon },
      { name: "Reportes", href: "/admin/reportes", icon: ChartBarIcon },
    ],
  },
  {
    label: "Pedidos",
    items: [
      { name: "Pedidos Clientes", href: "/admin/pedidos", icon: ClipboardDocumentListIcon },
      { name: "Uber Eats", href: "/admin/uber-eats", icon: GlobeAltIcon },
    ],
  },
  {
    label: "Administración",
    items: [
      { name: "Gestión documental", href: "/admin/documentos", icon: FolderOpenIcon, soloAdmin: true },
    ],
  },
];

/**
 * Pantallas que no están en el menú pero se abren desde una que sí: un
 * pedido a proveedor se crea y se abre desde Reabastecimiento. Sin esto, el
 * guardia de rutas las mandaba al Dashboard.
 */
const RUTAS_HIJAS: Record<string, string> = {
  "/admin/pedidos-proveedor": "/admin/reabastecimiento",
};

/** El menú que corresponde al rol: sin los ítems `soloAdmin` para el vendedor. */
function menuParaRol(grupos: MenuGroup[], rol: string): MenuGroup[] {
  if (rol === "ADMIN") return grupos;
  return grupos
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.soloAdmin) }))
    .filter((g) => g.items.length > 0);
}

// LABORATORIO FABRI: marketing, sistema y herramientas avanzadas
const menuGroupsLaboratorioFabri: MenuGroup[] = [
  {
    label: "Marketing",
    items: [
      { name: "Central", href: "/admin/marketing", icon: MegaphoneIcon, soloAdmin: true },
      { name: "Campañas", href: "/admin/marketing/campanas", icon: RocketLaunchIcon, soloAdmin: true },
      { name: "Cupones", href: "/admin/marketing/cupones", icon: TicketIcon, soloAdmin: true },
      { name: "Cupones QR", href: "/admin/marketing/cupones-qr", icon: QrCodeIcon, soloAdmin: true },
      { name: "Programa Puntos", href: "/admin/marketing/puntos", icon: StarIcon, soloAdmin: true },
      { name: "Emails", href: "/admin/marketing/emails", icon: EnvelopeIcon, soloAdmin: true },
      { name: "Newsletter", href: "/admin/marketing/newsletter", icon: NewspaperIcon, soloAdmin: true },
      { name: "Historial", href: "/admin/marketing/historial", icon: ClockIcon, soloAdmin: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { name: "Usuarios", href: "/admin/usuarios", icon: UsersIcon, soloAdmin: true },
      // "Constructor Visual" en el grupo Sistema era imposible de encontrar:
      // quien quiere corregir el título de la portada no busca entre Usuarios y
      // Configuración. Se llama por lo que hace y vive donde se lo busca.
      { name: "Textos de la portada", href: "/admin/constructor", icon: SparklesIcon, soloAdmin: true },
      { name: "Configuración", href: "/admin/configuracion", icon: Cog6ToothIcon, soloAdmin: true },
    ],
  },
];

// Helper Dropdown component for selecting mode
const MenuDropdown = ({
  currentMode,
  onChangeMode,
}: {
  currentMode: "OLIVOTEAM" | "LABORATORIO_FABRI";
  onChangeMode: (mode: "OLIVOTEAM" | "LABORATORIO_FABRI") => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-brand-900/40 hover:bg-brand-900/60 border border-white/10 rounded-xl text-xs text-white font-bold uppercase tracking-wider transition-all"
      >
        <span className="flex items-center gap-2">
          {currentMode === "OLIVOTEAM" ? (
            <BuildingStorefrontIcon className="h-4 w-4 text-brand-400 shrink-0" />
          ) : (
            <BeakerIcon className="h-4 w-4 text-brand-400 shrink-0" />
          )}
          <span className="truncate">
            {currentMode === "OLIVOTEAM" ? "OLIVOTEAM" : "LAB FABRI"}
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 text-brand-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute left-0 right-0 mt-2 p-1.5 bg-brand-950 border border-white/10 rounded-xl shadow-xl z-20 space-y-1">
            <button
              onClick={() => {
                onChangeMode("OLIVOTEAM");
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors text-left ${
                currentMode === "OLIVOTEAM"
                  ? "bg-brand-600 text-white"
                  : "text-brand-100/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <BuildingStorefrontIcon className="h-3.5 w-3.5 shrink-0" />
              <span>OLIVOTEAM</span>
            </button>
            <button
              onClick={() => {
                onChangeMode("LABORATORIO_FABRI");
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors text-left ${
                currentMode === "LABORATORIO_FABRI"
                  ? "bg-brand-600 text-white"
                  : "text-brand-100/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <BeakerIcon className="h-3.5 w-3.5 shrink-0" />
              <span>LAB FABRI</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

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
  const [panelMode, setPanelMode] = useState<"OLIVOTEAM" | "LABORATORIO_FABRI" | null>(null);

  // Load from localStorage on mount (avoid hydration mismatch)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_panel_mode");
      if (saved === "OLIVOTEAM" || saved === "LABORATORIO_FABRI") {
        setPanelMode(saved);
      } else {
        setPanelMode("OLIVOTEAM");
      }
    } else {
      setPanelMode("OLIVOTEAM");
    }
  }, []);

  // Update panel mode and save to localStorage
  const updatePanelMode = (mode: "OLIVOTEAM" | "LABORATORIO_FABRI") => {
    setPanelMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_panel_mode", mode);
    }
  };

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

  const rolActual = ((session as any)?.role || (session as any)?.user?.role || "USER").toString().toUpperCase();

  // Route redirect if not valid in the selected mode
  useEffect(() => {
    if (!panelMode || !pathname.startsWith("/admin") || pathname === "/admin") return;
    // Sin sesión todavía el rol se lee como USER y se expulsaría al ADMIN de
    // las pantallas `soloAdmin` antes de saber quién es.
    if (status !== "authenticated") return;

    const permitida = (grupos: MenuGroup[]) => {
      const hrefs = menuParaRol(grupos, rolActual).flatMap(g => g.items.map(item => item.href));
      return hrefs.some(href => pathname === href || pathname.startsWith(href + "/")) ||
        // Pantallas que no están en el menú pero cuelgan de una que sí.
        Object.entries(RUTAS_HIJAS).some(([hija, madre]) =>
          (pathname === hija || pathname.startsWith(hija + "/")) &&
          hrefs.some(href => madre === href));
    };

    const actual = panelMode === "OLIVOTEAM" ? menuGroupsOlivoTeam : menuGroupsLaboratorioFabri;
    const otro = panelMode === "OLIVOTEAM" ? menuGroupsLaboratorioFabri : menuGroupsOlivoTeam;
    if (permitida(actual)) return;

    // Un enlace o marcador a una pantalla del otro modo: se cambia de modo en
    // vez de expulsar al Dashboard sin explicación.
    if (permitida(otro)) {
      updatePanelMode(panelMode === "OLIVOTEAM" ? "LABORATORIO_FABRI" : "OLIVOTEAM");
      return;
    }

    router.push("/admin");
  }, [panelMode, pathname, router, rolActual, status]);

  // Close mobile menu on navigate
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (status === "loading" || panelMode === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;
  const userRole = ((session as any)?.role || (session as any)?.user?.role || "USER").toString().toUpperCase();
  if (userRole !== "ADMIN" && userRole !== "SELLER") return null;

  const isPOS = pathname === "/admin/pos";

  // ── Sidebar nav content (shared between desktop and mobile) ──
  const esAdmin = userRole === "ADMIN";
  const NavContent = ({ mobile = false }: { mobile?: boolean }) => {
    // El cajero siempre ve OLIVOTEAM: el modo LAB no tiene nada para él.
    const currentMenuGroups = menuParaRol(
      panelMode === "OLIVOTEAM" || !esAdmin ? menuGroupsOlivoTeam : menuGroupsLaboratorioFabri,
      userRole,
    );

    return (
      <>
        {/* Panel Selector (Pill Dropdown). El modo LAB es sólo de ADMIN. */}
        {esAdmin && (!isCollapsed || mobile) && (
          <div className="px-4 py-3 border-b border-white/5">
            <MenuDropdown
              currentMode={panelMode}
              onChangeMode={updatePanelMode}
            />
          </div>
        )}
        {esAdmin && isCollapsed && !mobile && (
          <div className="py-3 border-b border-white/5 flex justify-center">
            <button
              onClick={() => updatePanelMode(panelMode === "OLIVOTEAM" ? "LABORATORIO_FABRI" : "OLIVOTEAM")}
              title={panelMode === "OLIVOTEAM" ? "Cambiar a Laboratorio" : "Cambiar a OlivoTeam"}
              className="p-2 rounded-xl bg-white/5 text-brand-300 hover:text-white transition-colors"
            >
              {panelMode === "OLIVOTEAM" ? (
                <BuildingStorefrontIcon className="h-5 w-5" />
              ) : (
                <BeakerIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        )}

        <nav className={`flex-1 overflow-y-auto ${mobile ? 'px-4 py-4' : 'px-3 py-2'}`}>
          {/* Selector de sucursal (solo relevante para OLIVOTEAM) */}
          {panelMode === "OLIVOTEAM" && <BranchSelector collapsed={isCollapsed && !mobile} />}
          {currentMenuGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {!isCollapsed && (
                <p className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-brand-500/50">
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
                          ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                          : "text-brand-100/40 hover:text-brand-300 hover:bg-white/5"
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

        {/* Toggle Switch X-LAB */}
        {esAdmin && (!isCollapsed || mobile) && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-1.5">
              <BeakerIcon className="h-3.5 w-3.5 shrink-0" />
              <span>X-LAB</span>
            </span>
            <button
              onClick={() => updatePanelMode(panelMode === "OLIVOTEAM" ? "LABORATORIO_FABRI" : "OLIVOTEAM")}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                panelMode === "LABORATORIO_FABRI" ? "bg-brand-500" : "bg-brand-950 border-white/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  panelMode === "LABORATORIO_FABRI" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}

        <div className={`mt-auto ${mobile ? 'px-4 py-4' : 'px-3 py-4'} border-t border-white/5`}>
          <Link
            href="/"
            className={`flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all bg-white/5 text-brand-300 hover:text-white hover:bg-white/10`}
          >
            <ShoppingBagIcon className={`h-4 w-4 shrink-0 ${isCollapsed && !mobile ? "mx-auto" : ""}`} />
            {(!isCollapsed || mobile) && <span className="truncate">Volver a la Tienda</span>}
          </Link>
        </div>
      </>
    );
  };

  // Content wrapper
  const wrappedContent = isPOS ? (
    <POSProvider>
      <ErrorBoundary>{children}</ErrorBoundary>
    </POSProvider>
  ) : (
    <ErrorBoundary>{children}</ErrorBoundary>
  );

  return (
    <BranchProvider>
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
              <Dialog.Panel className="relative flex w-full max-w-[280px] flex-1 flex-col bg-brand-950 shadow-2xl">
                <div className="p-6 flex items-center justify-between border-b border-white/5">
                  <span className="text-lg font-black text-white tracking-widest">OLIVO<span className="text-brand-500 italic">ADMIN</span></span>
                  <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 text-brand-500 hover:text-white">
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
        <div className={`hidden md:flex flex-col sticky top-0 h-screen bg-brand-950 transition-all duration-500 ${isCollapsed ? "w-20" : "w-64"}`}>
          <div className="flex items-center h-20 px-6 border-b border-white/5">
            {!isCollapsed && <span className="text-lg font-black text-white">OLIVO<span className="text-brand-500 italic">ADMIN</span></span>}
            {isCollapsed && <span className="text-lg font-black text-brand-500 mx-auto italic">OA</span>}
          </div>
          <NavContent />
          <div className="p-4 border-t border-white/5 flex justify-center">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 text-brand-500 hover:text-brand-300 transition-colors">
              {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-brand-950 px-4 md:hidden border-b border-white/5">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-brand-400">
            <Bars3Icon className="h-5 w-5" />
          </button>
          <span className="text-md font-black text-white tracking-widest uppercase">Olivo<span className="text-brand-500 italic lowercase">Admin</span></span>
          <div className="w-9" />
        </header>

        <main className={`flex-1 ${isPOS ? 'p-0' : 'py-4 px-3 sm:px-6 lg:px-8'}`}>
          {wrappedContent}
        </main>
      </div>
    </div>
    </BranchProvider>
  );
}
