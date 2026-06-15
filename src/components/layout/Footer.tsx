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
      setContactInfo(prev => ({
        storeName: settings.storeName || prev.storeName,
        storeEmail: settings.storeEmail || prev.storeEmail,
        storePhone: settings.storePhone || prev.storePhone,
        storeAddress: settings.storeAddress || prev.storeAddress,
        socialMedia: settings.socialMedia || {},
      }));
    }
  }, [settings]);

  return (
    <footer className="bg-emerald-950 text-white pt-24 pb-12 rounded-t-[3rem] sm:rounded-t-[4rem] relative overflow-hidden mt-20">
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          <div className="space-y-6">
            <h3 className="text-2xl font-black tracking-tighter text-emerald-400">
                {contactInfo.storeName}
            </h3>
            <p className="text-emerald-100/60 font-medium leading-relaxed max-w-xs">
              Tu tienda online de confianza para productos de calidad a precios accesibles. Lo mejor de Venezuela y Chile en tu mesa.
            </p>
            {/* Redes Sociales Premium */}
            {Object.keys(contactInfo.socialMedia).length > 0 && (
              <div className="flex gap-3 pt-4">
                  {contactInfo.socialMedia.facebook && (
                    <a href={contactInfo.socialMedia.facebook} target="_blank" rel="noopener noreferrer" title="Facebook" className="size-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-emerald-500 hover:border-emerald-500 transition-all hover:-translate-y-1">
                      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    </a>
                  )}
                  {contactInfo.socialMedia.instagram && (
                    <a href={contactInfo.socialMedia.instagram} target="_blank" rel="noopener noreferrer" title="Instagram" className="size-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-emerald-500 hover:border-emerald-500 transition-all hover:-translate-y-1">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </a>
                  )}
                  {contactInfo.socialMedia.whatsapp && (
                    <a href={`https://wa.me/${contactInfo.socialMedia.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="size-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-emerald-500 hover:border-emerald-500 transition-all hover:-translate-y-1">
                      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </a>
                  )}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-8 italic">Enlaces Rápidos</h3>
            <ul className="space-y-4">
              <li><Link href="/" className="text-emerald-100/70 hover:text-white transition-colors font-bold text-sm">Inicio</Link></li>
              <li><Link href="/productos" className="text-emerald-100/70 hover:text-white transition-colors font-bold text-sm">Nuestros Productos</Link></li>
              <li><Link href="/categorias" className="text-emerald-100/70 hover:text-white transition-colors font-bold text-sm">Categorías</Link></li>
              <li><Link href="/ofertas" className="text-emerald-100/70 hover:text-white transition-colors font-bold text-sm">Ofertas Imperdibles</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-8 italic">Atención</h3>
            <ul className="space-y-4">
              <li><Link href="/contacto" className="text-emerald-100/70 hover:text-white transition-colors font-bold text-sm">Centro de Contacto</Link></li>
              {settings.faqUrl && <li><a href={settings.faqUrl} className="text-emerald-100/70 hover:text-white transition-colors font-bold text-sm">Preguntas Frecuentes</a></li>}
              {settings.termsUrl && <li><a href={settings.termsUrl} className="text-emerald-100/70 hover:text-white transition-colors font-bold text-sm">Términos Legales</a></li>}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-8 italic">Contáctanos</h3>
            <ul className="space-y-4 text-sm font-bold text-emerald-100/70">
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                {contactInfo.storeEmail}
              </li>
              <li className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                {contactInfo.storePhone}
              </li>
              <li className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-emerald-500 mt-1.5" />
                {contactInfo.storeAddress}
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-24 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-emerald-100/30 text-[10px] font-black uppercase tracking-widest text-center sm:text-left">
            &copy; {new Date().getFullYear()} {contactInfo.storeName}. Premium Market Experience.
          </p>
          <div className="flex gap-6">
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100/20 italic">Venezuela x Chile</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
