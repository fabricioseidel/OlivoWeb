import { useState } from "react";
import CategoryCard, {
  CategoryUI,
} from "@/app/components/CategoryCard";
import { Grid3x3, List } from "lucide-react";
import OlivoButton from "@/app/components/OlivoButton";

// Mock data - en tu proyecto real esto vendría de la API
const MOCK_CATEGORIES: CategoryUI[] = [
  {
    id: "1",
    name: "Aceites y Condimentos",
    slug: "aceites-condimentos",
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800",
    productsCount: 24,
  },
  {
    id: "2",
    name: "Bebidas",
    slug: "bebidas",
    image:
      "https://images.unsplash.com/photo-1675306408031-a9aad9f23308?w=800",
    productsCount: 38,
  },
  {
    id: "3",
    name: "Snacks y Dulces",
    slug: "snacks-dulces",
    image:
      "https://images.unsplash.com/photo-1759465201025-0f4a876efa47?w=800",
    productsCount: 42,
  },
  {
    id: "4",
    name: "Frutas y Verduras",
    slug: "frutas-verduras",
    image:
      "https://images.unsplash.com/photo-1748342319942-223b99937d4e?w=800",
    productsCount: 31,
  },
  {
    id: "5",
    name: "Panadería",
    slug: "panaderia",
    image:
      "https://images.unsplash.com/photo-1575664674176-0f74f5ba3f59?w=800",
    productsCount: 18,
  },
  {
    id: "6",
    name: "Despensa",
    slug: "despensa",
    image:
      "https://images.unsplash.com/photo-1651488201726-bbb9577778ef?w=800",
    productsCount: 56,
  },
  {
    id: "7",
    name: "Lácteos",
    slug: "lacteos",
    image:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800",
    productsCount: 27,
  },
  {
    id: "8",
    name: "Carnes y Embutidos",
    slug: "carnes-embutidos",
    image:
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=800",
    productsCount: 19,
  },
];

export default function CategoriasPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    "grid",
  );
  const [categories] = useState<CategoryUI[]>(MOCK_CATEGORIES);

  const handleCategoryClick = (slug: string) => {
    window.location.href = `/categorias/${slug}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Categorías
              </h1>
              <p className="text-gray-600">
                Explora nuestros productos organizados por
                categoría
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm ring-1 ring-gray-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-emerald-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                aria-label="Vista de cuadrícula"
              >
                <Grid3x3 className="size-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-emerald-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                aria-label="Vista de lista"
              >
                <List className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                Total Categorías
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {categories.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                Total Productos
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {categories.reduce(
                  (sum, cat) => sum + (cat.productsCount || 0),
                  0,
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                Más Popular
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {
                  categories.sort(
                    (a, b) =>
                      (b.productsCount || 0) -
                      (a.productsCount || 0),
                  )[0]?.name
                }
              </p>
            </div>
            <div className="flex items-center">
              <OlivoButton
                variant="outline"
                size="sm"
                fullWidth
              >
                Ver Todos los Productos
              </OlivoButton>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onClick={() =>
                  handleCategoryClick(category.slug)
                }
              />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() =>
                  handleCategoryClick(category.slug)
                }
                className="w-full group bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 hover:shadow-lg hover:ring-emerald-500/20 transition-all duration-300 overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Image */}
                  <div className="relative size-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={category.image || "/placeholder.svg"}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {category.productsCount} producto
                      {category.productsCount !== 1 ? "s" : ""}{" "}
                      disponible
                      {category.productsCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all">
                    <svg
                      className="size-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State (if no categories) */}
        {categories.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-gray-100 mb-4">
              <Grid3x3 className="size-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay categorías disponibles
            </h3>
            <p className="text-gray-500 mb-6">
              Las categorías aparecerán aquí cuando estén
              disponibles
            </p>
            <OlivoButton
              onClick={() => (window.location.href = "/")}
            >
              Volver al Inicio
            </OlivoButton>
          </div>
        )}
      </div>
    </div>
  );
}