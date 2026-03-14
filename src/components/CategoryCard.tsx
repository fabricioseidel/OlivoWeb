import { 
  ChevronRight
} from 'lucide-react';

import { getCategoryStyle } from '@/utils/categoryStyles';

export type CategoryUI = {
    id: string;
    name: string;
    slug: string;
    image?: string | null;
    productsCount?: number;
};

type Props = {
    category: CategoryUI;
    onClick?: () => void;
};

export default function CategoryCard({ category, onClick }: Props) {
    const style = getCategoryStyle(category.name, category.image || undefined);
    const Icon = style.icon;

    return (
        <button
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-center p-8 sm:p-10 ${style.bg} rounded-[3rem] transition-all duration-500 border-2 border-transparent ${style.border} hover:shadow-xl hover:-translate-y-2 w-full active:scale-95`}
        >
            {/* Contenedor de Icono */}
            <div className="size-20 sm:size-24 rounded-[2rem] flex items-center justify-center bg-white shadow-sm mb-6 group-hover:scale-110 group-hover:shadow-md transition-all duration-500 relative overflow-hidden">
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${style.bg}`} />
                <Icon className={`size-10 sm:size-12 ${style.color} transition-all duration-500 group-hover:rotate-6 relative z-10`} />
            </div>

            {/* Nombre de Categoría */}
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 tracking-tight group-hover:text-emerald-600 transition-colors">
                {category.name}
            </h3>

            {/* Contador de productos si está disponible */}
            {category.productsCount !== undefined && (
                <p className="text-sm font-bold text-gray-400 mb-4 opacity-100 group-hover:text-emerald-500/60 transition-colors">
                    {category.productsCount} productos
                </p>
            )}

            {/* Botón de acción / CTA decorativo */}
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm bg-white/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/50 shadow-sm transition-all duration-500 opacity-60 group-hover:opacity-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 group-hover:shadow-emerald-200">
                <span>Ver catálogo</span>
                <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </button>
    );
}
