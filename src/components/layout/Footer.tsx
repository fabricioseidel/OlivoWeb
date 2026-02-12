"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Footer = () => {
  const { settings } = useStoreSettings();
  const [contactInfo, setContactInfo] = useState({
    storeName: "OLIVOMARKET",
    storeEmail: "contacto@olivomarket.cl",
    storePhone: "+56 9 1234 5678",
    storeAddress: "Av. Principal 123, Santiago, Chile",
    socialMedia: {} as any,
  });

  useEffect(() => {
    if (settings) {
      setContactInfo({
        storeName: settings.storeName || contactInfo.storeName,
        storeEmail: settings.storeEmail || contactInfo.storeEmail,
        storePhone: settings.storePhone || contactInfo.storePhone,
        storeAddress: settings.storeAddress || contactInfo.storeAddress,
        socialMedia: settings.socialMedia || {},
      });
    }
  }, [settings]);

  return (
    <footer className="bg-footer-bg text-footer-text">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">{contactInfo.storeName}</h3>
            <p className="text-sm text-footer-text/80">
              Tu tienda online de confianza para productos de calidad a precios accesibles.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-footer-text/80 hover:text-footer-text transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/productos" className="text-sm text-footer-text/80 hover:text-footer-text transition-colors">
                  Productos
                </Link>
              </li>
              <li>
                <Link href="/categorias" className="text-sm text-footer-text/80 hover:text-footer-text transition-colors">
                  Categorías
                </Link>
              </li>
              <li>
                <Link href="/ofertas" className="text-sm text-footer-text/80 hover:text-footer-text transition-colors">
                  Ofertas
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Atención al Cliente</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contacto" className="text-sm text-footer-text/80 hover:text-footer-text transition-colors">
                  Contacto
                </Link>
              </li>
              {settings?.faqUrl && (
                <li>
                  <a href={settings.faqUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-footer-text/80 hover:text-footer-text transition-colors">
                    Preguntas Frecuentes
                  </a>
                </li>
              )}
              {settings?.termsUrl && (
                <li>
                  <a href={settings.termsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-footer-text/80 hover:text-footer-text transition-colors">
                    Términos y Condiciones
                  </a>
                </li>
              )}
              {settings?.returnPolicyUrl && (
                <li>
                  <a href={settings.returnPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-footer-text/80 hover:text-footer-text transition-colors">
                    Política de Devoluciones
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Contáctanos</h3>
            <ul className="space-y-2">
              <li className="text-sm text-footer-text/80">
                Email: {contactInfo.storeEmail}
              </li>
              <li className="text-sm text-footer-text/80">
                Teléfono: {contactInfo.storePhone}
              </li>
              <li className="text-sm text-footer-text/80">
                Dirección: {contactInfo.storeAddress}
              </li>
            </ul>

            {/* Redes Sociales */}
            {Object.keys(contactInfo.socialMedia).length > 0 && (
              <div className="mt-4 pt-4 border-t border-footer-text/20">
                <p className="text-sm font-semibold mb-2">Síguenos</p>
                <div className="flex gap-3">
                  {contactInfo.socialMedia.facebook && (
                    <a href={contactInfo.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">FB</span>
                    </a>
                  )}
                  {contactInfo.socialMedia.instagram && (
                    <a href={contactInfo.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">IG</span>
                    </a>
                  )}
                  {contactInfo.socialMedia.whatsapp && (
                    <a href={`https://wa.me/${contactInfo.socialMedia.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">WA</span>
                    </a>
                  )}
                  {contactInfo.socialMedia.twitter && (
                    <a href={contactInfo.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">X</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-footer-text/20">
          <p className="text-sm text-center text-footer-text/60">
            &copy; {new Date().getFullYear()} {contactInfo.storeName || 'OLIVOMARKET'}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
