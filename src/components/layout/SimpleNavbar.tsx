"use client";

import React from "react";
import Link from "next/link";

export default function SimpleNavbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              OLIVOMARKET
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-gray-900 hover:text-blue-600">Inicio</Link>
            <Link href="/productos" className="text-gray-900 hover:text-blue-600">Productos</Link>
            <Link href="/categorias" className="text-gray-900 hover:text-blue-600">Categorías</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
