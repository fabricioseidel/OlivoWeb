import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

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
    /**
     * Destino de la categoría. Se prefiere sobre `onClick`: la tarjeta se
     * renderiza como enlace real, de modo que funciona con teclado, se puede
     * abrir en otra pestaña y Google la puede rastrear. Antes era un `div` con
     * onClick, que no cumple ninguna de las tres cosas.
     */
    href?: string;
    onClick?: () => void;
};

export default function CategoryCard({ category, href, onClick }: Props) {
    const style = getCategoryStyle(category.name, category.image || undefined);
    const Icon = style.icon;

    const className = `o-focus group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border ${style.bg} ${style.border} p-6 text-center transition-colors hover:border-brand-400`;

    const content = (
        <>
            <span className="mb-4 flex size-16 items-center justify-center rounded-xl bg-white">
                <Icon className={`size-8 ${style.color}`} />
            </span>

            <span className="mb-1 block text-base font-semibold tracking-tight text-neutral-900 transition-colors group-hover:text-brand-700">
                {category.name}
            </span>

            {category.productsCount !== undefined && (
                <span className="block text-sm text-neutral-500">
                    {category.productsCount} {category.productsCount === 1 ? 'producto' : 'productos'}
                </span>
            )}

            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                Ver catálogo
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
        </>
    );

    if (href) {
        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    }

    // Respaldo para los usos que todavía pasan onClick: se mantiene operable
    // con teclado en vez de quedar como un div inerte.
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            className={`${className} cursor-pointer`}
        >
            {content}
        </div>
    );
}
