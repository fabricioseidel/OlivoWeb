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
                    <a href={contactInfo.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="size-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-emerald-500 hover:border-emerald-500 transition-all hover:-translate-y-1">
                      <span className="text-[10px] font-black italic">FB</span>
                    </a>
                  )}
                  {contactInfo.socialMedia.instagram && (
                    <a href={contactInfo.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="size-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-emerald-500 hover:border-emerald-500 transition-all hover:-translate-y-1">
                      <span className="text-[10px] font-black italic">IG</span>
                    </a>
                  )}
                  {contactInfo.socialMedia.whatsapp && (
                    <a href={`https://wa.me/${contactInfo.socialMedia.whatsapp}`} target="_blank" rel="noopener noreferrer" className="size-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-emerald-500 hover:border-emerald-500 transition-all hover:-translate-y-1">
                      <span className="text-[10px] font-black italic">WA</span>
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
