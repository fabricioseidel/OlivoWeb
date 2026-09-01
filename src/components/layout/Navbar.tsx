"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Menu, X, Search, User, LogOut, Package, ShieldCheck } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Transition } from "@headlessui/react";
import { useCart } from "@/contexts/CartContext";
import Dropdown from "@/components/ui/Dropdown";
import { RUTA_FIESTAS_PATRIAS, enTemporadaDieciochera } from "@/lib/fiestas-patrias";
import BanderaChile from "@/components/fiestas/BanderaChile";

const navigation = [
  { name: "Inicio", href: "/" },
  { name: "Productos", href: "/productos" },
  { name: "Categorías", href: "/categorias" },
  { name: "Ofertas", href: "/ofertas" },
  { name: "Punto de Envío", href: "/punto-de-envio" },
  { name: "Contacto", href: "/contacto" },
];

const HIDE_ON = new Set<string>([]);

/**
 * Enlace de temporada. Se inserta después de "Productos" sólo en septiembre:
 * el resto del año ocuparía un espacio del menú que no lleva a ninguna parte
 * viva. La bandera va como icono aparte porque el emoji 🇨🇱 no se dibuja en
 * Windows.
 *
 * Va SOLO en el menú móvil. La fila de escritorio ya venía al límite con seis
 * enlaces: medido, un séptimo la desborda 76px y "Contacto" se monta encima de
 * "Entrar" en 1024, 1280 y 1440. En escritorio la campaña se anuncia con la
 * cinta roja que corona todas las páginas, que además es más visible que un
 * enlace más del menú.
 */
const ENLACE_DIECIOCHERO = { name: "Fiestas Patrias", href: RUTA_FIESTAS_PATRIAS };

