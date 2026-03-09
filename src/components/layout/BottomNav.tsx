"use client";

import { Home, ShoppingCart, Heart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/contexts/CartContext";

const navItems = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: "/carrito", icon: ShoppingCart, label: "Carrito" },
    { href: "/ofertas", icon: Heart, label: "Favoritos" },
    { href: "/mi-cuenta", icon: User, label: "Perfil" },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { itemCount } = useCart();

    // Don't show on admin routes
    if (pathname.startsWith("/admin")) return null;

    const isActive = (href: string) =>
        href === "/" ? pathname === "/" : pathname.startsWith(href);

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            <div className="grid grid-cols-4 h-16 max-w-7xl mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative ${active
                                    ? "text-emerald-600"
                                    : "text-gray-500 hover:text-emerald-500"
                                }`}
                        >
                            <div className="relative">
                                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                                {/* Cart badge */}
                                {item.href === "/carrito" && itemCount > 0 && (
                                    <span className="absolute -top-2 -right-3 bg-emerald-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center ring-2 ring-white">
                                        {itemCount > 9 ? "9+" : itemCount}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                                {item.label}
                            </span>
                            {/* Active indicator dot */}
                            {active && (
                                <span className="absolute top-1 w-1 h-1 rounded-full bg-emerald-600" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
