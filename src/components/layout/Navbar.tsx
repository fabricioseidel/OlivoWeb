"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, Search, User, LogOut, Package, ShieldCheck } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Disclosure } from "@headlessui/react";
import { useCart } from "@/contexts/CartContext";
import Dropdown from "@/components/ui/Dropdown";

const navigation = [
  { name: "Inicio", href: "/" },
  { name: "Productos", href: "/productos" },
  { name: "Categorías", href: "/categorias" },
  { name: "Ofertas", href: "/ofertas" },
  { name: "Contacto", href: "/contacto" },
];

const HIDE_ON = new Set<string>([]);

export default function Navbar() {
  const { data: session, status } = useSession();
  const { settings } = useStoreSettings();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [animateCart, setAnimateCart] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    if (itemCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

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

  const userMenuItems = [
    { label: 'Mi Perfil', href: '/mi-cuenta', icon: User },
    { label: 'Mis Pedidos', href: '/mi-cuenta/pedidos', icon: Package },
    ...(role.toLowerCase() === 'admin' ? [{ label: 'Admin Panel', href: '/admin', icon: ShieldCheck }] : []),
    { label: 'Cerrar Sesión', onClick: () => signOut({ callbackUrl: "/" }), icon: LogOut, isDanger: true }
  ];

  return (
    <Disclosure as="nav" className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 transition-all duration-300">
      {({ open, close }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="flex items-center gap-3 group">
                    {settings.appearance?.logoUrl ? (
                      <ImageWithFallback
                        className="h-8 w-auto group-hover:scale-105 transition-transform duration-300"
                        src={settings.appearance.logoUrl}
                        alt={settings.storeName || 'Tienda'}
                        fallback="/logo.png"
                      />
                    ) : (
                      <span className="text-xl font-bold text-emerald-600 tracking-tight group-hover:text-emerald-700 transition-colors">
                        {settings.storeName || 'OLIVOMARKET'}
                      </span>
                    )}
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-300 ${isActive(item.href)
                        ? "border-emerald-600 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-emerald-600 hover:border-emerald-200"
                        }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
                <Link
                  href="/carrito"
                  className={`relative p-2 rounded-xl text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300 ${animateCart ? 'scale-110 text-emerald-600' : ''
                    }`}
                >
                  <ShoppingBag className="h-6 w-6" strokeWidth={2} />
                  {itemCount > 0 && (
                    <span className={`absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white ${animateCart ? 'scale-125' : ''}`}>
                      {itemCount}
                    </span>
                  )}
                </Link>

                {status === "loading" ? (
                  <div className="ml-3 h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
                ) : session ? (
                  <Dropdown
                    trigger={
                      <div className="h-9 w-9 rounded-full bg-emerald-100/50 flex items-center justify-center overflow-hidden border border-emerald-200 hover:border-emerald-400 transition-colors">
                        {session.user?.image ? (
                          <ImageWithFallback className="h-full w-full object-cover" src={session.user.image} alt="Perfil" fallback="/file.svg" />
                        ) : (
                          <span className="text-emerald-700 font-bold text-sm">{initial}</span>
                        )}
                      </div>
                    }
                    items={userMenuItems}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/login" className="text-sm font-semibold text-gray-500 hover:text-emerald-600">Entrar</Link>
                    <Link href="/registro" className="text-sm font-semibold bg-emerald-600 text-white px-5 py-2 rounded-full hover:bg-emerald-700 shadow-sm transition-all active:scale-95">Registrarse</Link>
                  </div>
                )}
              </div>

              <div className="-mr-2 flex items-center gap-1 sm:hidden">
                <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)} className="p-2 rounded-xl text-gray-400 hover:text-emerald-600">
                  <Search className="h-5 w-5" />
                </button>
                <Link href="/carrito" className={`relative p-2 rounded-xl text-gray-400 hover:text-emerald-600 ${animateCart ? 'scale-110 text-emerald-600' : ''}`}>
                  <ShoppingBag className="h-5 w-5" strokeWidth={2} />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center ring-1.5 ring-white">
                      {itemCount}
                    </span>
                  )}
                </Link>
                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-emerald-600 focus:outline-none">
                  {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="sm:hidden px-4 pb-4 pt-2 border-b border-gray-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input autoFocus className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Buscar productos..." />
              </div>
            </div>
          )}

          <Disclosure.Panel className="sm:hidden bg-white border-b border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as={Link}
                  href={item.href}
                  onClick={() => close()}
                  className={`block pl-4 pr-4 py-3 border-l-4 text-base font-medium ${isActive(item.href)
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-emerald-300 hover:text-emerald-600"
                    }`}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                {session ? (
                  <>
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200">
                        {session.user?.image ? (
                          <ImageWithFallback className="h-10 w-10 rounded-full object-cover" src={session.user.image} alt="Perfil" fallback="/file.svg" />
                        ) : (
                          <span className="text-emerald-700 font-bold">{initial}</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">{displayName || profileEmail || "Usuario"}</div>
                      <div className="text-sm font-medium text-gray-500">{profileEmail}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col space-y-3 w-full px-2">
                    <Disclosure.Button
                      as={Link}
                      href="/login"
                      onClick={() => close()}
                      className="block text-center py-2 text-base font-medium text-gray-500 hover:text-emerald-600"
                    >
                      Entrar
                    </Disclosure.Button>
                    <Disclosure.Button
                      as={Link}
                      href="/registro"
                      onClick={() => close()}
                      className="block text-center w-full bg-emerald-600 text-white py-3 rounded-2xl font-medium"
                    >
                      Registrarse
                    </Disclosure.Button>
                  </div>
                )}
              </div>
              {session && (
                <div className="mt-4 space-y-1">
                  {userMenuItems.map((item) => (
                    item.href ? (
                      <Disclosure.Button
                        key={item.label}
                        as={Link}
                        href={item.href}
                        onClick={() => close()}
                        className={`flex items-center w-full px-4 py-3 text-base font-medium ${item.isDanger ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                      >
                        {item.icon && <item.icon className="h-5 w-5 mr-3" />}
                        {item.label}
                      </Disclosure.Button>
                    ) : (
                      <Disclosure.Button
                        key={item.label}
                        as="button"
                        onClick={() => {
                          item.onClick?.();
                          close();
                        }}
                        className={`flex items-center w-full px-4 py-3 text-base font-medium ${item.isDanger ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                      >
                        {item.icon && <item.icon className="h-5 w-5 mr-3" />}
                        {item.label}
                      </Disclosure.Button>
                    )
                  ))}
                </div>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
