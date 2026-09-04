import Link from 'next/link';

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
    const count = category.productsCount;

    // Tarjeta compacta: el color va en la pastilla del icono y no en todo el
    // bloque. Antes cada tarjeta era un rectángulo tintado de 250 px de alto
    // con un enlace "Ver catálogo" redundante, así que en el teléfono entraban
    // dos categorías por pantalla y la grilla quedaba desordenada de color.
    const className =
        'o-focus group flex h-full w-full flex-col items-center justify-start gap-2 rounded-2xl border border-neutral-200 bg-white p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.18)] sm:gap-2.5 sm:p-4';

    const content = (
        <>
            <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${style.bg} transition-transform duration-200 group-hover:scale-105 sm:size-12`}
            >
                <Icon className={`size-5 ${style.color} sm:size-6`} strokeWidth={2} />
            </span>

            <span className="line-clamp-2 text-[13px] font-semibold leading-tight tracking-tight text-neutral-900 transition-colors group-hover:text-brand-700 sm:text-sm">
                {category.name}
            </span>

            {count !== undefined && (
                <span className="text-[11px] leading-none text-neutral-500 sm:text-xs">
                    {count} {count === 1 ? 'producto' : 'productos'}
                </span>
            )}
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