function navegacionMovilDeTemporada() {
  if (!enTemporadaDieciochera()) return navigation;
  const indice = navigation.findIndex(i => i.href === "/productos");
  const copia = [...navigation];
  copia.splice(indice + 1, 0, ENLACE_DIECIOCHERO);
  return copia;
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const { settings } = useStoreSettings();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [animateCart, setAnimateCart] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (itemCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  // Close mobile menu on pathname change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  const role = useMemo(
    () => ((session as any)?.role || (session?.user as any)?.role || "").toString(),
    [session]
  );

  const [displayName, setDisplayName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");

  useEffect(() => {
    const emailFromSession = session?.user?.email || "";
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("profile") : null;
      if (raw) {
        const saved = JSON.parse(raw || "{}");
        const fullName = [saved?.nombre, saved?.apellidos].filter(Boolean).join(" ").trim();
        if (fullName) setDisplayName(fullName);
        setProfileEmail(saved?.email || emailFromSession);
      } else {
        setProfileEmail(emailFromSession);
      }
    } catch {
      setProfileEmail(emailFromSession);
    }
  }, [session]);

  const initial = useMemo(() => {
    const name = displayName || session?.user?.name || "";
    return (name[0] || profileEmail[0] || "U").toUpperCase();
  }, [displayName, profileEmail, session]);

  if (HIDE_ON.has(pathname)) return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const enlacesMoviles = navegacionMovilDeTemporada();
  const esDieciochero = (href: string) => href === RUTA_FIESTAS_PATRIAS;

  const userMenuItems = [
    { label: 'Mi Perfil', href: '/mi-cuenta', icon: User },
    { label: 'Mis Pedidos', href: '/mi-cuenta/pedidos', icon: Package },
    ...(role.toLowerCase() === 'admin' ? [{ label: 'Admin Panel', href: '/admin', icon: ShieldCheck }] : []),
    { label: 'Cerrar Sesión', onClick: () => signOut({ callbackUrl: "/" }), icon: LogOut, isDanger: true }
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 min-w-0">
          <div className="flex min-w-0">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-3 group">
                {settings.appearance?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.appearance.logoUrl}
                    alt={settings.storeName || 'Tienda'}
                    className="w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                    style={{ height: '2rem' }}
                  />
                ) : (
                  <span className="text-xl font-bold text-brand-600 tracking-tight group-hover:text-brand-700 transition-colors">
                    {settings.storeName || 'OLIVOMARKET'}
                  </span>
                )}
              </Link>
            </div>
            <div className="hidden lg:ml-6 lg:flex lg:items-center lg:space-x-5">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-300 ${isActive(item.href)
                    ? "border-brand-600 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-brand-600 hover:border-brand-200"
                    }`}
                >
                  {item.name}
                </Link>
              ))}
              {enTemporadaDieciochera() && (
                <Link
                  href={RUTA_FIESTAS_PATRIAS}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                    isActive(RUTA_FIESTAS_PATRIAS)
                      ? "bg-fp-rojo text-white"
                      : "bg-fp-crema text-fp-rojo border border-fp-rojo/30 hover:bg-fp-rojo hover:text-white"
                  }`}
                >
                  <BanderaChile className="h-3 w-auto rounded-[1px]" />
                  <span>Especial 18</span>
                </Link>
              )}
            </div>
          </div>

          <div className="hidden lg:ml-4 lg:flex lg:items-center gap-3">
            <form onSubmit={submitSearch} className="relative hidden xl:block w-52 2xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={enTemporadaDieciochera() ? "Buscar empanadas, carbón..." : "Buscar productos..."}
                className="w-full pl-9 pr-3 h-9 rounded-full bg-white border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 focus:shadow-sm transition-all"
              />
            </form>
            <Link
              href="/carrito"
              className={`relative p-2 rounded-xl text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-all duration-300 ${animateCart ? 'scale-110 text-brand-600' : ''
                }`}
            >
              <ShoppingBag className="h-6 w-6" strokeWidth={2} />
              {itemCount > 0 && (
                <span className={`absolute -top-1 -right-1 bg-brand-boton text-brand-contraste text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white ${animateCart ? 'scale-125' : ''}`}>
                  {itemCount}
                </span>
              )}
            </Link>

            {status === "loading" ? (
              <div className="ml-3 h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
            ) : session ? (
              <Dropdown
                trigger={
                  <div className="h-9 w-9 rounded-full bg-brand-100/50 flex items-center justify-center overflow-hidden border border-brand-200 hover:border-brand-400 transition-colors cursor-pointer">
                    {session.user?.image ? (
                      <ImageWithFallback className="h-full w-full object-cover" src={session.user.image} alt="Perfil" fallback="/file.svg" />
                    ) : (
                      <span className="text-brand-700 font-bold text-sm">{initial}</span>
                    )}
                  </div>
                }
                items={userMenuItems}
              />
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-semibold text-gray-500 hover:text-brand-600 transition-colors">Entrar</Link>
                <Link href="/registro" className="text-sm font-semibold bg-brand-boton text-brand-contraste px-5 py-2 rounded-full hover:bg-brand-700 shadow-sm transition-all active:scale-95">Registrarse</Link>
              </div>
            )}
          </div>

          <div className="-mr-2 flex items-center gap-1 lg:hidden">
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label={mobileSearchOpen ? "Cerrar búsqueda" : "Buscar productos"}
              aria-expanded={mobileSearchOpen}
              className="p-2 rounded-xl text-gray-400 hover:text-brand-600"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/carrito"
              aria-label={itemCount > 0 ? `Carrito, ${itemCount} producto${itemCount === 1 ? '' : 's'}` : 'Carrito, vacío'}
              className={`relative p-2 rounded-xl text-gray-400 hover:text-brand-600 ${animateCart ? 'scale-110 text-brand-600' : ''}`}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={2} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-boton text-brand-contraste text-xs font-semibold rounded-full h-4.5 w-4.5 flex items-center justify-center ring-2 ring-white">
                  {itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
              className="o-focus inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-brand-600"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="lg:hidden px-4 pb-4 pt-2 border-b border-gray-100 bg-white">
          <form onSubmit={submitSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              autoFocus
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Buscar productos..."
            />
          </form>
        </div>
      )}

      {/* Mobile Menu Panel */}
      <Transition
        show={mobileMenuOpen}
        enter="transition duration-200 ease-out"
        enterFrom="opacity-0 -translate-y-4"
        enterTo="opacity-100 translate-y-0"
        leave="transition duration-150 ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-4"
      >
        <div className="lg:hidden bg-white border-b border-gray-200 overflow-hidden">
          <div className="pt-2 pb-3 space-y-1 px-2">
            {enlacesMoviles.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-base font-medium transition-all ${isActive(item.href)
                  ? esDieciochero(item.href)
                    ? "bg-fp-crema text-fp-rojo font-bold"
                    : "bg-brand-50 text-brand-700 font-bold"
                  : esDieciochero(item.href)
                    ? "text-fp-rojo font-semibold hover:bg-fp-crema"
                    : "text-gray-500 hover:bg-gray-50 hover:text-brand-600"
                  }`}
              >
                {esDieciochero(item.href) && (
                  <BanderaChile className="h-4 w-auto rounded-[1px] shadow-sm" />
                )}
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200 px-2">
            <div className="flex items-center px-4 mb-4">
              {session ? (
                <>
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-brand-200">
                      {session.user?.image ? (
                        <ImageWithFallback className="h-10 w-10 rounded-full object-cover" src={session.user.image} alt="Perfil" fallback="/file.svg" />
                      ) : (
                        <span className="text-brand-700 font-bold">{initial}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{displayName || profileEmail || "Usuario"}</div>
                    <div className="text-sm font-medium text-gray-500">{profileEmail}</div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col space-y-3 w-full">
                  <Link
                    href="/login"
                    className="block text-center py-2 text-base font-medium text-gray-500 hover:text-brand-600"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/registro"
                    className="block text-center w-full bg-brand-boton text-brand-contraste py-3 rounded-2xl font-medium shadow-lg shadow-brand-200"
                  >
                    Registrarse
                  </Link>
                </div>
              )}
            </div>
            {session && (
              <div className="space-y-1">
                {userMenuItems.map((item) => (
                  item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center px-4 py-3 rounded-2xl text-base font-medium transition-colors ${item.isDanger ? 'text-red-500 hover:bg-red-50 font-bold' : 'text-gray-500 hover:bg-brand-50 hover:text-brand-700'
                        }`}
                    >
                      {item.icon && <item.icon className="h-5 w-5 mr-3" />}
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.onClick?.();
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center w-full px-4 py-3 rounded-2xl text-base font-medium transition-colors ${item.isDanger ? 'text-red-500 hover:bg-red-50 font-bold' : 'text-gray-500 hover:bg-brand-50 hover:text-brand-700'
                        }`}
                    >
                      {item.icon && <item.icon className="h-5 w-5 mr-3" />}
                      {item.label}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </Transition>
    </nav>
  );
}
