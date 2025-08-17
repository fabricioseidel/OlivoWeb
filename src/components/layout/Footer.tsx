"use client";

import React from 'react';
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">OLIVOMARKET</h3>
            <p className="text-gray-300 text-sm">
              Tu tienda online de confianza para productos de calidad a precios accesibles.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white text-sm">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/productos" className="text-gray-300 hover:text-white text-sm">
                  Productos
                </Link>
              </li>
              <li>
                <Link href="/categorias" className="text-gray-300 hover:text-white text-sm">
                  Categorías
                </Link>
              </li>
              <li>
                <Link href="/ofertas" className="text-gray-300 hover:text-white text-sm">
                  Ofertas
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Atención al Cliente</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contacto" className="text-gray-300 hover:text-white text-sm">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-white text-sm">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="text-gray-300 hover:text-white text-sm">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/devoluciones" className="text-gray-300 hover:text-white text-sm">
                  Política de Devoluciones
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Contáctanos</h3>
            <ul className="space-y-2">
              <li className="text-gray-300 text-sm">
                Email: contacto@olivomarket.cl
              </li>
              <li className="text-gray-300 text-sm">
                Teléfono: +56 9 1234 5678
              </li>
              <li className="text-gray-300 text-sm">
                Dirección: Av. Principal 123, Santiago, Chile
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700">
          <p className="text-gray-300 text-sm text-center">
            &copy; {new Date().getFullYear()} OLIVOMARKET. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
