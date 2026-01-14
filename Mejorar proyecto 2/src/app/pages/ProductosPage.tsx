import { useState } from 'react';
import ProductCard, { ProductUI } from '../components/ProductCard';
import OlivoInput from '../components/OlivoInput';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Badge from '../components/Badge';

// Mock data - en tu proyecto real esto vendría de la API
const MOCK_PRODUCTS: ProductUI[] = [
  {
    id: '1',
    name: 'Aceite de Oliva Extra Virgen Premium',
    slug: 'aceite-oliva-premium',
    price: 8990,
    sale_price: 6990,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800',
    category: { name: 'Aceites y Condimentos' },
    featured: true,
    stock: 15,
  },
  {
    id: '2',
    name: 'Café Venezolano 100% Arábica',
    slug: 'cafe-venezolano-arabica',
    price: 12990,
    image: 'https://images.unsplash.com/photo-1675306408031-a9aad9f23308?w=800',
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
    image: 'https://images.unsplash.com/photo-1759465201025-0f4a876efa47?w=800',
    category: { name: 'Snacks' },
    stock: 25,
  },
  {
    id: '4',
    name: 'Vegetales Frescos del Día',
    slug: 'vegetales-frescos',
    price: 5990,
    image: 'https://images.unsplash.com/photo-1748342319942-223b99937d4e?w=800',
    category: { name: 'Frutas y Verduras' },
    stock: 3,
  },
  {
    id: '5',
    name: 'Arepas Precocidas Tradicionales',
    slug: 'arepas-precocidas',
    price: 3490,
    image: 'https://images.unsplash.com/photo-1575664674176-0f74f5ba3f59?w=800',
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
    image: 'https://images.unsplash.com/photo-1651488201726-bbb9577778ef?w=800',
    category: { name: 'Despensa' },
    stock: 20,
  },
];

const CATEGORIES = ['Todas', 'Aceites', 'Bebidas', 'Snacks', 'Frutas y Verduras', 'Panadería', 'Despensa'];

export default function ProductosPage() {
  const [products] = useState<ProductUI[]>(MOCK_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [showFilters, setShowFilters] = useState(false);

  const handleAddToCart = (product: ProductUI, quantity: number) => {
    console.log('Añadir al carrito:', product, quantity);
    // En tu proyecto real, aquí se llamaría a la función del CartContext
  };

  // Filtrar productos
  const filteredProducts = products
    .filter((product) => {
      // Filtro por búsqueda
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por categoría
      const matchesCategory =
        selectedCategory === 'Todas' ||
        product.category?.name.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Ordenamiento
      switch (sortBy) {
        case 'price-asc':
          return (a.sale_price || a.price) - (b.sale_price || b.price);
        case 'price-desc':
          return (b.sale_price || b.price) - (a.sale_price || a.price);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'featured':
        default:
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Nuestros Productos
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explora nuestra selección de productos venezolanos de calidad garantizada
          </p>
        </div>

        {/* Search and Filters Bar */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <OlivoInput
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="size-5" />}
              />
            </div>

            {/* Sort */}
            <div className="w-full md:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="featured">Destacados</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>

            {/* Filter Toggle Button (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              <SlidersHorizontal className="size-5" />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
          </div>

          {/* Category Filters */}
          <div
            className={`${
              showFilters ? 'block' : 'hidden'
            } md:block mt-4 pt-4 border-t border-gray-200`}
          >
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="size-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Categorías</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    selectedCategory === category
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(searchTerm || selectedCategory !== 'Todas') && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Filtros activos:</span>
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center gap-2">
                Búsqueda: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {selectedCategory !== 'Todas' && (
              <Badge variant="secondary" className="flex items-center gap-2">
                Categoría: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory('Todas')}
                  className="hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-gray-900">{filteredProducts.length}</span>{' '}
            de <span className="font-semibold text-gray-900">{products.length}</span> productos
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-gray-100 mb-4">
              <Search className="size-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 mb-6">
              Intenta cambiar los filtros o el término de búsqueda
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('Todas');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              <X className="size-4" />
              Limpiar Filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
