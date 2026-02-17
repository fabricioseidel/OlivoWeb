import { useState } from 'react';
import { ShoppingBag, Menu, X, User, LogOut, Settings, Package } from 'lucide-react';
import OlivoButton from '@/app/components/OlivoButton';

const navigation = [
  { name: 'Inicio', href: '/' },
  { name: 'Productos', href: '/productos' },
  { name: 'Categorías', href: '/categorias' },
  { name: 'Ofertas', href: '/ofertas' },
  { name: 'Contacto', href: '/contacto' },
];

type NavbarProps = {
  cartItemsCount?: number;
  user?: {
    name?: string;
    email?: string;
    image?: string;
    role?: string;
  } | null;
  onLogout?: () => void;
};

export default function Navbar({ cartItemsCount = 0, user = null, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const currentPath = window.location.pathname;

  const isActive = (href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 group">
              <div className="size-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">OLIVOMARKET</h1>
                <p className="text-xs text-gray-500 -mt-1">Sabor venezolano</p>
              </div>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </a>
              );
            })}
          </div>

          {/* Right Side - Cart & User */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <a
              href="/carrito"
              className="relative p-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ShoppingBag className="size-6 text-gray-700" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                  {cartItemsCount}
                </span>
              )}
            </a>

            {/* User Menu - Desktop */}
            {user ? (
              <div className="hidden md:block relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || 'Usuario'}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-emerald-600 flex items-center justify-center">
                      <User className="size-5 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-700 hidden lg:block">
                    {user.name || 'Mi Cuenta'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 py-2">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <a
                      href="/mi-cuenta"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="size-4" />
                      Mi Cuenta
                    </a>
                    <a
                      href="/mis-pedidos"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Package className="size-4" />
                      Mis Pedidos
                    </a>
                    {user.role === 'ADMIN' && (
                      <a
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        <Settings className="size-4" />
                        Administración
                      </a>
                    )}
                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={onLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="size-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <a href="/auth/login">
                  <OlivoButton variant="ghost" size="sm">
                    Ingresar
                  </OlivoButton>
                </a>
                <a href="/auth/registro">
                  <OlivoButton size="sm">Registrarse</OlivoButton>
                </a>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="size-6 text-gray-700" />
              ) : (
                <Menu className="size-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
          <div className="px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`block px-4 py-3 rounded-xl font-semibold transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              );
            })}

            {/* Mobile User Section */}
            <hr className="my-4 border-gray-200" />
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-2">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || 'Usuario'}
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-emerald-600 flex items-center justify-center">
                      <User className="size-6 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <a
                  href="/mi-cuenta"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl"
                >
                  <User className="size-5" />
                  Mi Cuenta
                </a>
                <a
                  href="/mis-pedidos"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl"
                >
                  <Package className="size-5" />
                  Mis Pedidos
                </a>
                {user.role === 'ADMIN' && (
                  <a
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-3 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                  >
                    <Settings className="size-5" />
                    Administración
                  </a>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl w-full"
                >
                  <LogOut className="size-5" />
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <a href="/auth/login" className="block">
                  <OlivoButton variant="outline" fullWidth>
                    Ingresar
                  </OlivoButton>
                </a>
                <a href="/auth/registro" className="block">
                  <OlivoButton fullWidth>Registrarse</OlivoButton>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
