"use client";

import React, { useEffect, useMemo, useState, Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, User } from "lucide-react"; // Switched to Lucide
import { useSession, signOut } from "next-auth/react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Disclosure, Menu as HeadlessMenu, Transition } from "@headlessui/react";
import { useCart } from "@/contexts/CartContext";

const navigation = [
  { name: "Inicio", href: "/" },
  { name: "Productos", href: "/productos" },
  { name: "Categorías", href: "/categorias" },
  { name: "Ofertas", href: "/ofertas" },
  { name: "Contacto", href: "/contacto" },
];

// Rutas donde NO quieres mostrar el navbar (opcional)
const HIDE_ON = new Set<string>([
  // "/login",
  // "/registro",
]);

export default function Navbar() {
  const { data: session, status } = useSession();
  const { settings } = useStoreSettings();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [animateCart, setAnimateCart] = useState(false);

  useEffect(() => {
    if (itemCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  // Lee el rol desde session.role (como lo pusimos en NextAuth callbacks) o desde session.user.role si existiera
  const role = useMemo(
    () => ((session as any)?.role || (session?.user as any)?.role || "").toString(),
    [session]
  );

  // Nombre y correo para avatar/letras
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

  // Inicial del avatar
  const initial = useMemo(() => {
    const base =
      displayName?.trim()?.[0] ||
      profileEmail?.trim()?.[0] ||
      session?.user?.name?.trim()?.[0] ||
      "U";
    return base.toUpperCase();
  }, [displayName, profileEmail, session?.user?.name]);

  // Mostrar/ocultar según ruta
  if (HIDE_ON.has(pathname)) return null;

  // Activo por ruta
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <Disclosure as="nav" className="bg-white border-b border-gray-200 relative sticky top-0 z-50">
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Izquierda: logo + navegación */}
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="flex items-center gap-3 group">
                    {settings.appearance?.logoUrl ? (
                      <ImageWithFallback className="h-8 w-auto group-hover:scale-105 transition-transform" src={settings.appearance.logoUrl} alt={settings.storeName || 'Tienda'} fallback="/logo.png" />
                    ) : (
                      <span className="text-xl font-bold text-emerald-600 tracking-tight group-hover:text-emerald-700 transition-colors">{settings.storeName || 'OLIVOMARKET'}</span>
                    )}
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${active
                          ? "border-emerald-600 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-emerald-600 hover:border-emerald-200"
                          }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Derecha: carrito + usuario */}
              <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
                <Link
                  href="/carrito"
                  className={`relative p-2 rounded-xl text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200 ${animateCart ? 'scale-110 text-emerald-600' : ''}`}
                >
                  <span className="sr-only">Carrito</span>
                  <ShoppingBag className="h-6 w-6" strokeWidth={2} />
                  {itemCount > 0 && (
                    <span className={`absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white transition-transform ${animateCart ? 'scale-125' : ''}`}>
                      {itemCount}
                    </span>
                  )}
                </Link>

                {/* Perfil */}
                {status === "loading" ? (
                  <div className="ml-3 h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                ) : session ? (
                  <HeadlessMenu as="div" className="ml-3 relative">
                    <div>
                      <HeadlessMenu.Button className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ring-offset-2 hover:ring-2 hover:ring-emerald-100 transition-all">
                        <span className="sr-only">Abrir menú de usuario</span>
                        <div className="h-9 w-9 rounded-full bg-emerald-100/50 flex items-center justify-center overflow-hidden border border-emerald-200">
                          {session.user?.image ? (
                            <ImageWithFallback
                              className="h-full w-full object-cover"
                              src={session.user.image}
                              alt="Foto de perfil"
                              fallback="/file.svg"
                            />
                          ) : (
                            <span className="text-emerald-700 font-bold text-sm">
                              {initial}
                            </span>
                          )}
                        </div>
                      </HeadlessMenu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-150"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <HeadlessMenu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <Link
                              href="/mi-cuenta"
                              className={`${active ? "bg-emerald-50 text-emerald-700" : "text-gray-700"} block px-4 py-2 text-sm transition-colors`}
                            >
                              Mi Perfil
                            </Link>
                          )}
                        </HeadlessMenu.Item>
                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <Link
                              href="/mi-cuenta/pedidos"
                              className={`${active ? "bg-emerald-50 text-emerald-700" : "text-gray-700"} block px-4 py-2 text-sm transition-colors`}
                            >
                              Mis Pedidos
                            </Link>
                          )}
                        </HeadlessMenu.Item>

                        {/* Admin solo si role=admin (acepta "ADMIN" o "admin") */}
                        {(role || "").toLowerCase() === "admin" && (
                          <HeadlessMenu.Item>
                            {({ active }) => (
                              <Link
                                href="/admin"
                                className={`${active ? "bg-emerald-50 text-emerald-700" : "text-gray-700"} block px-4 py-2 text-sm transition-colors`}
                              >
                                Panel de Administración
                              </Link>
                            )}
                          </HeadlessMenu.Item>
                        )}

                        <div className="border-t border-gray-100 my-1"></div>

                        <HeadlessMenu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => signOut({ callbackUrl: "/" })}
                              className={`${active ? "bg-red-50 text-red-700" : "text-gray-700"} block w-full text-left px-4 py-2 text-sm transition-colors`}
                            >
                              Cerrar Sesión
                            </button>
                          )}
                        </HeadlessMenu.Item>
                      </HeadlessMenu.Items>
                    </Transition>
                  </HeadlessMenu>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className="text-sm font-semibold text-gray-500 hover:text-emerald-600 transition-colors"
                    >
                      Entrar
                    </Link>
                    <Link
                      href="/registro"
                      className="text-sm font-semibold bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                      Registrarse
                    </Link>
                  </div>
                )}
              </div>

              {/* Botón menú móvil */}
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500">
                  <span className="sr-only">Abrir menú principal</span>
                  {open ? (
                    <X className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Menu className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Menú móvil */}
          <Disclosure.Panel className="sm:hidden bg-white border-b border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${active
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-emerald-300 hover:text-emerald-600"
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                {session ? (
                  <>
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200">
                        {session.user?.image ? (
                          <ImageWithFallback
                            className="h-10 w-10 rounded-full object-cover"
                            src={session.user.image}
                            alt="Foto de perfil"
                            fallback="/file.svg"
                          />
                        ) : (
                          <span className="text-emerald-700 font-bold">
                            {initial}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                        {displayName || profileEmail || "Usuario"}
                      </div>
                      <div className="text-sm font-medium text-gray-500">
                        {profileEmail}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col space-y-3 w-full">
                    <Link
                      href="/login"
                      className="block text-center text-base font-medium text-gray-500 hover:text-gray-800"
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      href="/registro"
                      className="block text-center w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700"
                    >
                      Registrarse
                    </Link>
                  </div>
                )}

                {!session && <div className="hidden"></div> /* Spacer if no session, but handled above */}

                <Link
                  href="/carrito"
                  className="ml-auto p-2 text-gray-400 hover:text-emerald-600 relative flex items-center justify-center bg-gray-50 rounded-full"
                >
                  <span className="sr-only">Carrito</span>
                  <ShoppingBag className="h-6 w-6" aria-hidden="true" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border border-white">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </div>

              {session && (
                <div className="mt-3 space-y-1">
                  <Link
                    href="/mi-cuenta"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    Mi Perfil
                  </Link>
                  <Link
                    href="/mi-cuenta/pedidos"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    Mis Pedidos
                  </Link>

                  {(role || "").toLowerCase() === "admin" && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                    >
                      Panel de Administración
                    </Link>
                  )}

                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

