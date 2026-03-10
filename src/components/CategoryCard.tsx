import React from 'react';
import { ChevronRight } from 'lucide-react';
import ImageWithFallback from '@/components/ui/ImageWithFallback'; // Updated import

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
    return (
        <button
            onClick={onClick}
            className="group relative w-full aspect-[16/10] rounded-[2rem] overflow-hidden bg-white shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 block text-left"
        >
            {/* Background & Image */}
            <div className="absolute inset-0 z-0">
                <ImageWithFallback
                    src={category.image || '/placeholder.svg'}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95 group-hover:brightness-100"
                />
                {/* Modern Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent group-hover:from-emerald-900/40 transition-all duration-500"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-end p-8">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="inline-block px-3 py-1 bg-emerald-500/20 backdrop-blur-md text-emerald-300 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 border border-emerald-500/30">
                        Colección
                    </span>
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight group-hover:text-emerald-300 transition-colors drop-shadow-md">
                        {category.name}
                    </h3>
                    {category.productsCount !== undefined && (
                        <p className="text-sm text-gray-300 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            {category.productsCount} productos disponibles
                        </p>
                    )}
                    <div className="inline-flex items-center gap-2 text-white font-bold text-sm bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl group-hover:bg-emerald-600 transition-all">
                        <span>Ver Colección</span>
                        <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </button>
    );
}
