import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

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
      className="group relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image Background */}
      <div className="absolute inset-0">
        <ImageWithFallback
          src={category.image || '/placeholder.svg'}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-6 text-left">
        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
          {category.name}
        </h3>
        {category.productsCount !== undefined && (
          <p className="text-sm text-gray-200 mb-3">
            {category.productsCount} producto{category.productsCount !== 1 ? 's' : ''}
          </p>
        )}
        <div className="inline-flex items-center gap-1 text-white font-semibold text-sm group-hover:gap-2 transition-all">
          <span>Explorar</span>
          <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
}
