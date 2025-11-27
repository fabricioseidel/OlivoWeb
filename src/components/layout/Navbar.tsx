"use client";

import React, { useEffect, useMemo, useState, Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import { useSession, signOut } from "next-auth/react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Disclosure, Menu, Transition } from "@headlessui/react";
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
    <Disclosure as="nav" className="bg-white border-b border-gray-200 relative">
      {({ open }) => (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Izquierda: logo + navegación */}
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="flex items-center gap-3">
                    {settings.appearance?.logoUrl ? (
                      <ImageWithFallback className="h-8 w-auto" src={settings.appearance.logoUrl} alt={settings.storeName || 'Tienda'} fallback="/logo.png" />
                    ) : (
                      <span className="text-xl font-bold text-blue-600">{settings.storeName || 'OLIVOMARKET'}</span>
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
                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                          active
                            ? "border-blue-600 text-gray-900"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Derecha: carrito + usuario */}
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <Link
                  href="/carrito"
                  className="p-2 text-gray-400 hover:text-gray-500 relative flex items-center justify-center"
                >
                  <span className="sr-only">Carrito</span>
                  <ShoppingCartIcon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>

                {/* Perfil */}
                {status === "loading" ? (
                  <div className="ml-3 h-8 w-24 bg-gray-200 rounded animate-pulse" />
                ) : session ? (
                  <Menu as="div" className="ml-3 relative">
                    <div>
                      <Menu.Button className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <span className="sr-only">Abrir menú de usuario</span>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                          {session.user?.image ? (
                            <ImageWithFallback
                              className="h-8 w-8 rounded-full object-cover"
                              src={session.user.image}
                              alt="Foto de perfil"
                              fallback="/uploads/fallback.png"
                            />
                          ) : (
                            <span className="text-blue-700 font-medium">
                              {initial}
                            </span>
                          )}
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/mi-cuenta"
                              className={`${active ? "bg-gray-100" : ""} block px-4 py-2 text-sm text-gray-700`}
                            >
                              Mi Perfil
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              href="/mi-cuenta/pedidos"
                              className={`${active ? "bg-gray-100" : ""} block px-4 py-2 text-sm text-gray-700`}
                            >
                              Mis Pedidos
                            </Link>
                          )}
                        </Menu.Item>

                        {/* Admin solo si role=admin (acepta "ADMIN" o "admin") */}
                        {(role || "").toLowerCase() === "admin" && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                href="/admin"
                                className={`${active ? "bg-gray-100" : ""} block px-4 py-2 text-sm text-gray-700`}
                              >
                                Panel de Administración
                              </Link>
                            )}
                          </Menu.Item>
                        )}

                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => signOut({ callbackUrl: "/" })}
                              className={`${active ? "bg-gray-100" : ""} block w-full text-left px-4 py-2 text-sm text-gray-700`}
                            >
                              Cerrar Sesión
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <div className="ml-3 flex items-center space-x-4">
                    <Link
                      href="/login"
                      className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      href="/registro"
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      Registrarse
                    </Link>
                  </div>
                )}
              </div>

              {/* Botón menú móvil */}
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                  <span className="sr-only">Abrir menú principal</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6 flex-shrink-0" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Menú móvil */}
          <Disclosure.Panel className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
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
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                        {session.user?.image ? (
                          <ImageWithFallback
                            className="h-10 w-10 rounded-full object-cover"
                            src={session.user.image}
                            alt="Foto de perfil"
                            fallback="/uploads/fallback.png"
                          />
                        ) : (
                          <span className="text-blue-700 font-medium">
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
                  <div className="flex flex-col space-y-2">
                    <Link
                      href="/login"
                      className="block text-base font-medium text-gray-500 hover:text-gray-700"
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      href="/registro"
                      className="block text-base font-medium text-blue-600 hover:text-blue-500"
                    >
                      Registrarse
                    </Link>
                  </div>
                )}

                <Link
                  href="/carrito"
                  className="ml-auto p-2 text-gray-400 hover:text-gray-500 relative flex items-center justify-center"
                >
                  <span className="sr-only">Carrito</span>
                  <ShoppingCartIcon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </div>

              {session && (
                <div className="mt-3 space-y-1">
                  <Link
                    href="/mi-cuenta"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Mi Perfil
                  </Link>
                  <Link
                    href="/mi-cuenta/pedidos"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Mis Pedidos
                  </Link>

                  {(role || "").toLowerCase() === "admin" && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    >
                      Panel de Administración
                    </Link>
                  )}

                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
