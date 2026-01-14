import { useState } from 'react';
import ProductCard, { ProductUI } from '@/app/components/ProductCard';
import OlivoButton from '@/app/components/OlivoButton';
import OlivoInput from '@/app/components/OlivoInput';
import { 
  ShoppingBag, 
  Truck, 
  Shield, 
  Clock, 
  Search,
  Star,
  Heart,
  ChevronRight
} from 'lucide-react';

// Mock data de productos
const MOCK_PRODUCTS: ProductUI[] = [
  {
    id: '1',
    name: 'Aceite de Oliva Extra Virgen Premium',
    slug: 'aceite-oliva-premium',
    price: 8990,
    sale_price: 6990,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGl2ZSUyMG9pbCUyMGJvdHRsZXxlbnwxfHx8fDE3NjgzMDEzNTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: { name: 'Aceites y Condimentos' },
    featured: true,
    stock: 15,
  },
  {
    id: '2',
    name: 'Café Venezolano 100% Arábica',
    slug: 'cafe-venezolano-arabica',
    price: 12990,
    image: 'https://images.unsplash.com/photo-1675306408031-a9aad9f23308?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBiZWFuc3xlbnwxfHx8fDE3NjgzMjcxMjB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: { name: 'Bebidas' },
    featured: true,
    stock: 8,
  },
  {
    id: '3',
    name: 'Mix de Snacks Tradicionales',
    slug: 'snacks-tradicionales',
    price: 4990,
    sale_price: 3990,
    image: 'https://images.unsplash.com/photo-1759465201025-0f4a876efa47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmFja3MlMjBmb29kJTIwcHJvZHVjdHN8ZW58MXx8fHwxNzY4NDA2NzgwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: { name: 'Snacks' },
    stock: 25,
  },
  {
    id: '4',
    name: 'Vegetales Frescos del Día',
    slug: 'vegetales-frescos',
    price: 5990,
    image: 'https://images.unsplash.com/photo-1748342319942-223b99937d4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMHZlZ2V0YWJsZXMlMjBtYXJrZXR8ZW58MXx8fHwxNzY4Mzg2MjI3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: { name: 'Frutas y Verduras' },
    stock: 3,
  },
  {
    id: '5',
    name: 'Arepas Precocidas Tradicionales',
    slug: 'arepas-precocidas',
    price: 3490,
    image: 'https://images.unsplash.com/photo-1575664674176-0f74f5ba3f59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZW5lenVlbGFuJTIwZm9vZCUyMHByb2R1Y3RzfGVufDF8fHx8MTc2ODQwNjc3OXww&ixlib=rb-4.1.0&q=80&w=1080',
    category: { name: 'Panadería' },
    featured: true,
    stock: 12,
  },
  {
    id: '6',
    name: 'Productos Variados del Mercado',
    slug: 'productos-variados',
    price: 7990,
    sale_price: 5990,
    image: 'https://images.unsplash.com/photo-1651488201726-bbb9577778ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm9jZXJ5JTIwc3RvcmUlMjBwcm9kdWN0c3xlbnwxfHx8fDE3NjgzMjM3MDh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: { name: 'Despensa' },
    stock: 20,
  },
];

export default function App() {
  const [cartItems, setCartItems] = useState<{ product: ProductUI; qty: number }[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAddToCart = (product: ProductUI, quantity: number) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + quantity }
            : item
        );
      }
      return [...prev, { product, qty: quantity }];
    });
    
    setToastMessage(`¡${product.name} añadido al carrito!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">OLIVOMARKET</h1>
                <p className="text-xs text-gray-500">Sabor venezolano en Chile</p>
              </div>
            </div>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-md">
              <OlivoInput
                placeholder="Buscar productos..."
                icon={<Search className="size-5" />}
              />
            </div>

            {/* Cart */}
            <button className="relative p-3 rounded-xl hover:bg-gray-100 transition-colors">
              <ShoppingBag className="size-6 text-gray-700" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 size-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-3">
            <OlivoInput
              placeholder="Buscar productos..."
              icon={<Search className="size-5" />}
            />
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <span className="text-xl">✓</span>
            <p className="font-semibold">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0QzMyLjY5IDE0IDMwIDE2LjY5IDMwIDIwczIuNjkgNiA2IDYgNi0yLjY5IDYtNi0yLjY5LTYtNi02ek0zNiA0QzMyLjY5IDQgMzAgNi42OSAzMCAxMHMyLjY5IDYgNiA2IDYtMi42OSA2LTYtMi42OS02LTYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              Bienvenido a <br />
              <span className="text-emerald-300">OLIVOMARKET</span>
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-emerald-50">
              Los mejores productos venezolanos <br className="hidden sm:block" />
              al alcance de tu hogar
            </p>
            <div className="flex flex-wrap gap-4">
              <OlivoButton size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl">
                Ver Productos
                <ChevronRight className="size-5" />
              </OlivoButton>
              <OlivoButton size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Ofertas Especiales
                <Star className="size-5" />
              </OlivoButton>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white border-y">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <Truck className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Envío Rápido</h3>
                <p className="text-sm text-gray-600">
                  Recibe tus productos en 24-48 horas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <Shield className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Compra Segura</h3>
                <p className="text-sm text-gray-600">
                  Protección en todas tus transacciones
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                <Clock className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Siempre Fresco</h3>
                <p className="text-sm text-gray-600">
                  Productos frescos y de calidad garantizada
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Productos Destacados
              </h2>
              <p className="text-gray-600">
                Los favoritos de nuestros clientes
              </p>
            </div>
            <OlivoButton variant="outline">
              Ver Todos
              <ChevronRight className="size-4" />
            </OlivoButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {MOCK_PRODUCTS.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Heart className="size-12 mx-auto mb-4 text-emerald-400" />
          <h2 className="text-3xl font-bold mb-3">
            Suscríbete a Nuestro Newsletter
          </h2>
          <p className="text-gray-300 mb-8">
            Recibe ofertas exclusivas y las últimas novedades directamente en tu correo
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <OlivoInput
              type="email"
              placeholder="tu@email.com"
              className="flex-1"
            />
            <OlivoButton size="lg" className="sm:w-auto">
              Suscribirse
            </OlivoButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="size-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center">
              <span className="text-white font-bold">O</span>
            </div>
            <span className="font-bold text-white">OLIVOMARKET</span>
          </div>
          <p className="text-sm">
            © 2026 OLIVOMARKET. Sabor venezolano en Chile.
          </p>
        </div>
      </footer>
    </div>
  );
}
