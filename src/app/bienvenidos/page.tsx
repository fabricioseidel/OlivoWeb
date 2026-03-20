"use client";

import { useEffect } from "react";
import Link from "next/link";
import { 
  QrCodeIcon, 
  GiftIcon, 
  StarIcon, 
  ArrowRightIcon,
  ShoppingBagIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";

export default function BienvenidosPage() {
  // Guardar en sessionStorage que el usuario vino desde el QR de la tienda física
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("registration_source", "tienda_fisica");
    }
  }, []);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Decoración de Fondo Premium */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[120px] -mr-64 -mt-64 opacity-60" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-[100px] -ml-40 -mb-40 opacity-40" />

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Columna Izquierda: Visual e Impacto */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
              <SparklesIcon className="w-4 h-4" />
              Beneficio Exclusivo Tienda Física
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tighter">
              ¡Qué alegría <br/>
              <span className="text-emerald-600 italic">verte por aquí!</span>
            </h1>
            
            <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-md">
              Has activado tu regalo especial por visitarnos. Completa tu registro hoy y recibe un <strong>15% de descuento</strong> directo en tu primera compra online.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-5 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 hover:border-emerald-200 transition-all">
                 <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-600/20">
                    <GiftIcon className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="font-black text-gray-900 uppercase tracking-tighter">Cupón Bienvenida</p>
                    <p className="text-sm text-gray-400 font-medium">15% de descuento en todo nuestro catálogo gourmet.</p>
                 </div>
              </div>

              <div className="flex items-start gap-4 p-5 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 hover:border-emerald-200 transition-all">
                 <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                    <StarIcon className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="font-black text-gray-900 uppercase tracking-tighter">+200 Puntos de Regalo</p>
                    <p className="text-sm text-gray-400 font-medium">Inicia tu programa de lealtad con el pie derecho.</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: El "Card" de Acción */}
          <div className="relative">
            {/* Decorativo Detrás */}
            <div className="absolute inset-0 bg-emerald-600/5 rounded-[3rem] -rotate-3 scale-105 -z-10" />

            <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-emerald-900/10 border border-emerald-50 text-center">
               <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-gray-100">
                  <QrCodeIcon className="w-8 h-8 text-emerald-600" />
               </div>

               <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Crea tu cuenta gratis</h2>
               
               <div className="space-y-4">
                 <Link href="/login?mode=register" className="block">
                    <Button className="w-full h-16 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 group">
                      Registrarme Ahora
                      <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                    </Button>
                 </Link>
                 
                 <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-gray-300">
                       <span className="bg-white px-4 italic">O si ya tienes cuenta</span>
                    </div>
                 </div>

                 <Link href="/login" className="block">
                    <Button variant="outline" className="w-full h-16 rounded-2xl font-black text-gray-700 border-2 hover:bg-gray-50 transition-all">
                      Iniciar Sesión
                    </Button>
                 </Link>
               </div>

               <p className="mt-8 text-xs text-gray-400 font-medium px-4">
                 Al registrarte aceptas unirte a nuestro programa de fidelización y recibir beneficios exclusivos de OlivoMarket Gourmet.
               </p>
            </div>

            {/* Float Element: Trust Badge */}
            <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl shadow-emerald-900/10 border border-emerald-50 flex items-center gap-3 animate-bounce">
               <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                  <ShoppingBagIcon className="w-5 h-5" />
               </div>
               <p className="text-[10px] font-black uppercase text-emerald-800 leading-none">
                 Envío gratis <br/> <span className="text-[8px] opacity-60">Sobre $30.000</span>
               </p>
            </div>
          </div>

        </div>

        {/* Footer Interior */}
        <div className="mt-24 pt-12 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">OlivoMarket · Calidad que trasciende la tienda física</p>
           <div className="flex gap-6">
              <Link href="/productos" className="text-xs font-bold text-gray-400 hover:text-emerald-600 transition-colors">Explorar Catálogo</Link>
              <Link href="/nosotros" className="text-xs font-bold text-gray-400 hover:text-emerald-600 transition-colors">Nuestra Historia</Link>
           </div>
        </div>
      </div>
    </div>
  );
}
